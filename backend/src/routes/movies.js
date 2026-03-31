/**
 * 影视作品信息管理：CRUD、分类标签、详情展示
 * 支持 tasteType 人群口味快捷筛选（学生党、上班族、家庭、情侣、影迷）
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, requireAdmin, optionalAuth } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { buildTasteWhereSql, TASTE_ORDER_BY } = require('../utils/taste-presets');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

/** 影视库「类型」多选：typeKeys=c:1,c:2,t:3 表示须同时满足分类与标签 */
function parseTypeKeys(raw) {
  const categoryIds = [];
  const tagIds = [];
  if (!raw || typeof raw !== 'string') return { categoryIds, tagIds };
  raw.split(',').forEach((part) => {
    const p = part.trim();
    if (!p) return;
    const [kind, idStr] = p.split(':');
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return;
    if (kind === 'c') categoryIds.push(id);
    if (kind === 't') tagIds.push(id);
  });
  return { categoryIds, tagIds };
}

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const TMDB_IMG = 'https://image.tmdb.org/t/p';

/** OMDb Awards 字段中尽量解析「提名数」（无则返回 null） */
function parseNominationCountFromAwardsText(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim();
  const mZh = t.match(/(\d+)\s*项\s*提名/);
  if (mZh) return parseInt(mZh[1], 10);
  const mN = t.match(/(\d+)\s+nominations?/i);
  if (mN) return parseInt(mN[1], 10);
  const winsNom = t.match(/(\d+)\s+wins?\s*&\s*(\d+)\s+nominations?/i);
  if (winsNom) return parseInt(winsNom[2], 10);
  const nomFor = t.match(/[Nn]ominated\s+for\s+(\d+)/);
  if (nomFor) return parseInt(nomFor[1], 10);
  return null;
}

async function fetchOmdbMovieByImdb(imdbId) {
  if (!OMDB_API_KEY || !imdbId) return null;
  const id = String(imdbId).startsWith('tt') ? String(imdbId) : `tt${imdbId}`;
  const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(OMDB_API_KEY)}&i=${encodeURIComponent(id)}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovieRecommend/1.0)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) return null;
  const j = await r.json();
  if (!j || j.Response === 'False') return null;
  return j;
}

/** TMDB collection/{id} → 前端合集条与合集页 */
async function fetchTmdbCollectionParts(tmdbCollectionId) {
  if (!TMDB_API_KEY || !tmdbCollectionId) return null;
  const url = `https://api.themoviedb.org/3/collection/${tmdbCollectionId}?api_key=${TMDB_API_KEY}&language=zh-CN`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovieRecommend/1.0)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) return null;
  const col = await r.json();
  if (!col || col.id == null) return null;
  const parts = (col.parts || [])
    .filter((p) => p && (!p.media_type || p.media_type === 'movie'))
    .sort((a, b) => String(a.release_date || '').localeCompare(String(b.release_date || '')))
    .map((p) => {
      const ours = db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(p.id);
      return {
        tmdb_id: p.id,
        title: p.title || p.original_title || '',
        poster_path: p.poster_path ? `${TMDB_IMG}/w342${p.poster_path}` : null,
        release_date: p.release_date || null,
        local_id: ours?.id ?? null,
      };
    });
  return {
    id: col.id,
    name: col.name || '',
    overview: col.overview || '',
    backdrop_path: col.backdrop_path ? `${TMDB_IMG}/w1280${col.backdrop_path}` : null,
    poster_path: col.poster_path ? `${TMDB_IMG}/w500${col.poster_path}` : null,
    parts,
  };
}

/** TMDB credits.crew → 详情 Hero 主创网格（与 TMDB 页：姓名+下划线、下一行职位） */
function buildFeaturedCrew(crew) {
  if (!Array.isArray(crew)) return [];
  const used = new Set();
  const out = [];
  const take = (pred, roleLabel) => {
    for (const c of crew) {
      if (!c || c.id == null || !c.name || !pred(c) || used.has(c.id)) continue;
      used.add(c.id);
      out.push({ name: c.name, role: roleLabel });
    }
  };
  take((c) => c.job === 'Director', 'Director');
  take((c) => c.job === 'Novel', 'Novel');
  take((c) => c.job === 'Original Story', 'Original Story');
  take((c) => c.job === 'Screenplay', 'Screenplay');
  take((c) => c.job === 'Writer', 'Writer');
  return out.slice(0, 12);
}

/** TMDB /movie/{id} → 库存储格式 |US|GB| */
function formatOriginCountries(detail) {
  if (!detail || typeof detail !== 'object') return null;
  const raw = detail.production_countries;
  if (Array.isArray(raw) && raw.length) {
    const codes = raw
      .map((x) => (x && x.iso_3166_1 ? String(x.iso_3166_1).toUpperCase() : ''))
      .filter(Boolean);
    if (codes.length) return `|${codes.join('|')}|`;
  }
  const oc = detail.origin_country;
  if (Array.isArray(oc) && oc.length) {
    const codes = oc.map((c) => String(c).toUpperCase()).filter(Boolean);
    if (codes.length) return `|${codes.join('|')}|`;
  }
  return null;
}

/**
 * 从 TMDB 拉取电影详情并写入/更新本站 movies 表（与爬虫字段对齐，保证与 TMDB 同步）
 * @returns {Promise<{ id: number, tmdb_id: number, created?: boolean, updated?: boolean } | null>}
 */
async function upsertMovieFromTmdb(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=zh-CN&append_to_response=credits`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovieRecommend/1.0)' },
    signal: AbortSignal.timeout(25000),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`TMDB HTTP ${r.status}`);
  const detail = await r.json();
  if (detail == null || (detail.success === false && detail.status_code)) return null;

  const title = (detail.title || detail.original_title || '').trim() || '未知';
  const cover = detail.poster_path ? `${TMDB_IMG}/w500${detail.poster_path}` : null;
  const description = (detail.overview || '').trim() || null;
  const releaseYear = detail.release_date ? parseInt(String(detail.release_date).slice(0, 4), 10) : null;
  const rating = detail.vote_average != null ? detail.vote_average : null;

  let director = null;
  let actors = null;
  let duration = null;
  if (detail.credits?.crew) {
    const d = detail.credits.crew.find((c) => c.job === 'Director');
    if (d) director = d.name;
  }
  if (detail.credits?.cast?.length) {
    actors = detail.credits.cast.slice(0, 5).map((c) => c.name).join(', ');
  }
  if (detail.runtime) duration = detail.runtime;
  const originCountries = formatOriginCountries(detail);
  const originalLanguage = detail.original_language ? String(detail.original_language).toLowerCase() : null;
  const releaseDate = detail.release_date || null;
  let tmdbVoteCount = null;
  if (detail.vote_count != null && !Number.isNaN(Number(detail.vote_count))) {
    tmdbVoteCount = Math.round(Number(detail.vote_count));
  }

  const genreIds = Array.isArray(detail.genres) ? detail.genres.map((g) => g.id).filter(Boolean) : [];

  const existing = await db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(tmdbId);
  if (existing) {
    await db
      .prepare(
        `UPDATE movies SET title=?, cover=?, description=?, release_year=?, director=?, actors=?, duration=?, tmdb_rating=?,
          origin_countries=COALESCE(?, origin_countries), original_language=COALESCE(?, original_language),
          release_date=COALESCE(?, release_date), tmdb_vote_count=COALESCE(?, tmdb_vote_count),
          updated_at=CURRENT_TIMESTAMP WHERE id=?`
      )
      .run(
        title,
        cover,
        description,
        releaseYear,
        director,
        actors,
        duration,
        rating,
        originCountries,
        originalLanguage,
        releaseDate,
        tmdbVoteCount,
        existing.id
      );
    return { id: existing.id, tmdb_id: tmdbId, updated: true };
  }

  await db
    .prepare(
      `INSERT INTO movies (title, cover, description, release_year, director, actors, duration, tmdb_id, tmdb_rating,
        origin_countries, original_language, release_date, tmdb_vote_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title,
      cover,
      description,
      releaseYear,
      director,
      actors,
      duration,
      tmdbId,
      rating,
      originCountries,
      originalLanguage,
      releaseDate,
      tmdbVoteCount
    );
  const row = await db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(tmdbId);
  const mid = row?.id;
  if (mid) {
    try {
      const genreMap = { 28: 1, 35: 2, 10749: 3, 878: 4, 9648: 5, 16: 6 };
      for (const gid of genreIds.slice(0, 2)) {
        const cid = genreMap[gid];
        if (cid) await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, ?)').run(mid, cid);
      }
      await db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(mid, 3);
    } catch (e) {
      if (!/foreign key|FOREIGN_KEY|SQLITE_CONSTRAINT/i.test(e.message)) throw e;
    }
  }
  return { id: mid, tmdb_id: tmdbId, created: true };
}

/**
 * 首页 TMDB 卡片进入本站详情：按 TMDB 电影 ID 拉取并 upsert，再跳转 `/movies/:id`
 * 无需管理员权限；每次调用会刷新已存在记录的 TMDB 字段
 */
router.post('/from-tmdb/:tmdbId', optionalAuth, asyncHandler(async (req, res) => {
  const tmdbId = parseInt(req.params.tmdbId, 10);
  if (!Number.isFinite(tmdbId) || tmdbId < 1) {
    return res.status(400).json({ code: 400, message: '无效的 TMDB 电影 ID' });
  }
  if (!TMDB_API_KEY) {
    return res.status(503).json({ code: 503, message: '未配置 TMDB_API_KEY' });
  }
  try {
    const result = await upsertMovieFromTmdb(tmdbId);
    if (!result?.id) {
      return res.status(404).json({ code: 404, message: 'TMDB 上不存在该电影' });
    }
    res.json({ code: 0, data: result });
  } catch (e) {
    console.error('[movies/from-tmdb]', tmdbId, e.message);
    res.status(502).json({ code: 502, message: e.message || '从 TMDB 同步失败' });
  }
}));

// 从 TMDB 获取演员表（需电影有 tmdb_id，且配置 TMDB_API_KEY）
router.get('/:id/credits', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const row = await db.prepare('SELECT tmdb_id FROM movies WHERE id = ?').get(id);
  const emptyMedia = {
    videoCount: 0,
    backdropCount: 0,
    posterCount: 0,
    popular: [],
    videos: [],
    backdrops: [],
    posters: [],
  };
  const emptyData = {
    cast: [], featured_crew: [], recommendations: [], backdrop_path: null, tagline: null,
    tmdb_details: {
      original_title: null, status: null, original_language: null, budget: null, revenue: null, keywords: [], tmdb_id: null,
      homepage: null, facebook_id: null, instagram_id: null, twitter_id: null, imdb_id: null,
    },
    media: emptyMedia,
    collection: null,
    awards_meta: { tmdb_awards_url: null, nomination_count: null, omdb_awards_text: null },
  };
  if (!row?.tmdb_id || !TMDB_API_KEY) {
    return res.json({ code: 0, data: emptyData });
  }
  const langMap = { en: '英语', ja: '日语', ko: '韩语', zh: '中文', 'zh-CN': '中文', fr: '法语', es: '西班牙语', de: '德语', it: '意大利语', pt: '葡萄牙语', ru: '俄语', hi: '印地语', th: '泰语', vi: '越南语', ar: '阿拉伯语', tr: '土耳其语', pl: '波兰语', nl: '荷兰语', sv: '瑞典语', da: '丹麦语', no: '挪威语', fi: '芬兰语' };
  try {
    const [creditsRes, recRes, detailsRes, keywordsRes, releaseRes, videosRes, externalRes, imagesRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/credits?api_key=${TMDB_API_KEY}&language=zh-CN`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/recommendations?api_key=${TMDB_API_KEY}&language=zh-CN&page=1`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}?api_key=${TMDB_API_KEY}&language=zh-CN`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/keywords?api_key=${TMDB_API_KEY}`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/release_dates?api_key=${TMDB_API_KEY}`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/videos?api_key=${TMDB_API_KEY}&language=zh-CN`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/external_ids?api_key=${TMDB_API_KEY}`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/images?api_key=${TMDB_API_KEY}`),
    ]);
    const credits = creditsRes.ok ? await creditsRes.json() : {};
    const rec = recRes.ok ? await recRes.json() : {};
    const details = detailsRes.ok ? await detailsRes.json() : {};
    const keywordsJson = keywordsRes.ok ? await keywordsRes.json() : {};
    const cast = (credits.cast || []).slice(0, 20).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      /** 详情页演员卡用较大尺寸，避免糊脸 */
      profile_path: c.profile_path ? `${TMDB_IMG}/w342${c.profile_path}` : null,
      order: c.order,
    }));
    const featured_crew = buildFeaturedCrew(credits.crew || []);
    const recList = (rec.results || []).slice(0, 12);
    const recommendations = [];
    for (const m of recList) {
      const ours = await db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(m.id);
      recommendations.push({
        id: ours?.id ?? null,
        tmdb_id: m.id,
        title: m.title || m.original_title,
        poster_path: m.poster_path ? `${TMDB_IMG}/w300${m.poster_path}` : null,
        release_date: m.release_date,
        vote_average: m.vote_average,
      });
    }
    /** 详情 Hero 用 original，避免 w1280 拉宽后出现糊边、重影感（TMDB 支持 original） */
    const backdrop_path = details.backdrop_path ? `${TMDB_IMG}/original${details.backdrop_path}` : null;
    const tagline = details.tagline || null;
    const statusMap = { Released: '已上映', Rumored: '传闻中', Planned: '计划中', 'In Production': '制作中', 'Post Production': '后期制作' };

    let certification = null;
    try {
      const releaseJson = releaseRes.ok ? await releaseRes.json() : {};
      for (const r of releaseJson.results || []) {
        for (const rd of r.release_dates || []) {
          if (rd.certification) { certification = rd.certification; break; }
        }
        if (certification) break;
      }
    } catch (_) {}

    let trailerUrl = null;
    let videosJson = {};
    try {
      videosJson = videosRes.ok ? await videosRes.json() : {};
      const trailer = (videosJson.results || []).find((v) => v.type === 'Trailer' && v.site === 'YouTube');
      if (trailer?.key) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
    } catch (_) {}

    let imagesJson = {};
    try {
      imagesJson = imagesRes.ok ? await imagesRes.json() : {};
    } catch (_) {}

    const backdropRows = imagesJson.backdrops || [];
    const posterRows = imagesJson.posters || [];
    const backdrops = backdropRows
      .slice(0, 40)
      .map((b) => (b.file_path ? `${TMDB_IMG}/w780${b.file_path}` : null))
      .filter(Boolean);
    const posters = posterRows
      .slice(0, 60)
      .map((p) => (p.file_path ? `${TMDB_IMG}/w500${p.file_path}` : null))
      .filter(Boolean);

    const videoList = (videosJson.results || [])
      .filter((v) => v.site === 'YouTube' && v.key)
      .slice(0, 30)
      .map((v) => ({
        key: v.key,
        name: v.name || v.type || 'Video',
        type: v.type || 'Clip',
        thumb: `https://img.youtube.com/vi/${v.key}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${v.key}`,
      }));

    /** 「最热门」横条：先横版再竖版交错，贴近 TMDB 媒体区 */
    const popular = [];
    const maxPop = 24;
    let bi = 0;
    let pi = 0;
    while (popular.length < maxPop && (bi < backdrops.length || pi < posters.length)) {
      if (bi < backdrops.length) popular.push({ url: backdrops[bi++], kind: 'backdrop' });
      if (popular.length >= maxPop) break;
      if (pi < posters.length) popular.push({ url: posters[pi++], kind: 'poster' });
    }

    const media = {
      videoCount: videoList.length,
      backdropCount: backdropRows.length,
      posterCount: posterRows.length,
      popular,
      videos: videoList,
      backdrops,
      posters,
    };

    let externalIds = {};
    try {
      externalIds = externalRes.ok ? await externalRes.json() : {};
    } catch (_) {}

    const origLang = details.original_language || null;
    const imdbId = externalIds.imdb_id || null;

    let collection = null;
    try {
      const bc = details.belongs_to_collection;
      if (bc && bc.id) {
        collection = await fetchTmdbCollectionParts(bc.id);
      }
    } catch (_) {}

    let omdbAwardsText = null;
    let nominationCount = null;
    if (imdbId && OMDB_API_KEY) {
      try {
        const omdb = await fetchOmdbMovieByImdb(imdbId);
        const aw = omdb?.Awards;
        if (aw && String(aw).trim() && String(aw).trim() !== 'N/A') {
          omdbAwardsText = String(aw).trim();
          nominationCount = parseNominationCountFromAwardsText(omdbAwardsText);
        }
      } catch (_) {}
    }

    const awards_meta = {
      tmdb_awards_url: `https://www.themoviedb.org/movie/${row.tmdb_id}/awards`,
      nomination_count: nominationCount,
      omdb_awards_text: omdbAwardsText,
    };

    const tmdb_details = {
      tmdb_id: row.tmdb_id,
      original_title: details.original_title || null,
      status: statusMap[details.status] || details.status || null,
      original_language: origLang ? (langMap[origLang] || origLang) : null,
      budget: details.budget > 0 ? details.budget : null,
      revenue: details.revenue > 0 ? details.revenue : null,
      keywords: (keywordsJson.keywords || []).slice(0, 12).map((k) => k.name),
      certification,
      release_date: details.release_date || null,
      trailer_url: trailerUrl,
      homepage: details.homepage || null,
      facebook_id: externalIds.facebook_id || null,
      instagram_id: externalIds.instagram_id || null,
      twitter_id: externalIds.twitter_id || null,
      imdb_id: imdbId,
    };
    res.json({
      code: 0,
      data: {
        cast,
        featured_crew,
        recommendations,
        backdrop_path,
        tagline,
        tmdb_details,
        media,
        collection,
        awards_meta,
      },
    });
  } catch (e) {
    res.json({ code: 0, data: emptyData });
  }
}));

// TMDB 合集（含各片在本站的 local_id，供合集页）
router.get('/collection/tmdb/:tmdbCollectionId', asyncHandler(async (req, res) => {
  const cid = parseInt(req.params.tmdbCollectionId, 10);
  if (!Number.isFinite(cid) || cid < 1) {
    return res.status(400).json({ code: 400, message: '无效的合集 ID' });
  }
  if (!TMDB_API_KEY) {
    return res.status(503).json({ code: 503, message: '未配置 TMDB_API_KEY' });
  }
  const col = await fetchTmdbCollectionParts(cid);
  if (!col) {
    return res.status(404).json({ code: 404, message: '合集不存在或无法拉取' });
  }
  res.json({ code: 0, data: col });
}));

// 奖项详情页：OMDb Awards 全文 + 分行 + TMDB 奖项页外链（需 IMDB + 可选 OMDB_API_KEY）
router.get('/:id/awards-data', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的作品 ID' });
  }
  const movie = await db.prepare('SELECT id, title, cover, release_year, tmdb_id FROM movies WHERE id = ?').get(id);
  if (!movie) {
    return res.status(404).json({ code: 404, message: '作品不存在' });
  }
  const tmdbAwardsUrl = movie.tmdb_id ? `https://www.themoviedb.org/movie/${movie.tmdb_id}/awards` : null;
  if (!movie.tmdb_id || !TMDB_API_KEY) {
    return res.json({
      code: 0,
      data: {
        movie: { title: movie.title, cover: movie.cover, release_year: movie.release_year },
        tmdb_id: movie.tmdb_id,
        imdb_id: null,
        awards_text: null,
        nomination_count: null,
        award_lines: [],
        tmdb_awards_url: tmdbAwardsUrl,
      },
    });
  }
  let imdbId = null;
  try {
    const extRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdb_id}/external_ids?api_key=${TMDB_API_KEY}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovieRecommend/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    const ext = extRes.ok ? await extRes.json() : {};
    imdbId = ext.imdb_id || null;
  } catch (_) {}

  let awardsText = null;
  let nominationCount = null;
  if (imdbId && OMDB_API_KEY) {
    try {
      const omdb = await fetchOmdbMovieByImdb(imdbId);
      const aw = omdb?.Awards;
      if (aw && String(aw).trim() && String(aw).trim() !== 'N/A') {
        awardsText = String(aw).trim();
        nominationCount = parseNominationCountFromAwardsText(awardsText);
      }
    } catch (_) {}
  }
  const awardLines = awardsText
    ? awardsText
        .split(/\.\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s.endsWith('.') ? s : `${s}.`))
    : [];
  res.json({
    code: 0,
    data: {
      movie: { title: movie.title, cover: movie.cover, release_year: movie.release_year },
      tmdb_id: movie.tmdb_id,
      imdb_id: imdbId,
      awards_text: awardsText,
      nomination_count: nominationCount,
      award_lines: awardLines,
      tmdb_awards_url: tmdbAwardsUrl,
    },
  });
}));

// 封面代理：解决外部图床防盗链/CORS/网络加载失败
// 先直连，失败则通过 wsrv.nl 全球 CDN 代理拉取
router.get('/:id/cover', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const row = await db.prepare('SELECT cover FROM movies WHERE id = ?').get(id);
  if (!row?.cover) {
    return res.status(404).send('No cover');
  }
  const src = row.cover;
  /** 轮播大图：?w= 通过 wsrv 拉更大尺寸，减少糊感（上限 1920） */
  const wParam = req.query.w ? Math.min(Math.max(parseInt(req.query.w, 10) || 0, 0), 1920) : 0;

  async function tryFetch(url) {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(r.status);
    return { buf: Buffer.from(await r.arrayBuffer()), ct: r.headers.get('content-type') || 'image/jpeg' };
  }

  const urls = [];
  if (wParam >= 400) {
    urls.push(`https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${wParam}&q=90&fit=cover&output=webp`);
  }
  urls.push(src, `https://wsrv.nl/?url=${encodeURIComponent(src)}`);

  for (const url of urls) {
    try {
      const { buf, ct } = await tryFetch(url);
      res.set('Content-Type', ct);
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(buf);
    } catch (_) {
      continue;
    }
  }
  res.status(502).send('Failed to fetch cover');
}));

// 获取影视列表（分页、类型、发行日期、制片国家、评分、人群口味等）
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(500, Math.max(10, parseInt(req.query.limit) || 15));
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId, 10) : null;
  const tagId = req.query.tagId ? parseInt(req.query.tagId, 10) : null;
  const keyword = req.query.keyword ? req.query.keyword.trim() : null;
  const tasteType = (req.query.tasteType || '').trim();
  const yearFrom = req.query.yearFrom ? parseInt(req.query.yearFrom, 10) : null;
  const yearTo = req.query.yearTo ? parseInt(req.query.yearTo, 10) : null;
  const dateFrom = (req.query.dateFrom || '').trim();
  const dateTo = (req.query.dateTo || '').trim();
  /** 制片国家/地区 ISO 3166-1 alpha-2，与库字段 origin_countries（如 |US|）匹配 */
  const country = (req.query.country || '').trim().toUpperCase();

  const scoreMin = req.query.scoreMin !== undefined && req.query.scoreMin !== '' ? parseFloat(req.query.scoreMin) : null;
  const scoreMax = req.query.scoreMax !== undefined && req.query.scoreMax !== '' ? parseFloat(req.query.scoreMax) : null;

  /** 片长（分钟）区间，与前端时长滑块 0–360 一致；全范围时不传或 0/360 表示不限制 */
  const durationMin = req.query.durationMin !== undefined && req.query.durationMin !== '' ? parseInt(req.query.durationMin, 10) : null;
  const durationMax = req.query.durationMax !== undefined && req.query.durationMax !== '' ? parseInt(req.query.durationMax, 10) : null;

  /**
   * 上映/浏览模式：
   * - released / unreleased：旧版二态
   * - popular：热门（按 TMDB 投票数、评分排序）
   * - now_playing：正在上映（近 120 天内已首映，且首映日不晚于今天）
   * - upcoming：即将上映（同 unreleased：未来年或未来 release_date）
   * - top_rated：高分（TMDB 分 ≥ 6.5，按分排序）
   */
  let releaseStatus = (req.query.releaseStatus || '').trim().toLowerCase();
  if (!releaseStatus) {
    const w = (req.query.watched || '').trim();
    if (w === 'watched') releaseStatus = 'released';
    if (w === 'unwatched') releaseStatus = 'unreleased';
  }
  const currentYear = new Date().getFullYear();
  const offset = (page - 1) * limit;

  const { categoryIds: typeCategoryIds, tagIds: typeTagIds } = parseTypeKeys(req.query.typeKeys || '');

  let sql = `
    SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.director, m.duration, m.tmdb_rating, m.tmdb_vote_count, m.created_at
    FROM movies m
  `;
  const params = [];
  const conditions = [];

  // 人群口味：分类 ∩ 标签（见 taste-presets）
  if (tasteType) {
    const tw = await buildTasteWhereSql(db, tasteType);
    if (tw) {
      conditions.push(tw.sql);
      params.push(...tw.params);
    }
  }

  // 类型多选（AND）：每个分类 / 标签都必须命中
  for (const cid of typeCategoryIds) {
    conditions.push('m.id IN (SELECT movie_id FROM movie_categories WHERE category_id = ?)');
    params.push(cid);
  }
  for (const tid of typeTagIds) {
    conditions.push('m.id IN (SELECT movie_id FROM movie_tags WHERE tag_id = ?)');
    params.push(tid);
  }

  if (categoryId && typeCategoryIds.length === 0) {
    sql += ' INNER JOIN movie_categories mc ON m.id = mc.movie_id AND mc.category_id = ?';
    params.push(categoryId);
  }
  if (tagId && typeTagIds.length === 0) {
    sql += ' INNER JOIN movie_tags mt ON m.id = mt.movie_id AND mt.tag_id = ?';
    params.push(tagId);
  }
  if (keyword) {
    conditions.push('(m.title LIKE ? OR m.description LIKE ? OR m.director LIKE ? OR IFNULL(m.actors, \'\') LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }
  if (yearFrom != null && !Number.isNaN(yearFrom)) {
    conditions.push('m.release_year >= ?');
    params.push(yearFrom);
  }
  if (yearTo != null && !Number.isNaN(yearTo)) {
    conditions.push('m.release_year <= ?');
    params.push(yearTo);
  }

  // 发行日期区间（有 release_date 用精确日；否则用发行年推算 1/1～12/31）
  if (dateFrom && dateTo) {
    conditions.push(`(COALESCE(NULLIF(TRIM(m.release_date), ''), printf('%04d-01-01', m.release_year), '1900-01-01') <= ?)`);
    params.push(dateTo);
    conditions.push(`(COALESCE(NULLIF(TRIM(m.release_date), ''), printf('%04d-12-31', m.release_year), '9999-12-31') >= ?)`);
    params.push(dateFrom);
  } else if (dateFrom) {
    conditions.push(`(COALESCE(NULLIF(TRIM(m.release_date), ''), printf('%04d-12-31', m.release_year), '9999-12-31') >= ?)`);
    params.push(dateFrom);
  } else if (dateTo) {
    conditions.push(`(COALESCE(NULLIF(TRIM(m.release_date), ''), printf('%04d-01-01', m.release_year), '1900-01-01') <= ?)`);
    params.push(dateTo);
  }

  if (releaseStatus === 'released') {
    conditions.push('(m.release_year IS NULL OR m.release_year <= ?)');
    params.push(currentYear);
  } else if (releaseStatus === 'unreleased' || releaseStatus === 'upcoming') {
    /** 未上映 / 即将上映 */
    conditions.push(`(
      (m.release_year IS NOT NULL AND m.release_year > ?)
      OR (NULLIF(TRIM(m.release_date), '') IS NOT NULL AND date(m.release_date) > date('now'))
    )`);
    params.push(currentYear);
  } else if (releaseStatus === 'now_playing') {
    /** 已首映且落在近 120 天窗口内（近似「在映」） */
    conditions.push(`(
      NULLIF(TRIM(m.release_date), '') IS NOT NULL
      AND date(m.release_date) <= date('now')
      AND date(m.release_date) >= date('now', '-120 days')
    )`);
  } else if (releaseStatus === 'top_rated') {
    conditions.push('m.tmdb_rating IS NOT NULL AND m.tmdb_rating >= 6.5');
  }
  /** popular：不附加上映条件，仅排序 */

  if (country && /^[A-Z]{2}$/.test(country)) {
    conditions.push('(m.origin_countries IS NOT NULL AND INSTR(m.origin_countries, ?) > 0)');
    params.push(`|${country}|`);
  }

  if (scoreMin != null && !Number.isNaN(scoreMin)) {
    conditions.push('m.tmdb_rating IS NOT NULL AND m.tmdb_rating >= ?');
    params.push(scoreMin);
  }
  if (scoreMax != null && !Number.isNaN(scoreMax)) {
    conditions.push('m.tmdb_rating IS NOT NULL AND m.tmdb_rating <= ?');
    params.push(scoreMax);
  }

  if (durationMin != null && !Number.isNaN(durationMin) && durationMin > 0) {
    conditions.push('m.duration IS NOT NULL AND m.duration >= ?');
    params.push(durationMin);
  }
  if (durationMax != null && !Number.isNaN(durationMax) && durationMax < 360) {
    conditions.push('m.duration IS NOT NULL AND m.duration <= ?');
    params.push(durationMax);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  const orderByParam = (req.query.orderBy || '').trim().toLowerCase();
  /**
   * 排序优先级（与 TMDB 一致）：
   * - 影视库侧栏「电影」四态（popular / top_rated / upcoming / now_playing）**必须优先**，
   *   不能再被 tasteType 的 TASTE_ORDER_BY 覆盖，否则切换热门/高分等时列表几乎不变。
   * - 无上述四态且有人群口味时，再用 TASTE_ORDER_BY。
   */
  const isBrowseMode =
    releaseStatus === 'popular' ||
    releaseStatus === 'top_rated' ||
    releaseStatus === 'upcoming' ||
    releaseStatus === 'unreleased' ||
    releaseStatus === 'now_playing';

  let orderBySql;
  if (isBrowseMode) {
    if (releaseStatus === 'popular') {
      orderBySql = 'COALESCE(m.tmdb_vote_count, 0) DESC, COALESCE(m.tmdb_rating, 0) DESC, m.id DESC';
    } else if (releaseStatus === 'top_rated') {
      orderBySql = 'COALESCE(m.tmdb_rating, 0) DESC, COALESCE(m.tmdb_vote_count, 0) DESC, m.id DESC';
    } else if (releaseStatus === 'upcoming' || releaseStatus === 'unreleased') {
      orderBySql =
        "COALESCE(NULLIF(TRIM(m.release_date), ''), printf('%04d-06-15', IFNULL(m.release_year, 2099))) ASC";
    } else if (releaseStatus === 'now_playing') {
      orderBySql =
        "COALESCE(NULLIF(TRIM(m.release_date), ''), printf('%04d-01-01', IFNULL(m.release_year, 0))) DESC";
    } else {
      orderBySql = 'm.id DESC';
    }
  } else if (tasteType) {
    orderBySql = TASTE_ORDER_BY;
  } else if (orderByParam === 'release_asc') {
    orderBySql =
      "COALESCE(NULLIF(TRIM(m.release_date), ''), printf('%04d-06-15', IFNULL(m.release_year, 2099))) ASC";
  } else {
    orderBySql = 'm.id DESC';
  }
  sql += ` GROUP BY m.id ORDER BY ${orderBySql}`;
  const countSql = 'SELECT COUNT(*) as n FROM (' + sql + ') t';
  const total = (await db.prepare(countSql).get(...params))?.n ?? 0;

  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const list = await db.prepare(sql).all(...params);

  // 平台用户评分均值（1-5 分制）
  const avgRows = await db.prepare('SELECT movie_id, AVG(score) as avg_score FROM ratings GROUP BY movie_id').all();
  const avgMap = Object.fromEntries(avgRows.map((r) => [r.movie_id, Math.round(r.avg_score * 10) / 10]));

  // 附加分类和标签
  for (const m of list) {
    m.avg_score = avgMap[m.id] ?? null;
    m.categories = await db.prepare(`
      SELECT c.id, c.name FROM categories c
      INNER JOIN movie_categories mc ON c.id = mc.category_id WHERE mc.movie_id = ?
    `).all(m.id);
    m.tags = await db.prepare(`
      SELECT t.id, t.name FROM tags t
      INNER JOIN movie_tags mt ON t.id = mt.tag_id WHERE mt.movie_id = ?
    `).all(m.id);
    if (req.user) {
      const r = await db.prepare('SELECT score FROM ratings WHERE user_id = ? AND movie_id = ?').get(req.user.id, m.id);
      m.myScore = r ? r.score : null;
      m.isFavorite = !!(await db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND movie_id = ?').get(req.user.id, m.id));
    }
  }

  res.json({ code: 0, data: { list, total, page, limit } });
}));

// 获取单个影视详情
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const movie = await db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
  if (!movie) return res.status(404).json({ code: 404, message: '作品不存在' });

  movie.categories = await db.prepare(`
    SELECT c.id, c.name FROM categories c
    INNER JOIN movie_categories mc ON c.id = mc.category_id WHERE mc.movie_id = ?
  `).all(id);
  movie.tags = await db.prepare(`
    SELECT t.id, t.name FROM tags t
    INNER JOIN movie_tags mt ON t.id = mt.tag_id WHERE mt.movie_id = ?
  `).all(id);
  if (req.user) {
    const r = await db.prepare('SELECT score FROM ratings WHERE user_id = ? AND movie_id = ?').get(req.user.id, id);
    movie.myScore = r ? r.score : null;
    movie.isFavorite = !!(await db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND movie_id = ?').get(req.user.id, id));
  }
  res.json({ code: 0, data: movie });
}));

// 管理员：新增影视
router.post('/', authMiddleware, requireAdmin, [
  body('title').trim().notEmpty(),
  body('description').optional().trim(),
  body('cover').optional().trim(),
  body('release_year').optional().isInt(),
  body('director').optional().trim(),
  body('actors').optional().trim(),
  body('duration').optional().isInt(),
  body('categoryIds').optional().isArray(),
  body('tagIds').optional().isArray(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ code: 400, message: errors.array()[0].msg });
  const { title, cover, description, release_year, director, actors, duration, categoryIds = [], tagIds = [] } = req.body;
  await db.prepare(`
    INSERT INTO movies (title, cover, description, release_year, director, actors, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, cover || null, description || null, release_year || null, director || null, actors || null, duration || null);
  const id = (await db.prepare('SELECT last_insert_rowid() as id').get()).id;
  for (const cid of categoryIds) {
    await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, ?)').run(id, cid);
  }
  for (const tid of tagIds) {
    await db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(id, tid);
  }
  await logActivity(req, 'CREATE_MOVIE', 'movie', id, title);
  res.json({ code: 0, data: { id } });
}));

// 管理员：修改影视
router.put('/:id', authMiddleware, requireAdmin, [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('cover').optional().trim(),
  body('release_year').optional().isInt(),
  body('director').optional().trim(),
  body('actors').optional().trim(),
  body('duration').optional().isInt(),
  body('categoryIds').optional().isArray(),
  body('tagIds').optional().isArray(),
], asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!(await db.prepare('SELECT 1 FROM movies WHERE id = ?').get(id))) {
    return res.status(404).json({ code: 404, message: '作品不存在' });
  }
  const { title, cover, description, release_year, director, actors, duration, categoryIds, tagIds } = req.body;
  const updates = [];
  const values = [];
  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (cover !== undefined) { updates.push('cover = ?'); values.push(cover); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (release_year !== undefined) { updates.push('release_year = ?'); values.push(release_year); }
  if (director !== undefined) { updates.push('director = ?'); values.push(director); }
  if (actors !== undefined) { updates.push('actors = ?'); values.push(actors); }
  if (duration !== undefined) { updates.push('duration = ?'); values.push(duration); }
  if (updates.length) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    await db.prepare(`UPDATE movies SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  if (Array.isArray(categoryIds)) {
    await db.prepare('DELETE FROM movie_categories WHERE movie_id = ?').run(id);
    for (const cid of categoryIds) {
      await db.prepare('INSERT INTO movie_categories (movie_id, category_id) VALUES (?, ?)').run(id, cid);
    }
  }
  if (Array.isArray(tagIds)) {
    await db.prepare('DELETE FROM movie_tags WHERE movie_id = ?').run(id);
    for (const tid of tagIds) {
      await db.prepare('INSERT INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(id, tid);
    }
  }
  await logActivity(req, 'UPDATE_MOVIE', 'movie', id, '修改影视信息');
  res.json({ code: 0, message: '已更新' });
}));

// 管理员：删除影视
router.delete('/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await db.prepare('DELETE FROM movie_categories WHERE movie_id = ?').run(id);
  await db.prepare('DELETE FROM movie_tags WHERE movie_id = ?').run(id);
  await db.prepare('DELETE FROM movies WHERE id = ?').run(id);
  await logActivity(req, 'DELETE_MOVIE', 'movie', id, '删除影视');
  res.json({ code: 0, message: '已删除' });
}));

module.exports = router;

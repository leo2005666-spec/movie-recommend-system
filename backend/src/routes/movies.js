/**
 * 影视作品信息管理：CRUD、分类标签、详情展示
 * 支持 tasteType 人群口味快捷筛选（学生党、上班族、家庭、情侣、影迷）
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, requireAdmin, optionalAuth } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { getTasteFilterIds } = require('../utils/taste-presets');
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
const TMDB_IMG = 'https://image.tmdb.org/t/p';

// 从 TMDB 获取演员表（需电影有 tmdb_id，且配置 TMDB_API_KEY）
router.get('/:id/credits', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const row = await db.prepare('SELECT tmdb_id FROM movies WHERE id = ?').get(id);
  const emptyData = {
    cast: [], recommendations: [], backdrop_path: null, tagline: null,
    tmdb_details: { original_title: null, status: null, original_language: null, budget: null, revenue: null, keywords: [], tmdb_id: null, homepage: null, facebook_id: null, instagram_id: null, twitter_id: null },
  };
  if (!row?.tmdb_id || !TMDB_API_KEY) {
    return res.json({ code: 0, data: emptyData });
  }
  const langMap = { en: '英语', ja: '日语', ko: '韩语', zh: '中文', 'zh-CN': '中文', fr: '法语', es: '西班牙语', de: '德语', it: '意大利语', pt: '葡萄牙语', ru: '俄语', hi: '印地语', th: '泰语', vi: '越南语', ar: '阿拉伯语', tr: '土耳其语', pl: '波兰语', nl: '荷兰语', sv: '瑞典语', da: '丹麦语', no: '挪威语', fi: '芬兰语' };
  try {
    const [creditsRes, recRes, detailsRes, keywordsRes, releaseRes, videosRes, externalRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/credits?api_key=${TMDB_API_KEY}&language=zh-CN`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/recommendations?api_key=${TMDB_API_KEY}&language=zh-CN&page=1`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}?api_key=${TMDB_API_KEY}&language=zh-CN`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/keywords?api_key=${TMDB_API_KEY}`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/release_dates?api_key=${TMDB_API_KEY}`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/videos?api_key=${TMDB_API_KEY}&language=zh-CN`),
      fetch(`https://api.themoviedb.org/3/movie/${row.tmdb_id}/external_ids?api_key=${TMDB_API_KEY}`),
    ]);
    const credits = creditsRes.ok ? await creditsRes.json() : {};
    const rec = recRes.ok ? await recRes.json() : {};
    const details = detailsRes.ok ? await detailsRes.json() : {};
    const keywordsJson = keywordsRes.ok ? await keywordsRes.json() : {};
    const cast = (credits.cast || []).slice(0, 20).map((c) => ({
      name: c.name,
      character: c.character,
      /** 详情页演员卡用较大尺寸，避免糊脸 */
      profile_path: c.profile_path ? `${TMDB_IMG}/w342${c.profile_path}` : null,
      order: c.order,
    }));
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
    try {
      const videosJson = videosRes.ok ? await videosRes.json() : {};
      const trailer = (videosJson.results || []).find((v) => v.type === 'Trailer' && v.site === 'YouTube');
      if (trailer?.key) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
    } catch (_) {}

    let externalIds = {};
    try {
      externalIds = externalRes.ok ? await externalRes.json() : {};
    } catch (_) {}

    const origLang = details.original_language || null;
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
    };
    res.json({ code: 0, data: { cast, recommendations, backdrop_path, tagline, tmdb_details } });
  } catch (e) {
    res.json({ code: 0, data: emptyData });
  }
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

// 获取影视列表（分页、类型多选、发行日期、语言、评分/投票滑块、观看平台等）
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(500, Math.max(10, parseInt(req.query.limit) || 12));
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId, 10) : null;
  const tagId = req.query.tagId ? parseInt(req.query.tagId, 10) : null;
  const keyword = req.query.keyword ? req.query.keyword.trim() : null;
  const tasteType = (req.query.tasteType || '').trim();
  const yearFrom = req.query.yearFrom ? parseInt(req.query.yearFrom, 10) : null;
  const yearTo = req.query.yearTo ? parseInt(req.query.yearTo, 10) : null;
  const dateFrom = (req.query.dateFrom || '').trim();
  const dateTo = (req.query.dateTo || '').trim();
  const language = (req.query.language || '').trim().toLowerCase();
  const searchAllChannels = req.query.searchAllChannels === '1' || req.query.searchAllChannels === 'true';
  const providerIdsRaw = (req.query.providerIds || '').trim();
  const providerIds = providerIdsRaw
    ? providerIdsRaw.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !Number.isNaN(n))
    : [];

  const scoreMin = req.query.scoreMin !== undefined && req.query.scoreMin !== '' ? parseFloat(req.query.scoreMin) : null;
  const scoreMax = req.query.scoreMax !== undefined && req.query.scoreMax !== '' ? parseFloat(req.query.scoreMax) : null;
  const minVotes = req.query.minVotes !== undefined && req.query.minVotes !== '' ? parseInt(req.query.minVotes, 10) : null;

  /** 上映状态：released=已上映，unreleased=未上映（按发行年份与当前年比较；兼容旧参数 watched/unwatched） */
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
    SELECT m.id, m.title, m.cover, m.description, m.release_year, m.director, m.duration, m.tmdb_rating, m.created_at
    FROM movies m
  `;
  const params = [];
  const conditions = [];

  // 人群口味：匹配预设分类或标签的影视
  const { categoryIds: tasteCategoryIds, tagIds: tasteTagIds } = tasteType
    ? await getTasteFilterIds(db, tasteType)
    : { categoryIds: [], tagIds: [] };

  if (tasteCategoryIds.length > 0 || tasteTagIds.length > 0) {
    const subQueries = [];
    if (tasteCategoryIds.length > 0) {
      const ph = tasteCategoryIds.map(() => '?').join(',');
      subQueries.push(`m.id IN (SELECT movie_id FROM movie_categories WHERE category_id IN (${ph}))`);
      params.push(...tasteCategoryIds);
    }
    if (tasteTagIds.length > 0) {
      const ph = tasteTagIds.map(() => '?').join(',');
      subQueries.push(`m.id IN (SELECT movie_id FROM movie_tags WHERE tag_id IN (${ph}))`);
      params.push(...tasteTagIds);
    }
    conditions.push('(' + subQueries.join(' OR ') + ')');
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
    conditions.push('(m.title LIKE ? OR m.description LIKE ? OR m.director LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
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
  }
  if (releaseStatus === 'unreleased') {
    conditions.push('(m.release_year IS NOT NULL AND m.release_year > ?)');
    params.push(currentYear);
  }

  if (language) {
    conditions.push('LOWER(TRIM(m.original_language)) = ?');
    params.push(language);
  }

  if (scoreMin != null && !Number.isNaN(scoreMin)) {
    conditions.push('m.tmdb_rating IS NOT NULL AND m.tmdb_rating >= ?');
    params.push(scoreMin);
  }
  if (scoreMax != null && !Number.isNaN(scoreMax)) {
    conditions.push('m.tmdb_rating IS NOT NULL AND m.tmdb_rating <= ?');
    params.push(scoreMax);
  }

  if (minVotes != null && !Number.isNaN(minVotes) && minVotes > 0) {
    conditions.push('COALESCE(m.tmdb_vote_count, 0) >= ?');
    params.push(minVotes);
  }

  if (providerIds.length > 0 && !searchAllChannels) {
    const ors = providerIds.map(() => '(m.watch_provider_ids LIKE ?)');
    conditions.push(`(m.watch_provider_ids IS NOT NULL AND TRIM(m.watch_provider_ids) != '' AND (${ors.join(' OR ')}))`);
    providerIds.forEach((pid) => params.push(`%|${pid}|%`));
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' GROUP BY m.id ORDER BY m.id DESC';
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

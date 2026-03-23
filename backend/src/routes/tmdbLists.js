/**
 * TMDB 公开数据（实时拉取 + 短缓存）
 * GET /api/tmdb/lists?kind=upcoming|now_playing|popular&region=CN
 * GET /api/tmdb/rail?type=trending|free&tab=...（首页仅展示 trending）
 * GET /api/tmdb/trailer-row?tab=hot|streaming|tv|rent|theaters&region=CN
 */
const express = require('express');
const db = require('../db/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

function getCached(key) {
  const row = cache.get(key);
  if (!row) return null;
  if (Date.now() - row.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return row.data;
}

function setCached(key, data) {
  cache.set(key, { at: Date.now(), data });
}

function getRegion(req) {
  const q = (req.query.region || process.env.TMDB_REGION || 'CN').trim();
  return /^[A-Z]{2}$/i.test(q) ? q.toUpperCase() : 'CN';
}

async function tmdbFetch(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovieRecommend/1.0)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** 统一为前端卡片：电影可合并本站 id；电视剧仅外链 TMDB */
function mapMediaItem(raw, forcedMedia) {
  const media = forcedMedia || raw.media_type || (raw.name && !raw.title ? 'tv' : 'movie');
  const isTv = media === 'tv';
  const tid = raw.id;
  const title = isTv ? (raw.name || raw.original_name || '未命名') : (raw.title || raw.original_title || '未命名');
  const date = isTv ? raw.first_air_date : raw.release_date;
  const poster = raw.poster_path ? `${TMDB_IMG}/w500${raw.poster_path}` : null;
  const backdrop = raw.backdrop_path
    ? `${TMDB_IMG}/w1280${raw.backdrop_path}`
    : raw.poster_path
      ? `${TMDB_IMG}/w1280${raw.poster_path}`
      : null;

  if (!isTv) {
    const row = db.prepare('SELECT id, cover, title, description FROM movies WHERE tmdb_id = ?').get(tid);
    return {
      media_type: 'movie',
      tmdb_id: tid,
      id: row?.id ?? null,
      title: row?.title || title,
      cover: row?.cover || poster,
      description: (row?.description && String(row.description).trim()) || raw.overview || '',
      release_date: date || null,
      release_year: date ? parseInt(String(date).slice(0, 4), 10) : null,
      vote_average: raw.vote_average,
      backdropUrl: backdrop,
      externalUrl: `https://www.themoviedb.org/movie/${tid}`,
      source: 'tmdb',
    };
  }

  return {
    media_type: 'tv',
    tmdb_id: tid,
    id: null,
    title,
    cover: poster,
    description: raw.overview || '',
    release_date: date || null,
    vote_average: raw.vote_average,
    backdropUrl: backdrop,
    externalUrl: `https://www.themoviedb.org/tv/${tid}`,
    source: 'tmdb',
  };
}

router.get('/lists', asyncHandler(async (req, res) => {
  const kind = (req.query.kind || 'upcoming').trim().toLowerCase();
  const region = getRegion(req);
  const KIND_PATH = {
    upcoming: '/movie/upcoming',
    now_playing: '/movie/now_playing',
    popular: '/movie/popular',
  };
  const path = KIND_PATH[kind];
  if (!path) {
    return res.status(400).json({ code: 400, message: 'kind 须为 upcoming | now_playing | popular' });
  }

  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    return res.json({
      code: 0,
      data: { list: [], message: '未配置 TMDB_API_KEY', fetchedAt: null, source: 'none' },
    });
  }

  const cacheKey = `lists:${kind}:${region}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ code: 0, data: { ...cached, cached: true } });
  }

  let extra = `&language=zh-CN&page=1`;
  if (kind === 'upcoming' || kind === 'now_playing') {
    extra += `&region=${encodeURIComponent(region)}`;
  }

  const url = `https://api.themoviedb.org/3${path}?api_key=${TMDB_API_KEY}${extra}`;
  let json;
  try {
    json = await tmdbFetch(url);
  } catch (e) {
    console.error('[tmdb/lists]', e.message);
    return res.json({
      code: 0,
      data: { list: [], message: e.message || '网络错误', fetchedAt: new Date().toISOString(), source: 'tmdb' },
    });
  }

  const raw = (json.results || []).slice(0, 20);
  const list = raw.map((m) => mapMediaItem(m, 'movie'));
  const payload = {
    list,
    fetchedAt: new Date().toISOString(),
    source: 'tmdb',
    kind,
    region,
    cached: false,
  };
  setCached(cacheKey, payload);
  res.json({ code: 0, data: payload });
}));

/**
 * 首页「热门」四 Tab / 「可免费观看」两 Tab（与 TMDB 中文站结构对齐）
 */
router.get('/rail', asyncHandler(async (req, res) => {
  const type = (req.query.type || '').trim().toLowerCase();
  const tab = (req.query.tab || '').trim().toLowerCase();
  const region = getRegion(req);
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    return res.json({ code: 0, data: { list: [], message: '未配置 TMDB_API_KEY', source: 'none' } });
  }

  const cacheKey = `rail:${type}:${tab}:${region}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ code: 0, data: { ...cached, cached: true } });
  }

  let url;
  if (type === 'trending') {
    if (tab === 'streaming') {
      url = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&language=zh-CN`;
    } else if (tab === 'tv') {
      url = `https://api.themoviedb.org/3/tv/on_the_air?api_key=${TMDB_API_KEY}&language=zh-CN&page=1`;
    } else if (tab === 'rent') {
      url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=zh-CN&watch_region=${region}&region=${region}&with_watch_monetization_types=rent&sort_by=popularity.desc&page=1`;
    } else if (tab === 'theaters') {
      url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=zh-CN&page=1&region=${encodeURIComponent(region)}`;
    } else {
      return res.status(400).json({ code: 400, message: 'trending 的 tab 须为 streaming | tv | rent | theaters' });
    }
  } else if (type === 'free') {
    if (tab === 'movie') {
      url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=zh-CN&watch_region=${region}&region=${region}&with_watch_monetization_types=free&sort_by=popularity.desc&page=1`;
    } else if (tab === 'tv') {
      url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=zh-CN&watch_region=${region}&with_watch_monetization_types=free&sort_by=popularity.desc&page=1`;
    } else {
      return res.status(400).json({ code: 400, message: 'free 的 tab 须为 movie | tv' });
    }
  } else {
    return res.status(400).json({ code: 400, message: 'type 须为 trending | free' });
  }

  let json;
  try {
    json = await tmdbFetch(url);
  } catch (e) {
    console.error('[tmdb/rail]', type, tab, e.message);
    return res.json({
      code: 0,
      data: { list: [], message: e.message, fetchedAt: new Date().toISOString(), source: 'tmdb', type, tab },
    });
  }

  const results = json.results || [];
  const list = [];
  for (const item of results.slice(0, 20)) {
    if (type === 'trending' && tab === 'streaming') {
      const mt = item.media_type === 'tv' ? 'tv' : 'movie';
      list.push(mapMediaItem(item, mt));
    } else if (type === 'trending' && tab === 'tv') {
      list.push(mapMediaItem(item, 'tv'));
    } else if (type === 'free' && tab === 'tv') {
      list.push(mapMediaItem(item, 'tv'));
    } else {
      list.push(mapMediaItem(item, 'movie'));
    }
  }

  const payload = {
    list,
    fetchedAt: new Date().toISOString(),
    source: 'tmdb',
    type,
    tab,
    region,
    cached: false,
  };
  setCached(cacheKey, payload);
  res.json({ code: 0, data: payload });
}));

/**
 * 「最新预告片」横条：**全部为未上映**（与 TMDB「即将上映」片单一致，不含已上映/在映）
 * - 电影类 Tab：均用 `movie/upcoming` 不同分页，避免 discover/now_playing 混入已上映
 * - 电视 Tab：`discover/tv` + `first_air_date.gte=今天`（尚未首播或即将开播的剧集）
 */
router.get('/trailer-row', asyncHandler(async (req, res) => {
  const tab = (req.query.tab || 'hot').trim().toLowerCase();
  const region = getRegion(req);
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    return res.json({ code: 0, data: { list: [], message: '未配置 TMDB_API_KEY', source: 'none' } });
  }

  /** v2：全部为 upcoming/discover 未上映，与旧缓存区分 */
  const cacheKey = `trailer:v2:${tab}:${region}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ code: 0, data: { ...cached, cached: true } });
  }

  const upcomingMovie = (page) =>
    `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&language=zh-CN&page=${page}&region=${encodeURIComponent(region)}`;

  let url;
  if (tab === 'hot') {
    url = upcomingMovie(1);
  } else if (tab === 'streaming') {
    url = upcomingMovie(2);
  } else if (tab === 'tv') {
    const today = new Date().toISOString().slice(0, 10);
    url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=zh-CN&sort_by=popularity.desc&first_air_date.gte=${today}&page=1`;
  } else if (tab === 'rent') {
    url = upcomingMovie(3);
  } else if (tab === 'theaters') {
    /** 与「影院上映中」文案区分：此处数据仍为即将上映第 4 页，不含 now_playing */
    url = upcomingMovie(4);
  } else {
    return res.status(400).json({ code: 400, message: 'tab 须为 hot | streaming | tv | rent | theaters' });
  }

  let json;
  try {
    json = await tmdbFetch(url);
  } catch (e) {
    console.error('[tmdb/trailer-row]', tab, e.message);
    return res.json({
      code: 0,
      data: { list: [], message: e.message, fetchedAt: new Date().toISOString(), source: 'tmdb', tab },
    });
  }

  const raw = (json.results || []).slice(0, 20);
  const list = raw.map((m) => {
    if (tab === 'tv') {
      return mapMediaItem(m, 'tv');
    }
    return mapMediaItem(m, 'movie');
  });

  const payload = {
    list,
    fetchedAt: new Date().toISOString(),
    source: 'tmdb',
    tab,
    region,
    upcomingOnly: true,
    cached: false,
  };
  setCached(cacheKey, payload);
  res.json({ code: 0, data: payload });
}));

module.exports = router;

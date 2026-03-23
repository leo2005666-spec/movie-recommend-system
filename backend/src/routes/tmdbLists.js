/**
 * TMDB 官方列表（实时拉取，与爬虫库解耦）——用于首页「最新预告片」等与 TMDB 一致的数据
 * GET /api/tmdb/lists?kind=upcoming|now_playing|popular
 */
const express = require('express');
const db = require('../db/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const TMDB_IMG = 'https://image.tmdb.org/t/p';

/** 简单内存缓存，减轻 TMDB 频率与首屏重复请求（约 5 分钟） */
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

const KIND_TO_PATH = {
  upcoming: '/movie/upcoming',
  now_playing: '/movie/now_playing',
  popular: '/movie/popular',
};

/**
 * 将 TMDB 结果与本地库合并：有 tmdb_id 则带本站 id / 封面；无则仍可展示并链到 TMDB
 */
function mapMovie(tmdbMovie) {
  const row = db.prepare('SELECT id, cover, title, description FROM movies WHERE tmdb_id = ?').get(tmdbMovie.id);
  const poster = tmdbMovie.poster_path ? `${TMDB_IMG}/w780${tmdbMovie.poster_path}` : null;
  const backdrop = tmdbMovie.backdrop_path
    ? `${TMDB_IMG}/w1280${tmdbMovie.backdrop_path}`
    : tmdbMovie.poster_path
      ? `${TMDB_IMG}/w1280${tmdbMovie.poster_path}`
      : null;

  const title = tmdbMovie.title || tmdbMovie.original_title || '未命名';
  return {
    id: row?.id ?? null,
    tmdb_id: tmdbMovie.id,
    title: row?.title || title,
    cover: row?.cover || poster,
    description: (row?.description && String(row.description).trim()) || tmdbMovie.overview || '',
    release_date: tmdbMovie.release_date || null,
    release_year: tmdbMovie.release_date ? parseInt(String(tmdbMovie.release_date).slice(0, 4), 10) : null,
    /** 宽屏背景（悬停区用），前端经 proxy-img */
    backdropUrl: backdrop,
    externalUrl: `https://www.themoviedb.org/movie/${tmdbMovie.id}`,
    source: 'tmdb',
  };
}

router.get('/lists', asyncHandler(async (req, res) => {
  const kind = (req.query.kind || 'upcoming').trim().toLowerCase();
  const path = KIND_TO_PATH[kind];
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

  const cacheKey = `lists:${kind}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ code: 0, data: { ...cached, cached: true } });
  }

  const url = `https://api.themoviedb.org/3${path}?api_key=${TMDB_API_KEY}&language=zh-CN&page=1`;
  let json;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovieRecommend/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      console.error('[tmdb/lists]', kind, r.status);
      return res.json({
        code: 0,
        data: { list: [], message: `TMDB 请求失败 ${r.status}`, fetchedAt: new Date().toISOString(), source: 'tmdb' },
      });
    }
    json = await r.json();
  } catch (e) {
    console.error('[tmdb/lists]', e.message);
    return res.json({
      code: 0,
      data: { list: [], message: e.message || '网络错误', fetchedAt: new Date().toISOString(), source: 'tmdb' },
    });
  }

  const raw = (json.results || []).slice(0, 20);
  const list = raw.map((m) => mapMovie(m));
  const payload = {
    list,
    fetchedAt: new Date().toISOString(),
    source: 'tmdb',
    kind,
    cached: false,
  };
  setCached(cacheKey, payload);
  res.json({ code: 0, data: payload });
}));

module.exports = router;

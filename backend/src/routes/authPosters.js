/**
 * 认证页海报 API：从 TMDB 获取最新热门电影海报，5 天缓存
 * GET /api/tmdb/auth-posters
 *
 * 前端可定期调用此接口获取最新海报列表，
 * 同时本地 constants/authPagePosters.js 作为初始默认值
 */
const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';

const POSTER_COUNT = 78;
const TTL_MS = 5 * 24 * 60 * 60 * 1000; // 5 天缓存
const FETCH_PAGES = 5; // 每页 20 部

let cache = null; // { at: timestamp, posters: string[] }

async function tmdbFetch(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovieRecommend/1.0)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function fetchFromTmdb() {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) return null;

  const seen = new Set();
  const posters = [];

  // 先拉正在上映
  for (let page = 1; page <= 3; page++) {
    const url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=zh-CN&page=${page}`;
    const json = await tmdbFetch(url).catch(() => null);
    if (!json) continue;
    for (const m of json.results || []) {
      if (m.poster_path && !seen.has(m.id)) {
        seen.add(m.id);
        posters.push(`${TMDB_IMG}${m.poster_path}`);
        if (posters.length >= POSTER_COUNT) break;
      }
    }
    if (posters.length >= POSTER_COUNT) break;
  }

  // 再拉热门补足
  if (posters.length < POSTER_COUNT) {
    for (let page = 1; page <= FETCH_PAGES; page++) {
      const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=zh-CN&page=${page}`;
      const json = await tmdbFetch(url).catch(() => null);
      if (!json) continue;
      for (const m of json.results || []) {
        if (m.poster_path && !seen.has(m.id)) {
          seen.add(m.id);
          posters.push(`${TMDB_IMG}${m.poster_path}`);
          if (posters.length >= POSTER_COUNT) break;
        }
      }
      if (posters.length >= POSTER_COUNT) break;
    }
  }

  return posters.length >= 12 ? posters : null;
}

router.get('/', asyncHandler(async (req, res) => {
  // 检查缓存
  if (cache && Date.now() - cache.at < TTL_MS) {
    return res.json({
      code: 0,
      data: { posters: cache.posters, updatedAt: new Date(cache.at).toISOString(), cached: true },
    });
  }

  const posters = await fetchFromTmdb();

  if (posters && posters.length >= 12) {
    cache = { at: Date.now(), posters };
    return res.json({
      code: 0,
      data: { posters, updatedAt: new Date(cache.at).toISOString(), cached: false },
    });
  }

  // TMDB 不可用 → 返回缓存（即使过期）或空
  if (cache) {
    return res.json({
      code: 0,
      data: { posters: cache.posters, updatedAt: new Date(cache.at).toISOString(), cached: true, stale: true },
    });
  }

  return res.json({ code: 0, data: { posters: [], message: 'TMDB_API_KEY 未配置或请求失败' } });
}));

module.exports = router;

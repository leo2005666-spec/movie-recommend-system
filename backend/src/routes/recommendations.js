/**
 * 协同过滤推荐接口
 * GET /api/recommendations?scene=home_personalized|similar&userId=&movieId=&limit=
 * Fallback: 未登录/无交互/结果空 => 原有个性化/热门推荐
 */
const express = require('express');
const db = require('../db/db');
const { optionalAuth } = require('../middleware/auth');
const collabFilter = require('../services/collabFilter');
const { getPersonalizedRecommendations, getPopularRecommendations, getColdStartRecommendations } = require('../services/recommendFallback');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

/**
 * 根据 movieId 列表查询完整电影信息，保持顺序
 */
async function enrichMovies(movieIds) {
  if (!movieIds.length) return [];
  const placeholders = movieIds.map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT id, title, cover, description, release_year
    FROM movies WHERE id IN (${placeholders})
  `).all(...movieIds);
  const byId = {};
  rows.forEach((r) => { byId[r.id] = r; });
  return movieIds.map((id) => byId[id]).filter(Boolean);
}

/**
 * 冷启动：优先根据性别/年龄推荐，再个性化，最后热门
 */
async function coldStartPersonalized(userId, limit) {
  return getColdStartRecommendations(userId, limit);
}

/**
 * home_personalized 场景
 */
async function handleHomePersonalized(userId, limit) {
  const cf = await collabFilter.getCFPersonalized(userId, limit);
  if (cf && cf.length > 0) {
    const movies = await enrichMovies(cf.map((r) => r.movieId));
    return { list: movies, source: 'collab_filter' };
  }
  return {
    list: userId ? await coldStartPersonalized(userId, limit) : await getPopularRecommendations(limit),
    source: 'fallback',
  };
}

/**
 * similar 场景（喜欢这部电影的人也喜欢）
 */
async function handleSimilar(movieId, userId, limit) {
  let items = await collabFilter.getSimilarMovies(movieId, userId, limit);
  if (!items || items.length === 0) {
    items = await collabFilter.getContentSimilar(movieId, limit);
  }
  if (!items || items.length === 0) {
    const popular = await collabFilter.getPopularMovies(limit);
    items = popular.map((m) => ({ movieId: m.id, score: 1, reason: 'popular' }));
  }
  const movies = await enrichMovies(items.map((r) => r.movieId));
  return { list: movies, source: items[0]?.reason || 'fallback' };
}

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const scene = (req.query.scene || 'home_personalized').toLowerCase();
  const limit = Math.min(80, Math.max(6, parseInt(req.query.limit) || 12));
  const userId = req.query.userId ? parseInt(req.query.userId) : (req.user?.id ?? null);
  const movieId = req.query.movieId ? parseInt(req.query.movieId) : null;

  try {
    let result;
    if (scene === 'similar' && movieId) {
      result = await handleSimilar(movieId, userId, limit);
    } else {
      result = await handleHomePersonalized(userId, limit);
    }
    res.json({ code: 0, data: result.list, source: result.source });
  } catch (err) {
    console.error('[recommendations]', err.message);
    const fallback = userId ? await getPersonalizedRecommendations(userId, limit) : await getPopularRecommendations(limit);
    res.json({ code: 0, data: fallback, source: 'fallback_error' });
  }
}));

module.exports = router;

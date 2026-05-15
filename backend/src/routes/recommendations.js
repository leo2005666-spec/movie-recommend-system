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
const { reasonToLabel } = require('../utils/recommendLabels');
const { isAllowedLanguage, dailySeed, seededJitter } = require('../utils/recommendUtils');

const router = express.Router();

/** rankCfMovies 的抖动幅度 */
const RANK_JITTER_RANGE = 0.12;

/**
 * 根据 movieId 列表查询完整电影信息，保持顺序
 */
async function enrichMovies(movieIds) {
  if (!movieIds.length) return [];
  const placeholders = movieIds.map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT id, title, cover, description, release_year, release_date, duration, tmdb_vote_count, tmdb_rating, original_language
    FROM movies WHERE id IN (${placeholders})
  `).all(...movieIds);
  const byId = {};
  rows.forEach((r) => { byId[r.id] = r; });
  return movieIds.map((id) => byId[id]).filter(Boolean);
}

/**
 * 协同过滤候选：在保留 CF 分数的前提下，用 TMDB 投票数做温和加权，减少「全是小众片」
 */
function rankCfMovies(cfItems, enrichedList) {
  const seed = dailySeed();
  const byId = Object.fromEntries(enrichedList.map((m) => [m.id, m]));
  const merged = cfItems
    .map((c) => {
      const m = byId[c.movieId];
      if (!m) return null;
      const votes = Math.max(0, m.tmdb_vote_count || 0);
      const boost = 0.35 + 0.65 * (Math.log1p(votes) / Math.log1p(50000));
      const jitter = seededJitter(c.movieId, seed) * RANK_JITTER_RANGE;
      return { ...m, _rank: (c.score || 0) * boost * (1 + jitter) };
    })
    .filter(Boolean);
  merged.sort((a, b) => b._rank - a._rank);
  merged.forEach((m) => { delete m._rank; });
  return merged;
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
  const cf = await collabFilter.getCFPersonalized(userId, Math.max(limit * 3, 36));
  if (cf && cf.length > 0) {
    const raw = await enrichMovies(cf.map((r) => r.movieId));
    // 仅保留中英文电影
    const filtered = raw.filter((m) => isAllowedLanguage(m.original_language));
    const movies = rankCfMovies(cf, filtered).slice(0, limit);
    const reasonById = Object.fromEntries(cf.map((c) => [c.movieId, reasonToLabel(c.reason)]));
    const withLabels = movies.map((m) => ({
      ...m,
      recommendReason: reasonById[m.id] || '口味相近',
    }));
    const usedHybrid = withLabels.some((m) => m.recommendReason === '混合推荐');
    if (withLabels.length >= Math.min(6, limit)) {
      return { list: withLabels, source: usedHybrid ? 'hybrid_cf_content' : 'collab_filter' };
    }
  }
  const rawList = userId ? await coldStartPersonalized(userId, limit) : await getPopularRecommendations(limit);
  const tag = userId ? '猜你喜欢' : '热门推荐';
  return {
    list: rawList.map((m) => ({ ...m, recommendReason: tag })),
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
  const reasonById = Object.fromEntries(items.map((i) => [i.movieId, reasonToLabel(i.reason)]));
  const movies = await enrichMovies(items.map((r) => r.movieId));
  // 仅保留中英文电影
  const filtered = movies.filter((m) => isAllowedLanguage(m.original_language)).slice(0, limit);
  return {
    list: filtered.map((m) => ({ ...m, recommendReason: reasonById[m.id] || '推荐' })),
    source: items[0]?.reason || 'fallback',
  };
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
    const listOut = Array.isArray(result.list) ? result.list : [];
    res.json({ code: 0, data: listOut, source: result.source });
  } catch (err) {
    console.error('[recommendations]', err.message);
    const fallback = userId ? await getPersonalizedRecommendations(userId, limit) : await getPopularRecommendations(limit);
    const tag = userId ? '猜你喜欢' : '热门推荐';
    const withR = fallback.map((m) => ({ ...m, recommendReason: tag }));
    res.json({ code: 0, data: withR, source: 'fallback_error' });
  }
}));

module.exports = router;

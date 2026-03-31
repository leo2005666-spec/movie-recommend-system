/**
 * 榜单：一周口碑榜、高分榜、热门榜
 * - 口碑榜：基于用户评分行为（过去7天）
 * - 高分榜：系统数据 tmdb_rating 排序，自动更新
 * - 热门榜：综合收藏数+评分人数，经典高分可上榜
 */
const express = require('express');
const db = require('../db/db');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

/**
 * 一周口碑榜：过去 7 天内有评分的电影，按 (平均分 × 评分人数^0.5) 排序
 * 唯一基于用户行为的榜单
 */
async function getWeeklyTop(limit = 10) {
  const rows = await db.prepare(`
    SELECT m.id, m.title, m.cover, m.release_year, m.tmdb_rating,
           AVG(r.score) as avg_score,
           COUNT(*) as cnt
    FROM ratings r
    INNER JOIN movies m ON r.movie_id = m.id
    WHERE r.created_at >= datetime('now', '-7 days')
    GROUP BY r.movie_id
    HAVING COUNT(*) >= 1
    ORDER BY avg_score * (cnt * 1.0) DESC, cnt DESC
    LIMIT ?
  `).all(limit);
  return rows.map((r, i) => ({
    rank: i + 1,
    ...r,
    avg_score: Math.round(r.avg_score * 10) / 10,
  }));
}

/**
 * 高分榜：系统根据 tmdb_rating 自动排序，取前 10 名
 * 不依赖用户评分，TMDB 同步后自动更新
 */
async function getTopRated(limit = 10) {
  const rows = await db.prepare(`
    SELECT m.id, m.title, m.cover, m.release_year, m.tmdb_rating
    FROM movies m
    WHERE m.tmdb_rating IS NOT NULL AND m.tmdb_rating > 0
    ORDER BY m.tmdb_rating DESC
    LIMIT ?
  `).all(limit);
  return rows.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    title: r.title,
    cover: r.cover,
    release_year: r.release_year,
    tmdb_rating: r.tmdb_rating,
    avg_score: null,
    cnt: 0,
  }));
}

/**
 * 热门榜：综合收藏数 + 评分人数，经典高分片可上榜
 * 收藏多、评分多的排前；无数据时 fallback 到 tmdb_rating（经典）
 */
async function getHotList(limit = 10) {
  const rows = await db.prepare(`
    SELECT m.id, m.title, m.cover, m.release_year, m.tmdb_rating,
           (SELECT COUNT(*) FROM favorites WHERE movie_id = m.id) as fav_cnt,
           (SELECT COUNT(*) FROM ratings WHERE movie_id = m.id) as rating_cnt,
           (SELECT AVG(score) FROM ratings WHERE movie_id = m.id) as user_avg
    FROM movies m
    ORDER BY (fav_cnt * 2 + rating_cnt) DESC, COALESCE(m.tmdb_rating, 0) DESC
    LIMIT ?
  `).all(limit);
  return rows.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    title: r.title,
    cover: r.cover,
    release_year: r.release_year,
    tmdb_rating: r.tmdb_rating,
    avg_score: r.user_avg != null ? Math.round(r.user_avg * 10) / 10 : null,
    cnt: r.rating_cnt || 0,
  }));
}

/** 获取榜单 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const type = (req.query.type || 'weekly').toLowerCase();
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 10));

  let data;
  if (type === 'top') {
    data = await getTopRated(limit);
  } else if (type === 'hot') {
    data = await getHotList(limit);
  } else {
    data = await getWeeklyTop(limit);
  }
  res.json({ code: 0, data: { type, list: data } });
}));

/** 获取全部榜单（供首页/榜单页一次拉取） */
router.get('/all', optionalAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(5, parseInt(req.query.limit) || 10));
  res.json({
    code: 0,
    data: {
      weekly: await getWeeklyTop(limit),
      top: await getTopRated(limit),
      hot: await getHotList(limit),
    },
  });
}));

module.exports = router;

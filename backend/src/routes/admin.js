/**
 * 管理员专用接口：查看用户评分等数据
 * 用于根据用户评分驱动个性化推荐的数据可见性
 */
const express = require('express');
const db = require('../db/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
router.use(authMiddleware, requireAdmin);

/**
 * GET /api/admin/ratings
 * 管理员查看所有用户评分（普通用户评分上交到管理员处）
 * 用于了解推荐系统依赖的评分数据
 */
router.get('/ratings', asyncHandler(async (req, res) => {
  const list = await db.prepare(`
    SELECT r.id, r.user_id, r.movie_id, r.score, r.created_at,
           u.username, u.nickname,
           m.title as movie_title
    FROM ratings r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN movies m ON r.movie_id = m.id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ code: 0, data: list });
}));

/**
 * GET /api/admin/stats
 * 数据概览仪表盘：用户、影视、评分、评论、收藏等汇总数据
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const [users, movies, ratings, comments, favorites,
    todayRatings, todayComments, todayNewUsers] = await Promise.all([
    db.prepare('SELECT COUNT(*) as n FROM users').get(),
    db.prepare('SELECT COUNT(*) as n FROM movies').get(),
    db.prepare('SELECT COUNT(*) as n FROM ratings').get(),
    db.prepare('SELECT COUNT(*) as n FROM comments').get(),
    db.prepare('SELECT COUNT(*) as n FROM favorites').get(),
    db.prepare("SELECT COUNT(*) as n FROM ratings WHERE date(created_at) = date('now')").get(),
    db.prepare("SELECT COUNT(*) as n FROM comments WHERE date(created_at) = date('now')").get(),
    db.prepare("SELECT COUNT(*) as n FROM users WHERE date(created_at) = date('now')").get(),
  ]);
  res.json({
    code: 0,
    data: {
      totalUsers: users.n,
      totalMovies: movies.n,
      totalRatings: ratings.n,
      totalComments: comments.n,
      totalFavorites: favorites.n,
      todayRatings: todayRatings.n,
      todayComments: todayComments.n,
      todayNewUsers: todayNewUsers.n,
    },
  });
}));

module.exports = router;

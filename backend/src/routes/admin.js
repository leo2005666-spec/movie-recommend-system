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
 * GET /api/admin/dashboard
 * 数据概览：用户数、影片数、评分数、评论数、收藏数、反馈数
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const users = (await db.prepare('SELECT COUNT(*) as n FROM users').get())?.n ?? 0;
  const movies = (await db.prepare('SELECT COUNT(*) as n FROM movies').get())?.n ?? 0;
  const ratings = (await db.prepare('SELECT COUNT(*) as n FROM ratings').get())?.n ?? 0;
  const comments = (await db.prepare('SELECT COUNT(*) as n FROM comments').get())?.n ?? 0;
  const favorites = (await db.prepare('SELECT COUNT(*) as n FROM favorites').get())?.n ?? 0;
  let feedbacks = 0;
  try {
    feedbacks = (await db.prepare('SELECT COUNT(*) as n FROM feedbacks').get())?.n ?? 0;
  } catch (_) {
    /* 表不存在时忽略 */
  }
  res.json({
    code: 0,
    data: { users, movies, ratings, comments, favorites, feedbacks },
  });
}));

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
 * GET /api/admin/explore/comments?page&limit
 * 全站评论明细（管理员），分页
 */
router.get('/explore/comments', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const total = (await db.prepare('SELECT COUNT(*) as n FROM comments').get())?.n ?? 0;
  const list = await db.prepare(`
    SELECT c.id, c.user_id, c.movie_id, c.content, c.created_at,
           u.username, u.nickname, u.avatar, u.avatar_style,
           m.title as movie_title
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN movies m ON c.movie_id = m.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ code: 0, data: { list, total, page, limit } });
}));

/**
 * GET /api/admin/explore/favorites?page&limit
 * 全站收藏明细（管理员），分页：谁收藏了哪部影片
 */
router.get('/explore/favorites', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const total = (await db.prepare('SELECT COUNT(*) as n FROM favorites').get())?.n ?? 0;
  const list = await db.prepare(`
    SELECT f.id, f.user_id, f.movie_id, f.created_at,
           u.username, u.nickname, u.avatar, u.avatar_style,
           m.title as movie_title
    FROM favorites f
    LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN movies m ON f.movie_id = m.id
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ code: 0, data: { list, total, page, limit } });
}));

module.exports = router;

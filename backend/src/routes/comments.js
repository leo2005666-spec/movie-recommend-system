/**
 * 评论功能：用户对影视作品进行简要评价
 * 支持热门影评（跨作品最新评论，类似豆瓣热评）
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

/** 热门影评：最新发表的评论，跨作品，带电影信息 */
router.get('/hot', optionalAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(5, parseInt(req.query.limit) || 8));
  const list = await db.prepare(`
    SELECT c.id, c.user_id, u.username, u.avatar, u.avatar_style,
           c.content, c.created_at, c.movie_id,
           m.title as movie_title
    FROM comments c
    INNER JOIN users u ON c.user_id = u.id
    INNER JOIN movies m ON c.movie_id = m.id
    ORDER BY c.id DESC
    LIMIT ?
  `).all(limit);
  res.json({ code: 0, data: list });
}));

// 获取某作品的评论列表
router.get('/movie/:movieId', optionalAuth, asyncHandler(async (req, res) => {
  const movieId = parseInt(req.params.movieId);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  const list = await db.prepare(`
    SELECT c.id, c.user_id, u.username, u.avatar, u.avatar_style,
           c.content, c.created_at
    FROM comments c
    INNER JOIN users u ON c.user_id = u.id
    WHERE c.movie_id = ?
    ORDER BY c.id DESC LIMIT ? OFFSET ?
  `).all(movieId, limit, offset);

  const total = (await db.prepare('SELECT COUNT(*) as n FROM comments WHERE movie_id = ?').get(movieId)).n;
  res.json({ code: 0, data: { list, total, page, limit } });
}));

// 发表评论（需登录）
router.post('/', authMiddleware, [
  body('movieId').isInt(),
  body('content').trim().isLength({ min: 1, max: 2000 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ code: 400, message: '评论1-2000字' });
  const { movieId, content } = req.body;
  const movie = await db.prepare('SELECT id, title FROM movies WHERE id = ?').get(movieId);
  if (!movie) return res.status(404).json({ code: 404, message: '作品不存在' });

  await db.prepare('INSERT INTO comments (user_id, movie_id, content) VALUES (?, ?, ?)')
    .run(req.user.id, movieId, content);
  const row = await db.prepare('SELECT last_insert_rowid() as id').get();
  await logActivity(req, 'COMMENT', 'movie', movieId, content.slice(0, 50));
  res.json({ code: 0, data: { id: row.id }, message: '评论成功' });
}));

// 删除自己的评论
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const comment = await db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  if (!comment) return res.status(404).json({ code: 404, message: '评论不存在' });
  if (comment.user_id !== req.user.id) {
    return res.status(403).json({ code: 403, message: '只能删除自己的评论' });
  }
  await db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  await logActivity(req, 'DELETE_COMMENT', 'comment', id, '');
  res.json({ code: 0, message: '已删除' });
}));

module.exports = router;

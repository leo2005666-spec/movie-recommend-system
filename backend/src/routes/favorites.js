/**
 * 收藏功能：用户收藏影视作品
 */
const express = require('express');
const db = require('../db/db');
const { authMiddleware } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
router.use(authMiddleware);

// 添加收藏
router.post('/', asyncHandler(async (req, res) => {
  const movieId = parseInt(req.body.movieId);
  if (!movieId) return res.status(400).json({ code: 400, message: '缺少 movieId' });
  const movie = await db.prepare('SELECT id, title FROM movies WHERE id = ?').get(movieId);
  if (!movie) return res.status(404).json({ code: 404, message: '作品不存在' });
  try {
    await db.prepare('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)').run(req.user.id, movieId);
    await logActivity(req, 'FAVORITE', 'movie', movieId, movie.title);
    res.json({ code: 0, message: '已收藏' });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ code: 400, message: '已收藏过' });
    }
    throw e;
  }
}));

// 取消收藏
router.delete('/:movieId', asyncHandler(async (req, res) => {
  const movieId = parseInt(req.params.movieId);
  await db.prepare('DELETE FROM favorites WHERE user_id = ? AND movie_id = ?').run(req.user.id, movieId);
  await logActivity(req, 'UNFAVORITE', 'movie', movieId, '取消收藏');
  res.json({ code: 0, message: '已取消收藏' });
}));

// 我的收藏列表
router.get('/', asyncHandler(async (req, res) => {
  const list = await db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year, f.created_at as favorited_at
    FROM favorites f
    INNER JOIN movies m ON f.movie_id = m.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json({ code: 0, data: list });
}));

module.exports = router;

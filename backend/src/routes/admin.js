/**
 * 管理员专用接口：查看用户评分等数据
 * 用于根据用户评分驱动个性化推荐的数据可见性
 */
const express = require('express');
const db = require('../db/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware, requireAdmin);

/**
 * GET /api/admin/ratings
 * 管理员查看所有用户评分（普通用户评分上交到管理员处）
 * 用于了解推荐系统依赖的评分数据
 */
router.get('/ratings', (req, res) => {
  const list = db.prepare(`
    SELECT r.id, r.user_id, r.movie_id, r.score, r.created_at,
           u.username, u.nickname,
           m.title as movie_title
    FROM ratings r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN movies m ON r.movie_id = m.id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ code: 0, data: list });
});

module.exports = router;

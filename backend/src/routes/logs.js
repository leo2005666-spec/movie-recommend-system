/**
 * 用户活动日志：查询与展示
 * 用于审计和监控
 */
const express = require('express');
const db = require('../db/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 当前用户查看自己的日志
router.get('/me', authMiddleware, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(10, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const list = db.prepare(`
    SELECT id, action, target_type, target_id, detail, ip, created_at
    FROM activity_logs WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);
  const total = db.prepare('SELECT COUNT(*) as n FROM activity_logs WHERE user_id = ?').get(req.user.id).n;
  res.json({ code: 0, data: { list, total, page, limit } });
});

// 管理员：查看所有日志或按用户筛选
router.get('/', authMiddleware, requireAdmin, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(10, parseInt(req.query.limit) || 20));
  const userId = req.query.userId ? parseInt(req.query.userId) : null;
  const offset = (page - 1) * limit;

  let where = '';
  const params = [];
  if (userId) {
    where = ' WHERE user_id = ?';
    params.push(userId);
  }
  params.push(limit, offset);

  const list = db.prepare(`
    SELECT l.id, l.user_id, u.username, l.action, l.target_type, l.target_id, l.detail, l.ip, l.created_at
    FROM activity_logs l LEFT JOIN users u ON l.user_id = u.id ${where}
    ORDER BY l.id DESC LIMIT ? OFFSET ?
  `).all(...(userId ? [userId, limit, offset] : [limit, offset]));

  const total = db.prepare(`SELECT COUNT(*) as n FROM activity_logs ${where}`)
    .get(...(userId ? [userId] : [])).n;

  res.json({ code: 0, data: { list, total, page, limit } });
});

module.exports = router;

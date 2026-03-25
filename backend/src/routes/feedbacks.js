/**
 * 用户反馈：意见反馈渠道，收集对系统和推荐效果的评价
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, requireAdmin, optionalAuth } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// 提交反馈（可匿名，建议登录；登录用户会关联 userId）
router.post('/', optionalAuth, [
  body('content').trim().isLength({ min: 5, max: 1000 }).withMessage('反馈内容 5-1000 字'),
  body('type').optional().trim(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array()[0]?.msg || '反馈内容需 5-1000 字';
    return res.status(400).json({ code: 400, message: msg });
  }
  const { content, type } = req.body;
  const userId = req.user?.id || null;
  try {
    await db.prepare('INSERT INTO feedbacks (user_id, content, type) VALUES (?, ?, ?)')
      .run(userId, (content || '').trim(), (type || 'general').trim());
    const row = await db.prepare('SELECT last_insert_rowid() as id').get();
    if (userId) await logActivity(req, 'FEEDBACK', 'feedback', row.id, '提交反馈');
    res.json({ code: 0, data: { id: row.id }, message: '感谢您的反馈' });
  } catch (e) {
    console.error('[Feedback] 提交失败:', e.message);
    res.status(500).json({ code: 500, message: '提交失败，请稍后重试' });
  }
}));

// 用户查看自己的反馈（需登录）
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const list = await db.prepare(`
    SELECT id, content, type, status, created_at
    FROM feedbacks WHERE user_id = ? ORDER BY id DESC
  `).all(req.user.id);
  res.json({ code: 0, data: list });
}));

// 管理员：查看所有反馈（仅查询，无「已读即消失」逻辑，可随时重复打开查看）
router.get('/', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const list = await db.prepare(`
    SELECT f.id, f.user_id, u.username, f.content, f.type, f.status, f.created_at
    FROM feedbacks f LEFT JOIN users u ON f.user_id = u.id
    ORDER BY f.id DESC
  `).all();
  res.json({ code: 0, data: list });
}));

// 管理员：更新反馈状态
router.patch('/:id', authMiddleware, requireAdmin, [
  body('status').isIn(['pending', 'processed', 'rejected']),
], asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  await db.prepare('UPDATE feedbacks SET status = ? WHERE id = ?').run(status, id);
  res.json({ code: 0, message: '已更新' });
}));

// 管理员：删除反馈（物理删除，用于垃圾信息或重复提交）
router.delete('/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ code: 400, message: '无效 id' });
  const row = await db.prepare('SELECT id FROM feedbacks WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ code: 404, message: '反馈不存在' });
  await db.prepare('DELETE FROM feedbacks WHERE id = ?').run(id);
  await logActivity(req, 'DELETE_FEEDBACK', 'feedback', id, '');
  res.json({ code: 0, message: '已删除' });
}));

module.exports = router;

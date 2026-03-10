/**
 * 问答社区：用户咨询系统使用等问题，其他用户或管理员可解答
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// 获取问题列表（含回答数）
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const list = await db.prepare(`
    SELECT p.id, p.user_id, u.username, u.nickname, p.title, p.content, p.is_answer, p.parent_id, p.created_at,
           (SELECT COUNT(*) FROM qa_posts WHERE parent_id = p.id) as answer_count
    FROM qa_posts p
    INNER JOIN users u ON p.user_id = u.id
    WHERE p.parent_id IS NULL
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = (await db.prepare('SELECT COUNT(*) as n FROM qa_posts WHERE parent_id IS NULL').get()).n;
  res.json({ code: 0, data: { list, total, page, limit } });
}));

// 获取问题详情及回答
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const question = await db.prepare(`
    SELECT p.*, u.username, u.nickname
    FROM qa_posts p INNER JOIN users u ON p.user_id = u.id
    WHERE p.id = ? AND p.parent_id IS NULL
  `).get(id);
  if (!question) return res.status(404).json({ code: 404, message: '问题不存在' });

  const answers = await db.prepare(`
    SELECT p.*, u.username, u.nickname
    FROM qa_posts p INNER JOIN users u ON p.user_id = u.id
    WHERE p.parent_id = ? ORDER BY p.created_at ASC
  `).all(id);

  res.json({ code: 0, data: { question, answers } });
}));

// 发布问题（需登录）
router.post('/', authMiddleware, [
  body('title').trim().isLength({ min: 2, max: 100 }).withMessage('标题 2-100 字'),
  body('content').trim().isLength({ min: 5, max: 2000 }).withMessage('内容 5-2000 字'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array()[0]?.msg || '请检查标题和内容';
    return res.status(400).json({ code: 400, message: msg });
  }
  const { title, content } = req.body;
  try {
    await db.prepare('INSERT INTO qa_posts (user_id, title, content, is_answer) VALUES (?, ?, ?, 0)')
      .run(req.user.id, title.trim(), content.trim());
    const row = await db.prepare('SELECT last_insert_rowid() as id').get();
    await logActivity(req, 'QA_ASK', 'qa', row.id, title);
    res.json({ code: 0, data: { id: row.id }, message: '提问成功' });
  } catch (e) {
    console.error('[QA] 提问失败:', e.message);
    res.status(500).json({ code: 500, message: '提交失败，请稍后重试' });
  }
}));

// 回答问题（需登录）
router.post('/:id/answer', authMiddleware, [
  body('content').trim().isLength({ min: 5, max: 2000 }).withMessage('回答内容 5-2000 字'),
], asyncHandler(async (req, res) => {
  const questionId = parseInt(req.params.id);
  const question = await db.prepare('SELECT id FROM qa_posts WHERE id = ? AND parent_id IS NULL').get(questionId);
  if (!question) return res.status(404).json({ code: 404, message: '问题不存在' });
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array()[0]?.msg || '请检查回答内容';
    return res.status(400).json({ code: 400, message: msg });
  }
  const { content } = req.body;
  try {
    await db.prepare('INSERT INTO qa_posts (user_id, title, content, is_answer, parent_id) VALUES (?, ?, ?, 1, ?)')
      .run(req.user.id, '', content.trim(), questionId);
    await logActivity(req, 'QA_ANSWER', 'qa', questionId, '回答问题');
    res.json({ code: 0, message: '回答成功' });
  } catch (e) {
    console.error('[QA] 回答失败:', e.message);
    res.status(500).json({ code: 500, message: '提交失败，请稍后重试' });
  }
}));

module.exports = router;

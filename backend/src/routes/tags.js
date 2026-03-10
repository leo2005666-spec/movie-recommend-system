/**
 * 标签管理：列表、增删改（管理员）
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// 获取标签列表（所有人）
router.get('/', asyncHandler(async (req, res) => {
  const list = await db.prepare('SELECT id, name, created_at FROM tags ORDER BY id').all();
  res.json({ code: 0, data: list });
}));

// 管理员：新增标签
router.post('/', authMiddleware, requireAdmin, [
  body('name').trim().notEmpty(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ code: 400, message: errors.array()[0].msg });
  const { name } = req.body;
  try {
    await db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
    const row = await db.prepare('SELECT id, name FROM tags WHERE name = ?').get(name);
    await logActivity(req, 'CREATE_TAG', 'tag', row.id, name);
    res.json({ code: 0, data: row });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ code: 400, message: '标签名已存在' });
    }
    throw e;
  }
}));

// 管理员：删除标签
router.delete('/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await db.prepare('DELETE FROM movie_tags WHERE tag_id = ?').run(id);
  await db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  await logActivity(req, 'DELETE_TAG', 'tag', id, '');
  res.json({ code: 0, message: '已删除' });
}));

module.exports = router;

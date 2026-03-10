/**
 * 分类管理：列表、增删改（管理员）
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// 获取分类列表（所有人）
router.get('/', asyncHandler(async (req, res) => {
  const list = await db.prepare('SELECT id, name, description, created_at FROM categories ORDER BY id').all();
  res.json({ code: 0, data: list });
}));

// 管理员：新增分类
router.post('/', authMiddleware, requireAdmin, [
  body('name').trim().notEmpty(),
  body('description').optional().trim(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ code: 400, message: errors.array()[0].msg });
  const { name, description } = req.body;
  try {
    await db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || null);
    const row = await db.prepare('SELECT id, name, description FROM categories WHERE name = ?').get(name);
    await logActivity(req, 'CREATE_CATEGORY', 'category', row.id, name);
    res.json({ code: 0, data: row });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ code: 400, message: '分类名已存在' });
    }
    throw e;
  }
}));

// 管理员：修改分类
router.put('/:id', authMiddleware, requireAdmin, [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
], asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description } = req.body;
  const updates = [];
  const values = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (updates.length) {
    values.push(id);
    await db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    await logActivity(req, 'UPDATE_CATEGORY', 'category', id, name || '');
  }
  res.json({ code: 0, message: '已更新' });
}));

// 管理员：删除分类
router.delete('/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await db.prepare('DELETE FROM movie_categories WHERE category_id = ?').run(id);
  await db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  await logActivity(req, 'DELETE_CATEGORY', 'category', id, '');
  res.json({ code: 0, message: '已删除' });
}));

module.exports = router;

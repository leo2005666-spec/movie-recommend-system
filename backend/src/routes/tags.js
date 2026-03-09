/**
 * 标签管理：列表、增删改（管理员）
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');

const router = express.Router();

// 获取标签列表（所有人）
router.get('/', (req, res) => {
  const list = db.prepare('SELECT id, name, created_at FROM tags ORDER BY id').all();
  res.json({ code: 0, data: list });
});

// 管理员：新增标签
router.post('/', authMiddleware, requireAdmin, [
  body('name').trim().notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ code: 400, message: errors.array()[0].msg });
  const { name } = req.body;
  try {
    db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
    const row = db.prepare('SELECT id, name FROM tags WHERE name = ?').get(name);
    logActivity(req, 'CREATE_TAG', 'tag', row.id, name);
    res.json({ code: 0, data: row });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ code: 400, message: '标签名已存在' });
    }
    throw e;
  }
});

// 管理员：删除标签
router.delete('/:id', authMiddleware, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  db.prepare('DELETE FROM movie_tags WHERE tag_id = ?').run(id);
  db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  logActivity(req, 'DELETE_TAG', 'tag', id, '');
  res.json({ code: 0, message: '已删除' });
});

module.exports = router;

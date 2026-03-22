/**
 * 用户信息管理：增删查改
 * 需登录
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
router.use(authMiddleware);

// 获取当前用户信息
router.get('/me', asyncHandler(async (req, res) => {
  const user = await db.prepare(
    'SELECT id, username, nickname, avatar, role, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ code: 404, message: '用户不存在' });
  res.json({ code: 0, data: user });
}));

// 获取当前用户统计（收藏、评分、评论数）
router.get('/me/stats', asyncHandler(async (req, res) => {
  const fav = await db.prepare('SELECT COUNT(*) as n FROM favorites WHERE user_id = ?').get(req.user.id);
  const rat = await db.prepare('SELECT COUNT(*) as n FROM ratings WHERE user_id = ?').get(req.user.id);
  const com = await db.prepare('SELECT COUNT(*) as n FROM comments WHERE user_id = ?').get(req.user.id);
  res.json({ code: 0, data: { favorites: fav.n, ratings: rat.n, comments: com.n } });
}));

// 修改当前用户信息（含用户名、密码）
router.put(
  '/me',
  [
    body('username').optional().trim().isLength({ min: 2, max: 20 }).withMessage('用户名2-20字符'),
    body('nickname').optional().trim().isLength({ max: 50 }),
    body('avatar').optional({ values: 'falsy' }).trim().custom((v) => {
      if (v == null || v === '') return true;
      if (String(v).length > 2048) throw new Error('头像链接过长');
      return /^https?:\/\/.+/i.test(String(v).trim());
    }).withMessage('头像需为 http(s) 开头的有效链接'),
    body('password').optional().isLength({ min: 6 }).withMessage('密码至少6位'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ code: 400, message: errors.array()[0].msg });
    }
    const { username, nickname, avatar, password } = req.body;

    if (username !== undefined && username.trim()) {
      const existing = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim(), req.user.id);
      if (existing) {
        return res.status(400).json({ code: 400, message: '该用户名已被占用' });
      }
    }

    const updates = [];
    const values = [];
    if (username !== undefined && username.trim()) { updates.push('username = ?'); values.push(username.trim()); }
    if (nickname !== undefined) { updates.push('nickname = ?'); values.push(nickname); }
    if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
    if (password) {
      updates.push('password = ?');
      values.push(bcrypt.hashSync(password, 10));
    }
    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '无有效更新' });
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.user.id);
    await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    await logActivity(req, 'UPDATE_USER', 'user', req.user.id, '修改个人信息');
    const user = await db.prepare('SELECT id, username, nickname, avatar, role FROM users WHERE id = ?').get(req.user.id);
    res.json({ code: 0, data: user });
  })
);

// 管理员：获取用户列表
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const list = await db.prepare(
    'SELECT id, username, nickname, role, created_at FROM users ORDER BY id'
  ).all();
  res.json({ code: 0, data: list });
}));

// 管理员：修改用户角色
router.patch('/:id/role', requireAdmin, [
  body('role').isIn(['user', 'admin']).withMessage('角色必须是 user 或 admin'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ code: 400, message: errors.array()[0].msg });
  const id = parseInt(req.params.id);
  const { role } = req.body;
  if (id === req.user.id && role !== 'admin') {
    return res.status(400).json({ code: 400, message: '不能将自己的角色改为普通用户' });
  }
  await db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, id);
  await logActivity(req, 'CHANGE_ROLE', 'user', id, `改为${role}`);
  res.json({ code: 0, message: '已更新' });
}));

// 管理员：删除用户
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ code: 400, message: '不能删除自己' });
  }
  const target = await db.prepare('SELECT username, role FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ code: 404, message: '用户不存在' });
  await db.prepare('DELETE FROM users WHERE id = ?').run(id);
  await logActivity(req, 'DELETE_USER', 'user', id, `删除用户 ${target.username}`);
  res.json({ code: 0, message: '已删除' });
}));

module.exports = router;

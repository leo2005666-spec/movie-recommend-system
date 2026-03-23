/**
 * 认证路由：登录、注册
 * 密码使用 bcrypt 加密存储
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { JWT_SECRET } = require('../middleware/auth');
const log = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');
const router = express.Router();

// 注册（用户名+密码即可，无邮箱）
router.post(
  '/register',
  [
    body('username').trim().notEmpty().withMessage('请输入用户名').isLength({ min: 2, max: 20 }).withMessage('用户名2-20字符'),
    body('password').notEmpty().withMessage('请输入密码').isLength({ min: 6 }).withMessage('密码至少6位'),
    body('nickname').optional().trim(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.array()[0]?.msg || '参数错误';
      return res.status(400).json({ code: 400, message: msg });
    }
    const username = (req.body.username || '').trim();
    const password = req.body.password;
    const nickname = (req.body.nickname || '').trim() || username;
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }
    const hash = bcrypt.hashSync(password, 10);
    try {
      await db.prepare(
        'INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)'
      ).run(username, hash, nickname, 'user');
      const user = await db.prepare(
        'SELECT id, username, nickname, email, avatar, role FROM users WHERE username = ?'
      ).get(username);
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ code: 0, data: { user, token } });
    } catch (e) {
      const isUnique = e.code === 'SQLITE_CONSTRAINT_UNIQUE' || (e.message && /unique|UNIQUE/i.test(e.message));
      if (isUnique) {
        return res.status(400).json({ code: 400, message: '用户名已存在' });
      }
      console.error('[Auth] 注册失败:', e);
      const msg = e.message || '注册失败，请稍后重试';
      res.status(500).json({ code: 500, message: msg });
    }
  })
);

// 登录
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('请输入用户名'),
    body('password').notEmpty().withMessage('请输入密码'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ code: 400, message: errors.array()[0].msg });
    }
    const { username, password } = req.body;
    const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    await log.logActivity(req, 'LOGIN', 'user', user.id, '用户登录');
    res.json({ code: 0, data: { user: safeUser, token } });
  })
);

module.exports = router;

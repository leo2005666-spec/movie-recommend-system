/**
 * 用户信息管理：增删查改
 * 需登录
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');
const { stripUserForClient } = require('../utils/userPublic');

/** 头像写入数据库（base64 data URL），避免 Render 等 ephemeral 磁盘导致「上传后丢失」 */
const AVATAR_MAX_BYTES = 600 * 1024;

const avatarsDir = path.join(__dirname, '../../uploads/avatars');
fs.mkdirSync(avatarsDir, { recursive: true });

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('仅支持 jpg、png、gif、webp 图片，单张不超过 600KB'));
  },
});

const router = express.Router();
router.use(authMiddleware);

/** 本地上传头像：POST multipart，字段名 avatar */
router.post(
  '/me/avatar',
  (req, res, next) => {
    uploadAvatar.single('avatar')(req, res, (err) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? '图片不能超过 600KB，请压缩后重试' : (err.message || '上传失败');
        return res.status(400).json({ code: 400, message: msg });
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ code: 400, message: '请选择图片文件' });
    }
    const buf = req.file.buffer;
    const mime = req.file.mimetype || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;

    const row = await db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user.id);
    const prev = row?.avatar;
    if (prev && String(prev).startsWith('/uploads/avatars/')) {
      const oldAbs = path.join(__dirname, '../../', String(prev).replace(/^\//, ''));
      try {
        fs.unlinkSync(oldAbs);
      } catch (_) {
        /* 忽略旧文件删除失败 */
      }
    }
    await db.prepare(
      'UPDATE users SET avatar = NULL, avatar_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(dataUrl, req.user.id);
    try {
      db.save();
    } catch (_) {
      /* sql.js 定期也会 save，此处尽力立即落盘 */
    }
    await logActivity(req, 'UPDATE_USER', 'user', req.user.id, '上传头像');
    const raw = await db.prepare(
      'SELECT id, username, email, avatar, avatar_data, avatar_style, role, updated_at FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json({ code: 0, data: stripUserForClient(raw) });
  })
);

// 获取当前用户信息（展示名即用户名）
router.get('/me', asyncHandler(async (req, res) => {
  const user = await db.prepare(
    'SELECT id, username, email, avatar, avatar_data, avatar_style, role, created_at, updated_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ code: 404, message: '用户不存在' });
  res.json({ code: 0, data: stripUserForClient(user) });
}));

// 获取当前用户统计（收藏、评分、评论数）
router.get('/me/stats', asyncHandler(async (req, res) => {
  const fav = await db.prepare('SELECT COUNT(*) as n FROM favorites WHERE user_id = ?').get(req.user.id);
  const rat = await db.prepare('SELECT COUNT(*) as n FROM ratings WHERE user_id = ?').get(req.user.id);
  const com = await db.prepare('SELECT COUNT(*) as n FROM comments WHERE user_id = ?').get(req.user.id);
  res.json({ code: 0, data: { favorites: fav.n, ratings: rat.n, comments: com.n } });
}));

/** 我的评分影片列表（含分数、时间） */
router.get('/me/ratings', asyncHandler(async (req, res) => {
  const list = await db.prepare(`
    SELECT r.id, r.movie_id, r.score, r.created_at,
           m.title, m.cover, m.release_year, m.release_date
    FROM ratings r
    INNER JOIN movies m ON r.movie_id = m.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);
  res.json({ code: 0, data: list });
}));

/** 我的影评列表（含影片、正文、时间） */
router.get('/me/comments', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const rows = await db.prepare(`
    SELECT c.id, c.movie_id, c.content, c.created_at, c.images,
           m.title, m.cover, m.release_year
    FROM comments c
    INNER JOIN movies m ON c.movie_id = m.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);

  const list = rows.map((row) => {
    let images = [];
    if (row.images) {
      try {
        const p = JSON.parse(row.images);
        if (Array.isArray(p)) {
          images = p.filter((x) => typeof x === 'string' && /^data:image\//i.test(x));
        }
      } catch (_) {
        /* ignore */
      }
    }
    const { images: _raw, ...rest } = row;
    return { ...rest, images };
  });

  const total = (await db.prepare('SELECT COUNT(*) as n FROM comments WHERE user_id = ?').get(req.user.id)).n;
  res.json({ code: 0, data: { list, total, page, limit } });
}));

// 修改当前用户信息（用户名、邮箱、密码；头像仅通过 POST /me/avatar 上传）
router.put(
  '/me',
  [
    body('username').optional().trim().isLength({ min: 2, max: 20 }).withMessage('用户名2-20字符'),
    body('email').optional().trim().custom((v) => {
      if (v == null || v === '') return true;
      const s = String(v).trim();
      if (s.length > 120) throw new Error('邮箱过长');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error('邮箱格式不正确');
      return true;
    }),
    body('password').optional().isLength({ min: 6 }).withMessage('密码至少6位'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ code: 400, message: errors.array()[0].msg });
    }
    const { username, email, password } = req.body;

    if (username !== undefined && username.trim()) {
      const existing = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim(), req.user.id);
      if (existing) {
        return res.status(400).json({ code: 400, message: '该用户名已被占用' });
      }
    }

    const updates = [];
    const values = [];
    if (username !== undefined && username.trim()) {
      const u = username.trim();
      updates.push('username = ?');
      values.push(u);
      updates.push('nickname = ?');
      values.push(u);
    }
    if (email !== undefined) { updates.push('email = ?'); values.push(email === '' ? null : String(email).trim()); }
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
    const raw = await db.prepare(
      'SELECT id, username, email, avatar, avatar_data, avatar_style, role, updated_at FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json({ code: 0, data: stripUserForClient(raw) });
  })
);

// 管理员：获取用户列表
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const list = await db.prepare(`
    SELECT id, username, role, created_at FROM users
    ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, datetime(created_at) ASC
  `).all();
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

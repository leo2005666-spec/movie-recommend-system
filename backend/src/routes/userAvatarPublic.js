/**
 * 公开读取用户头像：优先数据库内联图（持久化），否则本地 /uploads 文件
 * GET /api/users/:id/avatar
 */
const path = require('path');
const fs = require('fs');
const db = require('../db/db');
const { asyncHandler } = require('../utils/asyncHandler');

module.exports = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id) || id < 1) {
    return res.status(400).end();
  }
  const row = await db.prepare('SELECT id, avatar, avatar_data FROM users WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).end();
  }

  const raw = row.avatar_data != null ? String(row.avatar_data) : '';
  if (raw.length > 0) {
    const m = raw.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (m) {
      const buf = Buffer.from(m[2], 'base64');
      res.setHeader('Content-Type', m[1].split(';')[0].trim() || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buf);
    }
  }

  const av = row.avatar && String(row.avatar).trim();
  if (av && av.startsWith('/uploads/')) {
    const abs = path.join(__dirname, '../../', av.replace(/^\//, ''));
    if (fs.existsSync(abs)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(abs);
    }
  }

  res.status(404).end();
});

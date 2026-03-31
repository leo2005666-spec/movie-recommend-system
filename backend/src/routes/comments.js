/**
 * 评论功能：用户对影视作品进行简要评价（可选配图，Base64 存库与头像一致，避免无盘环境丢失）
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');
const { mapCommentUserAvatar } = require('../utils/userPublic');

const router = express.Router();

const DATA_IMG_RE = /^data:image\/(jpeg|png|gif|webp);base64,/i;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 450 * 1024;

function parseStoredImages(imagesCell) {
  if (imagesCell == null || String(imagesCell).trim() === '') return [];
  try {
    const p = JSON.parse(imagesCell);
    if (!Array.isArray(p)) return [];
    return p.filter((x) => typeof x === 'string' && DATA_IMG_RE.test(x));
  } catch {
    return [];
  }
}

function normalizeCommentRow(row) {
  if (!row) return row;
  const { images: raw, ...rest } = row;
  return { ...rest, images: parseStoredImages(raw) };
}

function validateCommentImagesPayload(raw) {
  if (raw == null || raw === undefined) return [];
  if (!Array.isArray(raw)) {
    const err = new Error('配图须为数组');
    err.status = 400;
    throw err;
  }
  if (raw.length > MAX_IMAGES) {
    const err = new Error(`最多上传 ${MAX_IMAGES} 张配图`);
    err.status = 400;
    throw err;
  }
  const out = [];
  for (const s of raw) {
    if (typeof s !== 'string' || !DATA_IMG_RE.test(s)) {
      const err = new Error('配图仅支持 jpg、png、gif、webp 的 Base64 数据');
      err.status = 400;
      throw err;
    }
    const parts = s.split(',');
    const b64 = parts[1];
    if (!b64) {
      const err = new Error('配图数据无效');
      err.status = 400;
      throw err;
    }
    const approx = (b64.length * 3) / 4;
    if (approx > MAX_IMAGE_BYTES) {
      const err = new Error('单张配图须小于 450KB，请压缩后重试');
      err.status = 400;
      throw err;
    }
    out.push(s);
  }
  return out;
}

/** 热门影评：最新发表的评论，跨作品，带电影信息 */
router.get('/hot', optionalAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(5, parseInt(req.query.limit) || 8));
  const rows = await db.prepare(`
    SELECT c.id, c.user_id, u.username, u.avatar, u.avatar_data, u.avatar_style,
           u.updated_at AS user_updated_at,
           c.content, c.created_at, c.images, c.movie_id,
           m.title as movie_title
    FROM comments c
    INNER JOIN users u ON c.user_id = u.id
    INNER JOIN movies m ON c.movie_id = m.id
    ORDER BY c.id DESC
    LIMIT ?
  `).all(limit);
  const list = rows.map((r) => normalizeCommentRow(mapCommentUserAvatar(r)));
  res.json({ code: 0, data: list });
}));

// 获取某作品的评论列表
router.get('/movie/:movieId', optionalAuth, asyncHandler(async (req, res) => {
  const movieId = parseInt(req.params.movieId);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  const rows = await db.prepare(`
    SELECT c.id, c.user_id, u.username, u.avatar, u.avatar_data, u.avatar_style,
           u.updated_at AS user_updated_at,
           c.content, c.created_at, c.images,
           r.score AS rating_score
    FROM comments c
    INNER JOIN users u ON c.user_id = u.id
    LEFT JOIN ratings r ON r.user_id = c.user_id AND r.movie_id = c.movie_id
    WHERE c.movie_id = ?
    ORDER BY c.id DESC LIMIT ? OFFSET ?
  `).all(movieId, limit, offset);

  const list = rows.map((r) => normalizeCommentRow(mapCommentUserAvatar(r)));
  const total = (await db.prepare('SELECT COUNT(*) as n FROM comments WHERE movie_id = ?').get(movieId)).n;
  res.json({ code: 0, data: { list, total, page, limit } });
}));

// 发表评论（需登录）；images 可选，为 data:image/*;base64,... 数组
router.post('/', authMiddleware, [
  body('movieId').isInt(),
  body('content').trim().isLength({ min: 1, max: 2000 }),
  body('images').optional(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ code: 400, message: '评论1-2000字' });
  const { movieId, content, images: rawImages } = req.body;
  let imageArr;
  try {
    imageArr = validateCommentImagesPayload(rawImages);
  } catch (e) {
    return res.status(e.status || 400).json({ code: e.status || 400, message: e.message || '配图无效' });
  }

  const movie = await db.prepare('SELECT id, title FROM movies WHERE id = ?').get(movieId);
  if (!movie) return res.status(404).json({ code: 404, message: '作品不存在' });

  const imagesJson = imageArr.length > 0 ? JSON.stringify(imageArr) : null;
  await db.prepare('INSERT INTO comments (user_id, movie_id, content, images) VALUES (?, ?, ?, ?)').run(
    req.user.id,
    movieId,
    content,
    imagesJson
  );
  const row = await db.prepare('SELECT last_insert_rowid() as id').get();
  await logActivity(req, 'COMMENT', 'movie', movieId, content.slice(0, 50));
  res.json({ code: 0, data: { id: row.id }, message: '评论成功' });
}));

// 删除自己的评论
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const comment = await db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  if (!comment) return res.status(404).json({ code: 404, message: '评论不存在' });
  if (comment.user_id !== req.user.id) {
    return res.status(403).json({ code: 403, message: '只能删除自己的评论' });
  }
  await db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  await logActivity(req, 'DELETE_COMMENT', 'comment', id, '');
  res.json({ code: 0, message: '已删除' });
}));

module.exports = router;

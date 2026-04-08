const express = require('express');
const db = require('../db/db');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { logActivity } = require('../middleware/log');

const router = express.Router();
router.use(authMiddleware);

const ALLOWED = new Set(['playlist', 'watchlist']);

function normalizeType(raw) {
  const t = String(raw || '').trim().toLowerCase();
  return ALLOWED.has(t) ? t : '';
}

router.get('/status/:movieId', asyncHandler(async (req, res) => {
  const movieId = parseInt(req.params.movieId, 10);
  if (!Number.isFinite(movieId) || movieId < 1) {
    return res.status(400).json({ code: 400, message: '无效 movieId' });
  }
  const rows = await db
    .prepare('SELECT shelf_type FROM user_movie_shelves WHERE user_id = ? AND movie_id = ?')
    .all(req.user.id, movieId);
  const types = new Set((Array.isArray(rows) ? rows : []).map((r) => r.shelf_type));
  res.json({
    code: 0,
    data: {
      playlist: types.has('playlist'),
      watchlist: types.has('watchlist'),
    },
  });
}));

router.get('/:type', asyncHandler(async (req, res) => {
  const type = normalizeType(req.params.type);
  if (!type) return res.status(400).json({ code: 400, message: '无效 type' });
  const list = await db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year, s.created_at as added_at
    FROM user_movie_shelves s
    INNER JOIN movies m ON m.id = s.movie_id
    WHERE s.user_id = ? AND s.shelf_type = ?
    ORDER BY s.created_at DESC
  `).all(req.user.id, type);
  res.json({ code: 0, data: Array.isArray(list) ? list : [] });
}));

router.post('/:type', asyncHandler(async (req, res) => {
  const type = normalizeType(req.params.type);
  if (!type) return res.status(400).json({ code: 400, message: '无效 type' });
  const movieId = parseInt(req.body?.movieId, 10);
  if (!Number.isFinite(movieId) || movieId < 1) return res.status(400).json({ code: 400, message: '缺少 movieId' });
  const movie = await db.prepare('SELECT id, title FROM movies WHERE id = ?').get(movieId);
  if (!movie) return res.status(404).json({ code: 404, message: '作品不存在' });
  try {
    await db
      .prepare('INSERT INTO user_movie_shelves (user_id, movie_id, shelf_type) VALUES (?, ?, ?)')
      .run(req.user.id, movieId, type);
  } catch (e) {
    if (!/unique|constraint/i.test(String(e?.message || ''))) throw e;
  }
  await logActivity(req, type === 'playlist' ? 'ADD_PLAYLIST' : 'ADD_WATCHLIST', 'movie', movieId, movie.title);
  res.json({ code: 0, message: '已添加' });
}));

router.delete('/:type/:movieId', asyncHandler(async (req, res) => {
  const type = normalizeType(req.params.type);
  if (!type) return res.status(400).json({ code: 400, message: '无效 type' });
  const movieId = parseInt(req.params.movieId, 10);
  if (!Number.isFinite(movieId) || movieId < 1) return res.status(400).json({ code: 400, message: '无效 movieId' });
  await db
    .prepare('DELETE FROM user_movie_shelves WHERE user_id = ? AND movie_id = ? AND shelf_type = ?')
    .run(req.user.id, movieId, type);
  await logActivity(req, type === 'playlist' ? 'REMOVE_PLAYLIST' : 'REMOVE_WATCHLIST', 'movie', movieId, '移除');
  res.json({ code: 0, message: '已移除' });
}));

module.exports = router;

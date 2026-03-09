/**
 * 评分功能：用户对影视作品评分，作为推荐反馈
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');

const router = express.Router();
router.use(authMiddleware);

// 提交/更新评分
router.post('/', [
  body('movieId').isInt().withMessage('movieId 需为整数'),
  body('score').custom((val) => {
    const n = Number(val);
    if (isNaN(n) || n < 0.5 || n > 5) return false;
    return true;
  }).withMessage('评分需 0.5-5 分'),
], (req, res) => {
  console.log('[ratings] POST 收到 movieId=%s score=%s userId=%s', req.body?.movieId, req.body?.score, req.user?.id);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array()[0]?.msg || '参数错误';
    return res.status(400).json({ code: 400, message: msg });
  }
  const movieId = parseInt(req.body.movieId);
  const score = parseFloat(req.body.score);
  const movie = db.prepare('SELECT id, title FROM movies WHERE id = ?').get(movieId);
  if (!movie) return res.status(404).json({ code: 404, message: '作品不存在' });

  try {
    const existing = db.prepare('SELECT id FROM ratings WHERE user_id = ? AND movie_id = ?')
      .get(req.user.id, movieId);
    if (existing) {
      db.prepare('UPDATE ratings SET score = ? WHERE user_id = ? AND movie_id = ?')
        .run(score, req.user.id, movieId);
    } else {
      db.prepare('INSERT INTO ratings (user_id, movie_id, score) VALUES (?, ?, ?)')
        .run(req.user.id, movieId, score);
    }
  } catch (e) {
    console.error('[ratings] 提交失败:', e.message);
    return res.status(500).json({ code: 500, message: '评分保存失败，请稍后重试' });
  }

  logActivity(req, 'RATE', 'movie', movieId, `评分${score} - ${movie.title}`);
  console.log('[ratings] 评分成功 userId=%d movieId=%d score=%s', req.user.id, movieId, score);
  res.json({ code: 0, message: '评分成功' });
});

// 获取用户对某作品的评分
router.get('/movie/:movieId', (req, res) => {
  const movieId = parseInt(req.params.movieId);
  const r = db.prepare('SELECT score FROM ratings WHERE user_id = ? AND movie_id = ?')
    .get(req.user.id, movieId);
  res.json({ code: 0, data: r ? { score: r.score } : null });
});

// 删除评分
router.delete('/movie/:movieId', (req, res) => {
  const movieId = parseInt(req.params.movieId);
  db.prepare('DELETE FROM ratings WHERE user_id = ? AND movie_id = ?').run(req.user.id, movieId);
  logActivity(req, 'UNRATE', 'movie', movieId, '取消评分');
  res.json({ code: 0, message: '已取消' });
});

module.exports = router;

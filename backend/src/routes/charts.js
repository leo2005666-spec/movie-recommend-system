/**
 * 榜单：一周口碑榜、高分榜、热门榜
 * 参考豆瓣电影榜单展示形式，数据来源于本平台用户评分
 */
const express = require('express');
const db = require('../db/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * 一周口碑榜：过去 7 天内有评分的电影，按 (平均分 × 评分人数^0.5) 排序
 */
function getWeeklyTop(limit = 10) {
  const rows = db.prepare(`
    SELECT m.id, m.title, m.cover, m.release_year,
           AVG(r.score) as avg_score,
           COUNT(*) as cnt
    FROM ratings r
    INNER JOIN movies m ON r.movie_id = m.id
    WHERE r.created_at >= datetime('now', '-7 days')
    GROUP BY r.movie_id
    HAVING cnt >= 1
    ORDER BY avg_score * (cnt * 1.0) DESC, cnt DESC
    LIMIT ?
  `).all(limit);
  return rows.map((r, i) => ({ rank: i + 1, ...r, avg_score: Math.round(r.avg_score * 10) / 10 }));
}

/**
 * 高分榜：历史总评最高，评分人数不少于 1
 */
function getTopRated(limit = 10) {
  const rows = db.prepare(`
    SELECT m.id, m.title, m.cover, m.release_year,
           AVG(r.score) as avg_score,
           COUNT(*) as cnt
    FROM ratings r
    INNER JOIN movies m ON r.movie_id = m.id
    GROUP BY r.movie_id
    HAVING cnt >= 1
    ORDER BY avg_score DESC, cnt DESC
    LIMIT ?
  `).all(limit);
  return rows.map((r, i) => ({ rank: i + 1, ...r, avg_score: Math.round(r.avg_score * 10) / 10 }));
}

/**
 * 热门榜：评分人数最多
 */
function getHotList(limit = 10) {
  const rows = db.prepare(`
    SELECT m.id, m.title, m.cover, m.release_year,
           AVG(r.score) as avg_score,
           COUNT(*) as cnt
    FROM ratings r
    INNER JOIN movies m ON r.movie_id = m.id
    GROUP BY r.movie_id
    ORDER BY cnt DESC, avg_score DESC
    LIMIT ?
  `).all(limit);
  return rows.map((r, i) => ({ rank: i + 1, ...r, avg_score: r.avg_score ? Math.round(r.avg_score * 10) / 10 : null }));
}

/** 获取榜单 */
router.get('/', optionalAuth, (req, res) => {
  const type = (req.query.type || 'weekly').toLowerCase();
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 10));

  let data;
  if (type === 'top') {
    data = getTopRated(limit);
  } else if (type === 'hot') {
    data = getHotList(limit);
  } else {
    data = getWeeklyTop(limit);
  }
  res.json({ code: 0, data: { type, list: data } });
});

/** 获取全部榜单（供首页/榜单页一次拉取） */
router.get('/all', optionalAuth, (req, res) => {
  const limit = Math.min(20, Math.max(5, parseInt(req.query.limit) || 10));
  res.json({
    code: 0,
    data: {
      weekly: getWeeklyTop(limit),
      top: getTopRated(limit),
      hot: getHotList(limit),
    },
  });
});

module.exports = router;

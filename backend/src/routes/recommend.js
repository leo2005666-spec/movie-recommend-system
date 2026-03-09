/**
 * 个性化推荐：基于用户行为动态生成推荐列表
 * 算法：基于用户评分、收藏、分类偏好，结合内容相似度
 * 支持人群口味（学生党、上班族、家庭、情侣、影迷）的快捷推荐
 * 支持根据性别、年龄画像进行冷启动推荐
 */
const express = require('express');
const db = require('../db/db');
const { optionalAuth } = require('../middleware/auth');
const { TASTE_PRESETS, getIdsByNames } = require('../utils/taste-presets');
const { getColdStartRecommendations, getPopularRecommendations: getPop } = require('../services/recommendFallback');

const router = express.Router();

function getIds(table, names) {
  return getIdsByNames(db, table, names);
}

/**
 * 按人群口味推荐：匹配预设分类/标签的电影，按热门度排序
 */
function getTasteRecommendations(tasteType, limit = 24) {
  const preset = TASTE_PRESETS[tasteType];
  if (!preset) return getPop(limit);

  const categoryIds = getIds('categories', preset.categoryNames);
  const tagIds = getIds('tags', preset.tagNames);

  const seen = new Set();
  const result = [];

  // 按分类推荐
  for (const cid of categoryIds) {
    const movies = db.prepare(`
      SELECT m.id, m.title, m.cover, m.description, m.release_year
      FROM movies m
      INNER JOIN movie_categories mc ON m.id = mc.movie_id AND mc.category_id = ?
      ORDER BY m.id DESC LIMIT ?
    `).all(cid, Math.ceil(limit / 2));
    for (const m of movies) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        result.push(m);
        if (result.length >= limit) return result;
      }
    }
  }

  // 按标签推荐
  for (const tid of tagIds) {
    const movies = db.prepare(`
      SELECT m.id, m.title, m.cover, m.description, m.release_year
      FROM movies m
      INNER JOIN movie_tags mt ON m.id = mt.movie_id AND mt.tag_id = ?
      ORDER BY m.id DESC LIMIT ?
    `).all(tid, Math.ceil(limit / 2));
    for (const m of movies) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        result.push(m);
        if (result.length >= limit) return result;
      }
    }
  }

  // 不足时用热门补足
  const popular = getPop(limit);
  for (const m of popular) {
    if (!seen.has(m.id) && result.length < limit) result.push(m);
  }
  return result;
}

/** 埋点：曝光/点击/收藏 (scene, movieId, eventType) */
router.post('/events', optionalAuth, (req, res) => {
  const { scene, movieId, eventType } = req.body || {};
  if (!scene || !movieId || !eventType) {
    return res.status(400).json({ code: 400, message: '缺少 scene/movieId/eventType' });
  }
  const validTypes = ['exposure', 'click', 'favorite'];
  if (!validTypes.includes(eventType)) {
    return res.status(400).json({ code: 400, message: 'eventType 需为 exposure|click|favorite' });
  }
  try {
    const db = require('../db/db');
    db.prepare(`
      INSERT INTO recommend_events (user_id, scene, movie_id, event_type)
      VALUES (?, ?, ?, ?)
    `).run(req.user?.id ?? null, String(scene), parseInt(movieId), eventType);
    res.json({ code: 0 });
  } catch (e) {
    if (e.message && e.message.includes('no such table')) {
      res.json({ code: 0 }); // 表未迁移时静默忽略
    } else {
      res.status(500).json({ code: 500, message: e.message });
    }
  }
});

/** 获取人群口味预设列表（供前端展示快捷标签） */
router.get('/tastes', (req, res) => {
  const list = Object.entries(TASTE_PRESETS).map(([key, v]) => ({ key, label: v.label, desc: v.desc }));
  res.json({ code: 0, data: list });
});

/** 获取推荐列表：支持 tasteType 人群口味、limit 控制数量 */
router.get('/', optionalAuth, (req, res) => {
  const limit = Math.min(80, Math.max(6, parseInt(req.query.limit) || 36));
  const tasteType = (req.query.tasteType || '').trim();
  let list;

  if (tasteType && TASTE_PRESETS[tasteType]) {
    list = getTasteRecommendations(tasteType, limit);
  } else if (req.user) {
    list = getColdStartRecommendations(req.user.id, limit);
  } else {
    list = getPop(limit);
  }
  res.json({ code: 0, data: list });
});

module.exports = router;

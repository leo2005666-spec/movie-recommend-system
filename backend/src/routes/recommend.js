/**
 * 个性化推荐：基于用户行为动态生成推荐列表
 * 算法：基于用户评分、收藏、分类偏好，结合内容相似度
 * 支持人群口味（学生党、上班族、家庭、情侣、影迷）的快捷推荐
 * 支持根据性别、年龄画像进行冷启动推荐
 */
const express = require('express');
const db = require('../db/db');
const { optionalAuth } = require('../middleware/auth');
const { TASTE_PRESETS, buildTasteWhereSql, TASTE_ORDER_BY } = require('../utils/taste-presets');
const { getColdStartRecommendations, getPopularRecommendations: getPop } = require('../services/recommendFallback');
const { asyncHandler } = require('../utils/asyncHandler');
const { LANG_FILTER } = require('../utils/recommendUtils');

const router = express.Router();
const HIDDEN_TASTE_KEYS = new Set(['couple', 'buff']);

/**
 * 按人群口味推荐：与影视库相同条件（分类∩标签）+ 偏经典/高分的排序，与「仅按 id 新」区分
 */
async function getTasteRecommendations(tasteType, limit = 24) {
  if (!TASTE_PRESETS[tasteType]) {
    const pop = await getPop(limit);
    return pop.map((m) => ({ ...m, recommendReason: '热门推荐' }));
  }
  const tw = await buildTasteWhereSql(db, tasteType);
  if (!tw) {
    const pop = await getPop(limit);
    return pop.map((m) => ({ ...m, recommendReason: '热门推荐' }));
  }
  const preset = TASTE_PRESETS[tasteType];
  const reasonTag = `${preset.label}·精选`;
  const rows = await db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration, m.tmdb_vote_count, m.tmdb_rating
    FROM movies m
    WHERE ${tw.sql} AND ${LANG_FILTER}
    ORDER BY ${TASTE_ORDER_BY}
    LIMIT ?
  `).all(...tw.params, limit);
  const out = rows.map((m) => ({ ...m, recommendReason: reasonTag }));
  if (out.length >= Math.min(12, limit)) return out;
  const seen = new Set(out.map((r) => r.id));
  const popular = await getPop(limit);
  for (const m of popular) {
    if (!seen.has(m.id) && out.length < limit) {
      seen.add(m.id);
      out.push({ ...m, recommendReason: '热门推荐' });
    }
  }
  return out;
}

/** 埋点：曝光/点击/收藏 (scene, movieId, eventType) */
router.post('/events', optionalAuth, asyncHandler(async (req, res) => {
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
    await db.prepare(`
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
}));

/** 获取人群口味预设列表（供前端展示快捷标签） */
router.get('/tastes', asyncHandler(async (req, res) => {
  const list = Object.entries(TASTE_PRESETS)
    .filter(([key]) => !HIDDEN_TASTE_KEYS.has(key))
    .map(([key, v]) => ({ key, label: v.label, desc: v.desc }));
  res.json({ code: 0, data: list });
}));

/** 获取推荐列表：支持 tasteType 人群口味、limit 控制数量 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(80, Math.max(6, parseInt(req.query.limit) || 36));
  const tasteType = (req.query.tasteType || '').trim();
  /** 首页轮播等场景固定要「大众热门」时传 prefer=popular（不按登录态走冷启动） */
  const preferPopular = (req.query.prefer || '').trim().toLowerCase() === 'popular';
  let list;

  if (preferPopular) {
    list = (await getPop(limit)).map((m) => ({ ...m, recommendReason: '热门推荐' }));
  } else if (tasteType && TASTE_PRESETS[tasteType]) {
    list = await getTasteRecommendations(tasteType, limit);
  } else if (req.user) {
    list = (await getColdStartRecommendations(req.user.id, limit)).map((m) => ({
      ...m,
      recommendReason: '猜你喜欢',
    }));
  } else {
    list = (await getPop(limit)).map((m) => ({ ...m, recommendReason: '热门推荐' }));
  }
  res.json({ code: 0, data: list });
}));

module.exports = router;

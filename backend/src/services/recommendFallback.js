/**
 * 推荐 Fallback：原有个性化/热门逻辑，供 CF 冷启动或结果为空时使用
 *
 * 语言过滤：仅推荐英文(en)和中文(zh)电影，排除印度/日韩/其他语种
 * 每日刷新：基于日期种子的伪随机排序，同一用户不同天访问看到不同推荐
 */
const db = require('../db/db');
const { LANG_FILTER, dailySeed, seededRandom, dailyRandomOrder } = require('../utils/recommendUtils');

async function getPersonalizedRecommendations(userId, limit = 12) {
  const seed = dailySeed();
  const randOrder = dailyRandomOrder(seed);
  const seen = new Set();
  const result = [];
  const interestRows = await db.prepare(`
    SELECT movie_id FROM ratings WHERE user_id = ? AND score >= 4
    UNION
    SELECT movie_id FROM favorites WHERE user_id = ?
    UNION
    SELECT movie_id FROM user_movie_shelves WHERE user_id = ?
    UNION
    SELECT movie_id FROM recommend_events WHERE user_id = ? AND event_type IN ('click','favorite')
    ORDER BY movie_id DESC
    LIMIT 80
  `).all(userId, userId, userId, userId);
  const interestIds = (Array.isArray(interestRows) ? interestRows : [])
    .map((r) => Number(r.movie_id))
    .filter((n) => Number.isFinite(n) && n > 0);
  interestIds.forEach((id) => seen.add(id));

  const placeholders = interestIds.length ? interestIds.map(() => '?').join(',') : '';
  const likedCategories = interestIds.length
    ? await db.prepare(`
      SELECT mc.category_id, COUNT(*) as hit_cnt
      FROM movie_categories mc
      WHERE mc.movie_id IN (${placeholders})
      GROUP BY mc.category_id
      ORDER BY hit_cnt DESC, mc.category_id ASC
      LIMIT 4
    `).all(...interestIds)
    : [];

  const likedTags = interestIds.length
    ? await db.prepare(`
      SELECT mt.tag_id, COUNT(*) as hit_cnt
      FROM movie_tags mt
      WHERE mt.movie_id IN (${placeholders})
      GROUP BY mt.tag_id
      ORDER BY hit_cnt DESC, mt.tag_id ASC
      LIMIT 4
    `).all(...interestIds)
    : [];

  // 每日随机调整类别/tag 优先级，让不同天推不同内容
  const shuffledCats = [...likedCategories].sort((a, b) => seededRandom(a.category_id, seed) - seededRandom(b.category_id, seed));
  const shuffledTags = [...likedTags].sort((a, b) => seededRandom(a.tag_id, seed) - seededRandom(b.tag_id, seed));

  const perSource = Math.ceil(limit / 3);
  for (const { category_id } of shuffledCats) {
    const movies = await db.prepare(`
      SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration
      FROM movies m
      INNER JOIN movie_categories mc ON m.id = mc.movie_id AND mc.category_id = ?
      WHERE m.id NOT IN (SELECT movie_id FROM ratings WHERE user_id = ?)
        AND ${LANG_FILTER}
      ORDER BY ${randOrder} LIMIT ?
    `).all(category_id, userId, perSource);
    for (const m of movies) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        result.push(m);
        if (result.length >= limit) return result;
      }
    }
  }

  for (const { tag_id } of shuffledTags) {
    const movies = await db.prepare(`
      SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration
      FROM movies m
      INNER JOIN movie_tags mt ON m.id = mt.movie_id AND mt.tag_id = ?
      WHERE m.id NOT IN (SELECT movie_id FROM ratings WHERE user_id = ?)
        AND ${LANG_FILTER}
      ORDER BY ${randOrder} LIMIT ?
    `).all(tag_id, userId, perSource);
    for (const m of movies) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        result.push(m);
        if (result.length >= limit) return result;
      }
    }
  }

  const popular = await db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration
    FROM movies m
    LEFT JOIN (SELECT movie_id, AVG(score) as avg_score, COUNT(*) as cnt FROM ratings GROUP BY movie_id) r ON m.id = r.movie_id
    WHERE m.id NOT IN (SELECT movie_id FROM ratings WHERE user_id = ?)
      AND ${LANG_FILTER}
    ORDER BY ${randOrder}
    LIMIT ?
  `).all(userId, limit - result.length);

  for (const m of popular) {
    if (!seen.has(m.id) && result.length < limit) result.push(m);
  }
  return result;
}

/**
 * 冷启动推荐：优先画像推荐，再个性化，最后热门
 */
async function getColdStartRecommendations(userId, limit = 12) {
  return getPersonalizedRecommendations(userId, limit);
}

async function getPopularRecommendations(limit = 12) {
  const seed = dailySeed();
  // 每日抖动参数：让同一天内排序稳定，不同天的排序有变化
  const jitterA = (seed * 9301 + 49297) % 10007;
  const jitterB = (seed * 49297 + 233280) % 10007;
  // 综合热度排序：TMDB 投票数(对数平滑) + 新片加权 + 评分 + 每日抖动
  // 这样热门电影和新片优先展示，老片和小众片排后，同时每天仍有微调
  return await db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration, m.tmdb_vote_count, m.tmdb_rating
    FROM movies m
    WHERE ${LANG_FILTER}
    ORDER BY (
      (COALESCE(m.tmdb_vote_count, 0) * 1.0 / (COALESCE(m.tmdb_vote_count, 0) + 5000.0)) * 5.0
      + (m.release_year - 2000) * 0.35
      + (m.tmdb_rating * 0.6)
      + ((m.id * ${jitterA} + ${jitterB}) % 10007) / 10007.0 * 1.2
    ) DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  getPersonalizedRecommendations,
  getPopularRecommendations,
  getColdStartRecommendations,
};

/**
 * 推荐 Fallback：原有个性化/热门逻辑，供 CF 冷启动或结果为空时使用
 * 新增：根据用户性别、年龄等画像进行 demographic 推荐
 *
 * 「热门」排序与 TMDB 一致：优先投票数、再评分、再年份，避免仅按 id 新排到冷门老片
 */
const db = require('../db/db');

const ORDER_BY_TMDB_POPULAR = `
  COALESCE(m.tmdb_vote_count, 0) DESC,
  COALESCE(m.tmdb_rating, 0) DESC,
  COALESCE(m.release_year, 0) DESC,
  m.id DESC
`;

/**
 * 根据用户画像推荐（已移除性别、年龄，直接走个性化/热门）
 */
function getDemographicRecommendations(userId, limit = 12) {
  return null;
}

async function getPersonalizedRecommendations(userId, limit = 12) {
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

  const perSource = Math.ceil(limit / 3);
  for (const { category_id } of likedCategories) {
    const movies = await db.prepare(`
      SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration
      FROM movies m
      INNER JOIN movie_categories mc ON m.id = mc.movie_id AND mc.category_id = ?
      WHERE m.id NOT IN (SELECT movie_id FROM ratings WHERE user_id = ?)
      ORDER BY ${ORDER_BY_TMDB_POPULAR} LIMIT ?
    `).all(category_id, userId, perSource);
    for (const m of movies) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        result.push(m);
        if (result.length >= limit) return result;
      }
    }
  }

  for (const { tag_id } of likedTags) {
    const movies = await db.prepare(`
      SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration
      FROM movies m
      INNER JOIN movie_tags mt ON m.id = mt.movie_id AND mt.tag_id = ?
      WHERE m.id NOT IN (SELECT movie_id FROM ratings WHERE user_id = ?)
      ORDER BY ${ORDER_BY_TMDB_POPULAR} LIMIT ?
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
    ORDER BY ${ORDER_BY_TMDB_POPULAR}
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
  const demographic = getDemographicRecommendations(userId, limit);
  if (demographic && demographic.length > 0) return demographic;
  return getPersonalizedRecommendations(userId, limit);
}

async function getPopularRecommendations(limit = 12) {
  return await db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration, m.tmdb_vote_count, m.tmdb_rating
    FROM movies m
    ORDER BY ${ORDER_BY_TMDB_POPULAR}
    LIMIT ?
  `).all(limit);
}

module.exports = {
  getPersonalizedRecommendations,
  getPopularRecommendations,
  getDemographicRecommendations,
  getColdStartRecommendations,
};

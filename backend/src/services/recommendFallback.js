/**
 * 推荐 Fallback：原有个性化/热门逻辑，供 CF 冷启动或结果为空时使用
 * 新增：根据用户性别、年龄等画像进行 demographic 推荐
 *
 * 「热门」排序与 TMDB 一致：优先投票数、再评分、再年份，避免仅按 id 新排到冷门老片
 *
 * 语言过滤：仅推荐英文(en)和中文(zh)电影，排除印度/日韩/其他语种
 * 每日刷新：基于日期种子的伪随机抖动，同一用户不同天访问看到不同推荐
 */
const db = require('../db/db');

/** 仅推荐中英文电影 */
const LANG_FILTER = "m.original_language IN ('en', 'zh')";
const LANG_FILTER_AND = `AND ${LANG_FILTER}`;

const ORDER_BY_TMDB_POPULAR = `
  COALESCE(m.tmdb_vote_count, 0) DESC,
  COALESCE(m.tmdb_rating, 0) DESC,
  COALESCE(m.release_year, 0) DESC,
  m.id DESC
`;

/** 基于日期的种子值（每天变化），用于 ORDER BY 注入随机性 */
function dailySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * 基于种子 + movie id 的确定性伪随机数 ∈ [0, 1)
 * 同一用户同一天看到相同排序，不同天看到不同排序
 */
function seededRandom(movieId, seed) {
  const x = Math.sin((movieId * 9301 + seed * 49297) * 0.0123) * 49297;
  return x - Math.floor(x);
}

/** 每日随机排序 SQL 片段（用于 ORDER BY） */
function dailyRandomOrder(seed) {
  const a = (seed * 9301 + 49297) % 10007;
  const b = (seed * 49297 + 233280) % 10007;
  return `((m.id * ${a} + ${b}) % 10007)`;
}

/**
 * 根据用户画像推荐（已移除性别、年龄，直接走个性化/热门）
 */
function getDemographicRecommendations(userId, limit = 12) {
  return null;
}

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
  const demographic = getDemographicRecommendations(userId, limit);
  if (demographic && demographic.length > 0) return demographic;
  return getPersonalizedRecommendations(userId, limit);
}

async function getPopularRecommendations(limit = 12) {
  const seed = dailySeed();
  const randOrder = dailyRandomOrder(seed);
  return await db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration, m.tmdb_vote_count, m.tmdb_rating
    FROM movies m
    WHERE ${LANG_FILTER}
    ORDER BY ${randOrder}
    LIMIT ?
  `).all(limit);
}

module.exports = {
  getPersonalizedRecommendations,
  getPopularRecommendations,
  getDemographicRecommendations,
  getColdStartRecommendations,
};

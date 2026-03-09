/**
 * 推荐 Fallback：原有个性化/热门逻辑，供 CF 冷启动或结果为空时使用
 * 新增：根据用户性别、年龄等画像进行 demographic 推荐
 */
const db = require('../db/db');

/**
 * 根据用户画像推荐（已移除性别、年龄，直接走个性化/热门）
 */
function getDemographicRecommendations(userId, limit = 12) {
  return null;
}

function getPersonalizedRecommendations(userId, limit = 12) {
  const seen = new Set();
  const result = [];

  const likedCategories = db.prepare(`
    SELECT mc.category_id, AVG(r.score) as avg_score
    FROM ratings r
    INNER JOIN movie_categories mc ON r.movie_id = mc.movie_id
    WHERE r.user_id = ? AND r.score >= 4
    GROUP BY mc.category_id ORDER BY avg_score DESC LIMIT 3
  `).all(userId);

  const likedTags = db.prepare(`
    SELECT mt.tag_id, AVG(r.score) as avg_score
    FROM ratings r
    INNER JOIN movie_tags mt ON r.movie_id = mt.movie_id
    WHERE r.user_id = ? AND r.score >= 4
    GROUP BY mt.tag_id ORDER BY avg_score DESC LIMIT 3
  `).all(userId);

  const favMovieIds = db.prepare('SELECT movie_id FROM favorites WHERE user_id = ?').all(userId).map(r => r.movie_id);
  favMovieIds.forEach(id => seen.add(id));

  const perSource = Math.ceil(limit / 3);
  for (const { category_id } of likedCategories) {
    const movies = db.prepare(`
      SELECT m.id, m.title, m.cover, m.description, m.release_year
      FROM movies m
      INNER JOIN movie_categories mc ON m.id = mc.movie_id AND mc.category_id = ?
      WHERE m.id NOT IN (SELECT movie_id FROM ratings WHERE user_id = ?)
      ORDER BY m.id DESC LIMIT ?
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
    const movies = db.prepare(`
      SELECT m.id, m.title, m.cover, m.description, m.release_year
      FROM movies m
      INNER JOIN movie_tags mt ON m.id = mt.movie_id AND mt.tag_id = ?
      WHERE m.id NOT IN (SELECT movie_id FROM ratings WHERE user_id = ?)
      ORDER BY m.id DESC LIMIT ?
    `).all(tag_id, userId, perSource);
    for (const m of movies) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        result.push(m);
        if (result.length >= limit) return result;
      }
    }
  }

  const popular = db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year
    FROM movies m
    LEFT JOIN (SELECT movie_id, AVG(score) as avg_score, COUNT(*) as cnt FROM ratings GROUP BY movie_id) r ON m.id = r.movie_id
    WHERE m.id NOT IN (SELECT movie_id FROM ratings WHERE user_id = ?)
    ORDER BY COALESCE(r.cnt, 0) * COALESCE(r.avg_score, 0) DESC, m.id DESC
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
function getColdStartRecommendations(userId, limit = 12) {
  const demographic = getDemographicRecommendations(userId, limit);
  if (demographic && demographic.length > 0) return demographic;
  return getPersonalizedRecommendations(userId, limit);
}

function getPopularRecommendations(limit = 12) {
  return db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year
    FROM movies m
    LEFT JOIN (SELECT movie_id, AVG(score) as avg_score, COUNT(*) as cnt FROM ratings GROUP BY movie_id) r ON m.id = r.movie_id
    ORDER BY COALESCE(r.cnt, 0) * COALESCE(r.avg_score, 0) DESC, m.id DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  getPersonalizedRecommendations,
  getPopularRecommendations,
  getDemographicRecommendations,
  getColdStartRecommendations,
};

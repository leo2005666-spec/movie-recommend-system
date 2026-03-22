/**
 * 协同过滤推荐服务
 * 用户基于 CF：找相似用户 → 推荐他们喜欢的电影
 * 物品相似（similar）：喜欢该电影的人也喜欢
 * 冷启动：交互 < 3 时用热门+内容相似
 */
const db = require('../db/db');

const MIN_INTERACTIONS_FOR_CF = 3;
const MIN_SIMILAR_USERS = 2;
const TOP_K_SIMILAR = 10;

/**
 * 获取统一格式的交互数据 { userId, movieId, actionType, value, timestamp }
 */
async function getInteractions() {
  const interactions = [];

  const ratings = await db.prepare(`
    SELECT user_id as userId, movie_id as movieId, score as value, created_at as timestamp
    FROM ratings
  `).all();
  ratings.forEach((r) => {
    interactions.push({ ...r, actionType: 'rating', timestamp: r.timestamp });
  });

  const favorites = await db.prepare(`
    SELECT user_id as userId, movie_id as movieId, created_at as timestamp
    FROM favorites
  `).all();
  favorites.forEach((r) => {
    interactions.push({ ...r, actionType: 'favorite', value: 5, timestamp: r.timestamp });
  });

  const comments = await db.prepare(`
    SELECT user_id as userId, movie_id as movieId, created_at as timestamp
    FROM comments
  `).all();
  comments.forEach((r) => {
    interactions.push({ ...r, actionType: 'comment', value: 3.5, timestamp: r.timestamp });
  });

  return interactions;
}

/**
 * 用户偏好矩阵：userId -> { movieId -> weightedScore }
 */
function buildUserItemMatrix(interactions) {
  const matrix = {};
  for (const i of interactions) {
    if (!matrix[i.userId]) matrix[i.userId] = {};
    const cur = matrix[i.userId][i.movieId] || 0;
    matrix[i.userId][i.movieId] = Math.max(cur, i.value);
  }
  return matrix;
}

/**
 * 余弦相似度（基于共同评分的电影）
 */
function cosineSimilarity(vecA, vecB) {
  const keys = Object.keys(vecA).filter((k) => vecB[k] != null);
  if (keys.length < 2) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (const k of keys) {
    const a = vecA[k];
    const b = vecB[k];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * 找与 userId 最相似的用户（基于共同评分）
 */
function findSimilarUsers(matrix, userId, excludeMovieIds = []) {
  const userVec = matrix[userId];
  if (!userVec || Object.keys(userVec).length < 2) return [];

  const candidates = [];
  for (const otherId of Object.keys(matrix)) {
    if (Number(otherId) === Number(userId)) continue;
    const sim = cosineSimilarity(userVec, matrix[otherId]);
    if (sim > 0) candidates.push({ userId: Number(otherId), similarity: sim });
  }
  candidates.sort((a, b) => b.similarity - a.similarity);
  return candidates.slice(0, TOP_K_SIMILAR);
}

/**
 * home_personalized：基于协同过滤的个性化推荐
 */
async function getCFPersonalized(userId, limit = 12) {
  const interactions = await getInteractions();
  const matrix = buildUserItemMatrix(interactions);

  const userInteracted = new Set(
    Object.keys(matrix[userId] || {}).map(Number)
  );

  if (userInteracted.size < MIN_INTERACTIONS_FOR_CF) {
    return null; // 冷启动，交给 fallback
  }

  const similarUsers = findSimilarUsers(matrix, userId);
  if (similarUsers.length < MIN_SIMILAR_USERS) return null;

  const scores = {};
  for (const { userId: otherId, similarity } of similarUsers) {
    const otherMovies = matrix[otherId] || {};
    for (const [movieId, score] of Object.entries(otherMovies)) {
      const mid = Number(movieId);
      if (userInteracted.has(mid)) continue;
      scores[mid] = (scores[mid] || 0) + score * similarity;
    }
  }

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([movieId, score]) => ({ movieId: Number(movieId), score, reason: 'collab_filter' }));

  return sorted.length ? sorted : null;
}

/**
 * similar：喜欢 movieId 的人也喜欢
 */
async function getSimilarMovies(movieId, userId, limit = 12) {
  const interactions = await getInteractions();
  const matrix = buildUserItemMatrix(interactions);

  const usersWhoLiked = [];
  for (const [uid, movies] of Object.entries(matrix)) {
    if (movies[movieId] != null && (movies[movieId] >= 3.5 || movies[movieId] === 5)) {
      usersWhoLiked.push(Number(uid));
    }
  }

  if (usersWhoLiked.length < 1) return null;

  const scores = {};
  const excludeIds = new Set([movieId]);

  for (const uid of usersWhoLiked) {
    const movies = matrix[uid] || {};
    for (const [mid, score] of Object.entries(movies)) {
      const m = Number(mid);
      if (excludeIds.has(m)) continue;
      scores[m] = (scores[m] || 0) + score;
    }
  }

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([mid, score]) => ({ movieId: Number(mid), score, reason: 'similar_users' }));

  return sorted.length ? sorted : null;
}

/**
 * 内容相似：同分类/同标签
 */
async function getContentSimilar(movieId, limit = 12) {
  const movie = await db.prepare('SELECT id FROM movies WHERE id = ?').get(movieId);
  if (!movie) return [];

  const categoryIds = (await db.prepare(`
    SELECT category_id FROM movie_categories WHERE movie_id = ?
  `).all(movieId)).map((r) => r.category_id);

  const tagIds = (await db.prepare(`
    SELECT tag_id FROM movie_tags WHERE movie_id = ?
  `).all(movieId)).map((r) => r.tag_id);

  const seen = new Set([movieId]);
  const result = [];

  for (const cid of categoryIds) {
    const rows = await db.prepare(`
      SELECT m.id FROM movies m
      INNER JOIN movie_categories mc ON m.id = mc.movie_id AND mc.category_id = ?
      WHERE m.id != ?
      LIMIT ?
    `).all(movieId, cid, Math.ceil(limit / 2));
    for (const r of rows) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        result.push({ movieId: r.id, score: 1, reason: 'content_similar' });
        if (result.length >= limit) return result;
      }
    }
  }

  for (const tid of tagIds) {
    const rows = await db.prepare(`
      SELECT m.id FROM movies m
      INNER JOIN movie_tags mt ON m.id = mt.movie_id AND mt.tag_id = ?
      WHERE m.id != ?
      LIMIT ?
    `).all(movieId, tid, Math.ceil(limit / 2));
    for (const r of rows) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        result.push({ movieId: r.id, score: 1, reason: 'content_similar' });
        if (result.length >= limit) return result;
      }
    }
  }
  return result;
}

/**
 * 热门推荐（与原有 recommend 一致）
 */
async function getPopularMovies(limit = 12) {
  return await db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration
    FROM movies m
    ORDER BY COALESCE(m.tmdb_vote_count, 0) DESC,
      COALESCE(m.tmdb_rating, 0) DESC,
      COALESCE(m.release_year, 0) DESC,
      m.id DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  getInteractions,
  getCFPersonalized,
  getSimilarMovies,
  getContentSimilar,
  getPopularMovies,
  MIN_INTERACTIONS_FOR_CF,
};

/**
 * 协同过滤推荐服务（增强版）
 *
 * 1）时间衰减：近期评分/收藏/评论在相似度与汇总得分中权重更高（指数衰减 exp(-λ·Δt)）
 * 2）混合推荐：最终得分 = α·归一化(CF得分) + β·内容(微标签匹配)，缓解稀疏与冷启动
 * 3）每日抖动：基于日期种子对最终得分加微小扰动，同一用户每天看到不同排序
 *
 * 用户 CF：找相似用户 → 推荐他们喜欢的电影
 * 物品相似（similar）：喜欢该电影的人也喜欢
 * 冷启动：交互 < 3 时由 recommendFallback 处理
 */
const db = require('../db/db');
const { LANG_FILTER, dailySeed, seededJitter, dailyRandomOrder } = require('../utils/recommendUtils');

const MIN_INTERACTIONS_FOR_CF = 3;
const MIN_SIMILAR_USERS = 2;
const TOP_K_SIMILAR = 10;

/** 时间衰减系数 λ（/天）：越大越强调「最近」。约 0.012 时约 58 天处衰减到 e^-0.7 */
const TIME_DECAY_LAMBDA = parseFloat(process.env.RECOMMEND_TIME_LAMBDA || '0.012');

/** 混合推荐权重（默认 α+β=1；可通过环境变量微调） */
const HYBRID_ALPHA = parseFloat(process.env.RECOMMEND_CF_ALPHA || '0.62');
const HYBRID_BETA = parseFloat(process.env.RECOMMEND_CONTENT_BETA || '0.38');

/** CF 混合推荐最终得分的抖动幅度 */
const HYBRID_JITTER_RANGE = 0.18;

const MS_PER_DAY = 86400000;

/**
 * 计算单条交互的时间衰减权重（牛顿冷却 / 指数衰减）
 * weight = exp(-λ * days_diff)，days_diff 为「当前时间 − 交互时间」的天数（≥0）
 *
 * @param {string|number|Date} timestamp - 数据库 created_at 或时间戳
 * @param {number} [lambda=TIME_DECAY_LAMBDA]
 * @returns {number} (0, 1]
 */
function calculateTimeDecayWeight(timestamp, lambda = TIME_DECAY_LAMBDA) {
  if (timestamp == null || timestamp === '') return 1;
  let t;
  if (typeof timestamp === 'number') {
    t = timestamp;
  } else if (typeof timestamp === 'string') {
    const s = timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T');
    t = new Date(s).getTime();
  } else {
    t = new Date(timestamp).getTime();
  }
  if (Number.isNaN(t)) return 1;
  const daysDiff = Math.max(0, (Date.now() - t) / MS_PER_DAY);
  return Math.exp(-lambda * daysDiff);
}

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
 * 用户偏好矩阵（带时间衰减）：userId -> { movieId -> 加权分数 }
 * 同一用户对同一影片多条交互取加权后的较大值（强化主信号）
 */
function buildWeightedUserItemMatrix(interactions) {
  const matrix = {};
  const lambda = TIME_DECAY_LAMBDA;
  for (const i of interactions) {
    const uid = i.userId;
    const mid = i.movieId;
    if (!matrix[uid]) matrix[uid] = {};
    const base = Number(i.value) || 0;
    const w = base * calculateTimeDecayWeight(i.timestamp, lambda);
    const prev = matrix[uid][mid] || 0;
    matrix[uid][mid] = Math.max(prev, w);
  }
  return matrix;
}

/**
 * 余弦相似度（基于共同评分的电影，向量已为时间加权）
 */
function cosineSimilarity(vecA, vecB) {
  const keys = Object.keys(vecA).filter((k) => vecB[k] != null);
  if (keys.length < 2) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
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
 * 找与 userId 最相似的用户
 */
function findSimilarUsers(matrix, userId) {
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
 * 从用户历史（评分≥3.5、收藏）聚合「微标签」权重，并对评分/收藏时间做同样的指数衰减
 * 用于内容侧得分，缓解 CF 稀疏
 *
 * @returns {Promise<Map<number, number>>} tag_id -> 累计权重
 */
async function getUserTagAffinity(userId) {
  const weights = new Map();
  const lambda = TIME_DECAY_LAMBDA;

  const rRows = await db.prepare(`
    SELECT r.movie_id, r.score, r.created_at, mt.tag_id
    FROM ratings r
    INNER JOIN movie_tags mt ON mt.movie_id = r.movie_id
    WHERE r.user_id = ? AND r.score >= 3.5
  `).all(userId);

  for (const row of rRows) {
    const decay = calculateTimeDecayWeight(row.created_at, lambda);
    const wmul = (Number(row.score) / 5) * decay;
    const tid = row.tag_id;
    weights.set(tid, (weights.get(tid) || 0) + wmul);
  }

  const fRows = await db.prepare(`
    SELECT f.movie_id, f.created_at, mt.tag_id
    FROM favorites f
    INNER JOIN movie_tags mt ON mt.movie_id = f.movie_id
    WHERE f.user_id = ?
  `).all(userId);

  for (const row of fRows) {
    const decay = calculateTimeDecayWeight(row.created_at, lambda);
    const tid = row.tag_id;
    weights.set(tid, (weights.get(tid) || 0) + decay);
  }

  return weights;
}

/**
 * 基于用户标签偏好向量与影片标签集合，计算内容相似度得分 ∈ [0,1]
 * 使用加权余弦形式：dot / (||user|| * sqrt(|电影标签数|))
 */
function scoreTagOverlap(affinityMap, movieTagIds) {
  if (!affinityMap || affinityMap.size === 0 || !movieTagIds || movieTagIds.length === 0) return 0;

  let userNormSq = 0;
  for (const w of affinityMap.values()) userNormSq += w * w;
  const userNorm = Math.sqrt(userNormSq) || 1;

  let dot = 0;
  for (const tid of movieTagIds) {
    dot += affinityMap.get(tid) || 0;
  }
  const movieNorm = Math.sqrt(movieTagIds.length) || 1;
  const raw = dot / (userNorm * movieNorm);
  return Math.min(1, Math.max(0, raw));
}

/**
 * 批量拉取多部电影的标签 ID，减少查询次数
 */
async function loadTagsForMovies(movieIds) {
  if (!movieIds.length) return {};
  const placeholders = movieIds.map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT movie_id, tag_id FROM movie_tags WHERE movie_id IN (${placeholders})
  `).all(...movieIds);
  const byMovie = {};
  for (const r of rows) {
    if (!byMovie[r.movie_id]) byMovie[r.movie_id] = [];
    byMovie[r.movie_id].push(r.tag_id);
  }
  return byMovie;
}

/**
 * 对 CF 候选做混合重排：α·归一化CF + β·标签内容分
 *
 * @param {Array<{ movieId: number, score: number, reason: string }>} cfItems - CF 原始候选（已按 CF 分排序的一段）
 * @param {number} userId
 * @param {number} limit - 最终输出条数
 */
async function mergeHybridPersonalized(cfItems, userId, limit) {
  if (!cfItems.length) return null;

  const affinity = await getUserTagAffinity(userId);
  const candidateIds = cfItems.map((c) => c.movieId);
  const tagsByMovie = await loadTagsForMovies(candidateIds);

  const maxCf = Math.max(...cfItems.map((c) => c.score), 1e-9);

  let alpha = HYBRID_ALPHA;
  let beta = HYBRID_BETA;
  if (!affinity || affinity.size === 0) {
    alpha = 1;
    beta = 0;
  }

  const sumAB = alpha + beta;
  const aNorm = sumAB > 0 ? alpha / sumAB : 1;
  const bNorm = sumAB > 0 ? beta / sumAB : 0;

  const seed = dailySeed();

  const merged = cfItems.map((c) => {
    const cfNorm = c.score / maxCf;
    const movieTags = tagsByMovie[c.movieId] || [];
    const contentS = beta > 0 ? scoreTagOverlap(affinity, movieTags) : 0;
    const hybrid = aNorm * cfNorm + bNorm * contentS;
    // 每日随机抖动，同一用户每天看到不同排序
    const jitter = seededJitter(c.movieId, seed) * HYBRID_JITTER_RANGE;
    return {
      movieId: c.movieId,
      score: hybrid * (1 + jitter),
      reason: beta > 0 ? 'hybrid_mix' : 'collab_filter',
    };
  });

  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, limit);
}

/**
 * home_personalized：协同过滤 + 时间衰减矩阵；候选扩增后再混合重排
 */
async function getCFPersonalized(userId, limit = 12) {
  const interactions = await getInteractions();
  const matrix = buildWeightedUserItemMatrix(interactions);

  const userInteracted = new Set(
    Object.keys(matrix[userId] || {}).map(Number),
  );

  if (userInteracted.size < MIN_INTERACTIONS_FOR_CF) {
    return null;
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

  const candidateCap = Math.min(150, Math.max(limit * 5, 60));
  const sortedRaw = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, candidateCap)
    .map(([movieId, score]) => ({
      movieId: Number(movieId),
      score,
      reason: 'collab_filter',
    }));

  if (!sortedRaw.length) return null;

  return mergeHybridPersonalized(sortedRaw, userId, limit);
}

/**
 * similar：喜欢 movieId 的人也喜欢（矩阵与时间加权一致）
 */
async function getSimilarMovies(movieId, userId, limit = 12) {
  const interactions = await getInteractions();
  const matrix = buildWeightedUserItemMatrix(interactions);

  const usersWhoLiked = [];
  for (const [uid, movies] of Object.entries(matrix)) {
    if (movies[movieId] != null && (movies[movieId] >= 2.5 || movies[movieId] === 5)) {
      usersWhoLiked.push(Number(uid));
    }
  }

  if (usersWhoLiked.length < 1) return null;

  const scores = {};
  const excludeIds = new Set([Number(movieId)]);

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
 * 内容相似：同分类/同标签（兜底）
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
      WHERE m.id != ? AND ${LANG_FILTER}
      LIMIT ?
    `).all(cid, movieId, Math.ceil(limit / 2));
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
      WHERE m.id != ? AND ${LANG_FILTER}
      LIMIT ?
    `).all(tid, movieId, Math.ceil(limit / 2));
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
 * 热门推荐：综合 TMDB 热度 + 新片 + 评分，每日抖动
 */
async function getPopularMovies(limit = 12) {
  const seed = dailySeed();
  const jitterA = (seed * 9301 + 49297) % 10007;
  const jitterB = (seed * 49297 + 233280) % 10007;
  return await db.prepare(`
    SELECT m.id, m.title, m.cover, m.description, m.release_year, m.release_date, m.duration
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
  getInteractions,
  calculateTimeDecayWeight,
  buildWeightedUserItemMatrix,
  getUserTagAffinity,
  getCFPersonalized,
  getSimilarMovies,
  getContentSimilar,
  getPopularMovies,
  MIN_INTERACTIONS_FOR_CF,
};

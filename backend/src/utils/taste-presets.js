/**
 * 人群口味预设：供 recommend、movies 等模块复用
 */
const TASTE_PRESETS = {
  /** 需同时命中「分类之一」与「标签之一」，避免 OR 过宽导致结果雷同、缺少经典感 */
  student: { label: '学生党', desc: '喜剧/动画 × 治愈热门', categoryNames: ['喜剧', '动画'], tagNames: ['治愈', '热门', '高分'] },
  worker: { label: '上班族', desc: '喜剧 × 治愈经典', categoryNames: ['喜剧'], tagNames: ['治愈', '热门', '经典'] },
  family: { label: '家庭亲子', desc: '动画 × 治愈经典', categoryNames: ['动画'], tagNames: ['治愈', '经典', '热门'] },
  couple: { label: '情侣约会', desc: '爱情 × 高分经典', categoryNames: ['爱情'], tagNames: ['高分', '经典'] },
  buff: { label: '资深影迷', desc: '科幻/悬疑 × 烧脑经典', categoryNames: ['科幻', '悬疑'], tagNames: ['烧脑', '经典', '高分'] },
};

async function getIdsByNames(db, table, names) {
  if (!names || names.length === 0) return [];
  const placeholders = names.map(() => '?').join(',');
  const rows = await db.prepare(`SELECT id FROM ${table} WHERE name IN (${placeholders})`).all(...names);
  return rows.map((r) => r.id);
}

/**
 * 根据 tasteType 获取筛选用的分类 ID、标签 ID
 */
async function getTasteFilterIds(db, tasteType) {
  const preset = TASTE_PRESETS[tasteType];
  if (!preset) return { categoryIds: [], tagIds: [] };
  const [categoryIds, tagIds] = await Promise.all([
    getIdsByNames(db, 'categories', preset.categoryNames),
    getIdsByNames(db, 'tags', preset.tagNames),
  ]);
  return { categoryIds, tagIds };
}

/**
 * 生成人群口味 WHERE 片段：分类、标签均存在时 **同时** 满足（更聚焦、易出经典/高分片）
 * @returns {{ sql: string, params: unknown[] } | null}
 */
async function buildTasteWhereSql(db, tasteType) {
  const { categoryIds, tagIds } = await getTasteFilterIds(db, tasteType);
  const params = [];
  const parts = [];
  if (categoryIds.length > 0) {
    const ph = categoryIds.map(() => '?').join(',');
    parts.push(
      `EXISTS (SELECT 1 FROM movie_categories mc WHERE mc.movie_id = m.id AND mc.category_id IN (${ph}))`
    );
    params.push(...categoryIds);
  }
  if (tagIds.length > 0) {
    const ph = tagIds.map(() => '?').join(',');
    parts.push(`EXISTS (SELECT 1 FROM movie_tags mt WHERE mt.movie_id = m.id AND mt.tag_id IN (${ph}))`);
    params.push(...tagIds);
  }
  if (parts.length === 0) return null;
  return { sql: parts.join(' AND '), params };
}

/** 人群口味列表排序：优先 TMDB 分与投票数，再偏早年份（经典感），与纯「最新 id」区分 */
const TASTE_ORDER_BY =
  'COALESCE(m.tmdb_rating,0) DESC, COALESCE(m.tmdb_vote_count,0) DESC, COALESCE(m.release_year,2100) ASC, m.id DESC';

module.exports = { TASTE_PRESETS, getIdsByNames, getTasteFilterIds, buildTasteWhereSql, TASTE_ORDER_BY };

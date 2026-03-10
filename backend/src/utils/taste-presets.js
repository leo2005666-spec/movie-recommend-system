/**
 * 人群口味预设：供 recommend、movies 等模块复用
 */
const TASTE_PRESETS = {
  student: { label: '学生党', desc: '轻松治愈、热门好片', categoryNames: ['喜剧', '动画'], tagNames: ['治愈', '热门', '高分'] },
  worker: { label: '上班族', desc: '解压放松、节奏舒缓', categoryNames: ['喜剧'], tagNames: ['治愈', '热门'] },
  family: { label: '家庭亲子', desc: '合家欢、老少皆宜', categoryNames: ['动画'], tagNames: ['治愈', '经典'] },
  couple: { label: '情侣约会', desc: '浪漫爱情、高分经典', categoryNames: ['爱情'], tagNames: ['高分', '经典'] },
  buff: { label: '资深影迷', desc: '烧脑悬疑、科幻经典', categoryNames: ['科幻', '悬疑'], tagNames: ['烧脑', '经典'] },
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

module.exports = { TASTE_PRESETS, getIdsByNames, getTasteFilterIds };

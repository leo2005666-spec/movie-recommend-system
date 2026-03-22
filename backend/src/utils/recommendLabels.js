/**
 * 协同过滤 / 内容推荐 reason 字段 → 中文短标签（推荐理由）
 */
function reasonToLabel(reason) {
  const map = {
    collab_filter: '口味相近',
    similar_users: '看过的人也喜欢',
    content_similar: '同类影片',
    popular: '热门推荐',
  };
  if (reason && map[reason]) return map[reason];
  return '推荐';
}

module.exports = { reasonToLabel };

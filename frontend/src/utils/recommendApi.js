/**
 * 统一解析 /recommendations 等接口返回的影片列表
 * 兼容：data 为数组，或 { list: [] }（防止后端/网关包装差异）
 */
export function normalizeMovieListResponse(res) {
  if (!res) return [];
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object' && Array.isArray(d.list)) return d.list;
  return [];
}

/**
 * API 请求封装
 * 统一处理 token、错误码
 * 生产环境：VITE_API_BASE 指向后端地址，如 https://xxx.onrender.com
 * 开发环境：/api 通过 Vite 代理到 localhost:3001
 */
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const BASE = API_BASE;

/** 后端静态资源根（头像 /uploads 等）。生产环境前后端分离时请配置 VITE_API_BASE 为完整 https://xxx/api，或单独设 VITE_UPLOADS_ORIGIN */
export function getBackendOrigin() {
  const uploads = import.meta.env.VITE_UPLOADS_ORIGIN;
  if (typeof uploads === 'string' && uploads.trim().startsWith('http')) {
    return uploads.trim().replace(/\/$/, '');
  }
  const apiBase = import.meta.env.VITE_API_BASE || '/api';
  if (typeof apiBase === 'string' && apiBase.startsWith('http')) {
    return apiBase.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/** 封面图片 URL：走后端代理（后端会尝试直连 + wsrv.nl 兜底）；opts.w 请求更宽像素利于轮播高清。仅需本地 id 即可。 */
export function getCoverUrl(movie, opts = {}) {
  if (!movie?.id) return '';
  let u = BASE + '/movies/' + movie.id + '/cover';
  if (opts.w && Number(opts.w) > 0) {
    u += '?w=' + Math.min(Number(opts.w), 1920);
  }
  return u;
}

/** 仅按作品 id 拼封面代理地址（用于取色等，不依赖是否已加载 movie 对象） */
export function getCoverProxyById(id, opts = {}) {
  const n = typeof id === 'string' ? parseInt(id, 10) : id;
  if (n == null || Number.isNaN(n)) return '';
  let u = `${BASE}/movies/${n}/cover`;
  if (opts.w && Number(opts.w) > 0) {
    u += '?w=' + Math.min(Number(opts.w), 1920);
  }
  return u;
}

/**
 * 用户头像地址：支持外链 http(s) 与本站上传路径 /uploads/...
 * 生产环境若 VITE_API_BASE 为完整域名（如 https://xxx/api），会自动拼成后端域名下的静态地址。
 */
export function getAvatarUrl(avatar) {
  if (!avatar || typeof avatar !== 'string') return '';
  const s = avatar.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/uploads/')) {
    const origin = getBackendOrigin();
    return origin ? `${origin}${s}` : s;
  }
  if (s.startsWith('/')) return s;
  return s;
}

function getToken() {
  return localStorage.getItem('token');
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  /** 默认 45s：协同过滤略慢；过短易误判失败，过长体感差 */
  const timeout = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 45000;
  let res;
  try {
    res = await fetch(BASE + url, { ...options, headers, signal: AbortSignal.timeout(timeout) });
  } catch (e) {
    const msg = e.name === 'AbortError'
      ? '请求超时。若首次访问或长时间未用，后端约需 30-50 秒唤醒，请稍后再试'
      : '网络连接失败，请检查网络';
    throw new Error(msg);
  }
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error(data.message || '请重新登录');
  }

  if (!res.ok) {
    throw new Error(data.message || `请求失败 (${res.status})`);
  }

  if (data.code !== 0 && data.code !== undefined) {
    throw new Error(data.message || '请求失败');
  }

  return data;
}

/** 检测后端是否可达，用于页面顶部提示 */
export async function checkApiHealth() {
  const url = BASE + '/health';
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** 上传文件（multipart），body 为 FormData，勿手动设 Content-Type */
async function postForm(url, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const timeout = Number(import.meta.env.VITE_API_UPLOAD_TIMEOUT_MS) || 90000;
  let res;
  try {
    res = await fetch(BASE + url, {
      method: 'POST',
      body: formData,
      headers,
      signal: AbortSignal.timeout(timeout),
    });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? '请求超时' : '网络连接失败');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error(data.message || '请重新登录');
  }
  if (!res.ok) throw new Error(data.message || `请求失败 (${res.status})`);
  if (data.code !== 0 && data.code !== undefined) throw new Error(data.message || '请求失败');
  return data;
}

export const api = {
  get: (url, params) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(url + q, { method: 'GET' });
  },
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  postForm,
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
};

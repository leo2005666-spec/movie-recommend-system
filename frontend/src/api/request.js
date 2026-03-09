/**
 * API 请求封装
 * 统一处理 token、错误码
 * 生产环境：VITE_API_BASE 指向后端地址，如 https://xxx.onrender.com
 * 开发环境：/api 通过 Vite 代理到 localhost:3001
 */
const BASE = import.meta.env.VITE_API_BASE || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const timeout = 60000; // 60 秒，适配 Render 冷启动（约 30-50 秒）
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

export const api = {
  get: (url, params) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(url + q, { method: 'GET' });
  },
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
};

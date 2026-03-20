/**
 * 「在哪里观看」：地区与流媒体平台（TMDB Watch Providers 的 provider_id）
 * Logo 来自 TMDB CDN，加载失败时前端可显示首字母占位
 */
export const WATCH_REGIONS = [
  { code: 'CN', label: '中国' },
  { code: 'US', label: '美国' },
  { code: 'SG', label: '新加坡' },
  { code: 'JP', label: '日本' },
  { code: 'KR', label: '韩国' },
  { code: 'GB', label: '英国' },
];

/** 常用平台（与后端 watch_provider_ids 中的 id 一致） */
export const STREAM_PROVIDERS = [
  { id: 8, name: 'Netflix', logo: 'https://image.tmdb.org/t/p/w45/9A1JSVmS8AGHmnwRLHswLlKhlxA.jpg' },
  { id: 9, name: 'Prime Video', logo: 'https://image.tmdb.org/t/p/w45/kQFXrTbfVFB44dDNrIKZN944Svp.jpg' },
  { id: 119, name: 'Prime Video', logo: 'https://image.tmdb.org/t/p/w45/kQFXrTbfVFB44dDNrIKZN944Svp.jpg' },
  { id: 337, name: 'Disney+', logo: 'https://image.tmdb.org/t/p/w45/8z7rC8uMPaWVLNvmuWHzJ1I7jyL.jpg' },
  { id: 350, name: 'Apple TV+', logo: 'https://image.tmdb.org/t/p/w45/6uhKBfmtzFqDkR8ZnVuIUsutXbj.jpg' },
  { id: 384, name: 'HBO Max', logo: 'https://image.tmdb.org/t/p/w45/AkXBqZwonMBDbWySbaCMYHsyQE.jpg' },
  { id: 2, name: 'Apple TV', logo: 'https://image.tmdb.org/t/p/w45/peURlLxl8yIDQzrXJQQKwmIdC5q.jpg' },
  { id: 3, name: 'Google Play', logo: 'https://image.tmdb.org/t/p/w45/pTnnSxUiABfYDukSoMuXFEDLRUM.jpg' },
];

export const LS_WATCH_SUBSCRIBED = 'movie_watch_subscribed_ids';
export const LS_WATCH_REGION = 'movie_watch_region';

/**
 * 首页 Hero 横版背景兜底：均为 TMDB `original` 高清横图（经 proxy-img 代理）。
 * 仅当接口拉取的剧照宽度校验未通过或数量不足时使用；宁可少轮换也不糊。
 */
export const FALLBACK_BACKDROP_URLS = [
  'https://image.tmdb.org/t/p/original/p2f5MlzNwbkBmpM9hkwas9S0LEM.jpg', // Dune
  'https://image.tmdb.org/t/p/original/gEU2QniW6S73NIEd9YjDaGUyw5y.jpg', // Interstellar
  'https://image.tmdb.org/t/p/original/nmGWYtmYbXBm7EHsH7hWznDwysA.jpg', // Spider-Man: No Way Home
  'https://image.tmdb.org/t/p/original/9BBTo63ANSmhC4e6r62OJFuK2GL.jpg', // Oppenheimer
  'https://image.tmdb.org/t/p/original/7ABsaKbMnxA6Sb2xQ6EaBCH7J6Z.jpg', // Top Gun: Maverick
];

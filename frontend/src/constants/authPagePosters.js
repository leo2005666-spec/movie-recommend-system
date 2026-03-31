/**
 * 登录/注册页右侧「流动海报」：竖版 TMDB 海报（经 proxy-img），条目不重复用于分列展示
 * 选用常见高分片海报路径，降低失效概率
 */
export const AUTH_PAGE_POSTER_URLS = [
  'https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  'https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  'https://image.tmdb.org/t/p/w342/r2GAJP4VAWIMMG2XELClHSCGR0B.jpg',
  'https://image.tmdb.org/t/p/w342/6Wdl9N6dLIAOkz0JUvXoCoOWYp.jpg',
  'https://image.tmdb.org/t/p/w342/74xTEgt7RHsFp63Vc1JXSkSaqY8.jpg',
  'https://image.tmdb.org/t/p/w342/1E5baAaEse26fej7uHcjOgEE2t2.jpg',
  'https://image.tmdb.org/t/p/w342/9xjZS0cljgZtwsnRPYKejMdqVqI.jpg',
  'https://image.tmdb.org/t/p/w342/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
  'https://image.tmdb.org/t/p/w342/vSNxRJoWyk1PcWR4qb8xJeRUy1O.jpg',
  'https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFuyafTge5atAr.jpg',
  'https://image.tmdb.org/t/p/w342/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
  'https://image.tmdb.org/t/p/w342/lXhgCODAbBXL5buk9pEmy6QRP03.jpg',
  'https://image.tmdb.org/t/p/w342/oYuLEtQsz78zxDVfcIw9kLRZGhq.jpg',
  'https://image.tmdb.org/t/p/w342/9gk7adHYeDvHkCSEqPhQVxNlXZy.jpg',
  'https://image.tmdb.org/t/p/w342/8UlWHLMpgZm9bx6TYhjrpfju0E.jpg',
  'https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  'https://image.tmdb.org/t/p/w342/63x0IaIODz3FCKNVbk9SyBXLSZO.jpg',
  'https://image.tmdb.org/t/p/w342/uxzzWGVFPAp39z950HbADkq2m9s.jpg',
];

/** 分列：轮询分配，保证各列海报不重复且条数均衡 */
export function splitPostersIntoColumns(urls, columnCount = 3) {
  const cols = Array.from({ length: columnCount }, () => []);
  urls.forEach((u, i) => {
    cols[i % columnCount].push(u);
  });
  return cols;
}

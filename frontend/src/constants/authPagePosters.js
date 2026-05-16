/**
 * 登录/注册页右侧「流动海报」：竖版 TMDB 海报 w185（直连 TMDB CDN，不经过代理）
 * 65 张不重复，覆盖热门高分 + 2024-2026 新片
 * 每 5 天可通过运行 backend/scripts/update-auth-posters.js 自动更新
 * 或调用 GET /api/tmdb/auth-posters 获取最新列表
 * 最后更新：2026-05-16
 */
export const AUTH_PAGE_POSTER_URLS = [
  // === 2025-2026 热门新片 ===
  'https://image.tmdb.org/t/p/w185/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  'https://image.tmdb.org/t/p/w185/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  'https://image.tmdb.org/t/p/w185/6Wdl9N6dLIAOkz0JUvXoCoOWYp.jpg',
  'https://image.tmdb.org/t/p/w185/74xTEgt7RHsFp63Vc1JXSkSaqY8.jpg',
  'https://image.tmdb.org/t/p/w185/1E5baAaEse26fej7uHcjOgEE2t2.jpg',
  'https://image.tmdb.org/t/p/w185/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
  'https://image.tmdb.org/t/p/w185/vSNxRJoWyk1PcWR4qb8xJeRUy1O.jpg',
  'https://image.tmdb.org/t/p/w185/q6y0Go1tsGEsmtFuyafTge5atAr.jpg',
  'https://image.tmdb.org/t/p/w185/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
  'https://image.tmdb.org/t/p/w185/oYuLEtQsz78zxDVfcIw9kLRZGhq.jpg',
  'https://image.tmdb.org/t/p/w185/9gk7adHYeDvHkCSEqPhQVxNlXZy.jpg',
  'https://image.tmdb.org/t/p/w185/8UlWHLMpgZm9bx6TYhjrpfju0E.jpg',

  // === 高分经典 ===
  'https://image.tmdb.org/t/p/w185/r2GAJP4VAWIMMG2XELClHSCGR0B.jpg',
  'https://image.tmdb.org/t/p/w185/9xjZS0cljgZtwsnRPYKejMdqVqI.jpg',
  'https://image.tmdb.org/t/p/w185/lXhgCODAbBXL5buk9pEmy6QRP03.jpg',
  'https://image.tmdb.org/t/p/w185/63x0IaIODz3FCKNVbk9SyBXLSZO.jpg',
  'https://image.tmdb.org/t/p/w185/uxzzWGVFPAp39z950HbADkq2m9s.jpg',
  'https://image.tmdb.org/t/p/w185/pB8BM7pdSp6B6Iqh7otVBgnIi8q.jpg',
  'https://image.tmdb.org/t/p/w185/f89U3ADr1oiB1s9GkdPOEp3C8y8.jpg',
  'https://image.tmdb.org/t/p/w185/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
  'https://image.tmdb.org/t/p/w185/7WsyChQLEftFiDOVTGkv3eFmnTi.jpg',
  'https://image.tmdb.org/t/p/w185/velWPhVMQeQKcxggNEU8YmIo52R.jpg',
  'https://image.tmdb.org/t/p/w185/7lyq8hK0MhPHpUXdnqbFvZ5ypOW.jpg',
  'https://image.tmdb.org/t/p/w185/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
  'https://image.tmdb.org/t/p/w185/wwemzKWzjKYJFfCeiB57q3r4Bcm.jpg',
  'https://image.tmdb.org/t/p/w185/udD8Jo2vJOECzqBxBUUV8oAXznb.jpg',
  'https://image.tmdb.org/t/p/w185/q719jXXEzOoYaps6babgKnONONX.jpg',
  'https://image.tmdb.org/t/p/w185/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg',
  'https://image.tmdb.org/t/p/w185/hZkgoQYus5vegCetke1vKYSBpMm.jpg',
  'https://image.tmdb.org/t/p/w185/AbI0YJjVXhj0WkFA2YK6iYqxV7e.jpg',
  'https://image.tmdb.org/t/p/w185/gEU2QniE6E77NI6lCU6M8NBInIb.jpg',
  'https://image.tmdb.org/t/p/w185/lIv1QnuFzJTqzsTFpggkQwvqGBV.jpg',
  'https://image.tmdb.org/t/p/w185/5YZbUmjbMaBClZSNrvN6g3wePJx.jpg',
  'https://image.tmdb.org/t/p/w185/9E2y5Q7WlCVNE48PDvxEjNvd1fc.jpg',
  'https://image.tmdb.org/t/p/w185/34n7Q5bRQyYYvFEB7S9710HpXvF.jpg',
  'https://image.tmdb.org/t/p/w185/4q2hzjtrDImf8YaXpdFvPEGQkOX.jpg',
  'https://image.tmdb.org/t/p/w185/5hNcsn5kw8ByafBh3HclJU0Pqsy.jpg',
  'https://image.tmdb.org/t/p/w185/7W0GbrYKo9vdzmWvJ4SctIHIw0.jpg',

  // === 更多高分作品（原新增 24 张去重后） ===
  'https://image.tmdb.org/t/p/w185/8kSerJrhrJWKhYQqyXNkL5pnIy.jpg',
  'https://image.tmdb.org/t/p/w185/ln6d5APFKGTWHNe5PiW6zyNFnhi.jpg',
  'https://image.tmdb.org/t/p/w185/oRvmaF0aZGqIX2ioDZs4NFSGX6H.jpg',
  'https://image.tmdb.org/t/p/w185/pIkRyDqJ4ADPwXqn6WwjC8wXZTC.jpg',
  'https://image.tmdb.org/t/p/w185/zSqJ6GpIyQvkXyHHeL6e8BbIOiL.jpg',
  'https://image.tmdb.org/t/p/w185/n31Vd4MVFtEetVvsp0W0IopmIl3.jpg',
  'https://image.tmdb.org/t/p/w185/6DrHO1C4Mum1kM6ND5IVprW4Zhu.jpg',
  'https://image.tmdb.org/t/p/w185/kdPMUMJzyYAc4roD52qavX0nLIC.jpg',
  'https://image.tmdb.org/t/p/w185/wTcoVgbNOjL3m4X3FFx4MRUB1C.jpg',
  'https://image.tmdb.org/t/p/w185/bQLr4ORhyySN6a9ZMl1VOjELzGB.jpg',
  'https://image.tmdb.org/t/p/w185/bV65GDI5MDkXsnB9BXnE2MNEBXQ.jpg',
  'https://image.tmdb.org/t/p/w185/5M9LaA2WzFqJ2V5y2MR2cXf7KbG.jpg',
  'https://image.tmdb.org/t/p/w185/hQ4YsYCh1KVRfQ3pO8bD3cAMzSF.jpg',
  'https://image.tmdb.org/t/p/w185/8b8R8l88Qje9dn9OE8PY05Nez7S.jpg',
  'https://image.tmdb.org/t/p/w185/jBMjvAxB3EXY3wNRV8GIgjwgQjS.jpg',
  'https://image.tmdb.org/t/p/w185/sJNL0lx5oTwHqXk22y8Mb5eX7s.jpg',
  'https://image.tmdb.org/t/p/w185/npzn2R4t0PNkS3FeLkh6Vw3LSG5.jpg',
  'https://image.tmdb.org/t/p/w185/eSatbygYZp8ooprBHZdb6GFZxGB.jpg',
  'https://image.tmdb.org/t/p/w185/4fLZUr1e65hKPPVw0R3PmKFKxj1.jpg',
  'https://image.tmdb.org/t/p/w185/kz31chyfO5VB6hgWVOZV3fGDCxj.jpg',
  'https://image.tmdb.org/t/p/w185/nC3IjYhP6s7nMh4IqRiUp3nO3lW.jpg',
  'https://image.tmdb.org/t/p/w185/6wgJj5D6DKWW9G3cVn5kS5oR2Ad.jpg',
  'https://image.tmdb.org/t/p/w185/aJwvFyBVOKMDqfmwTJRmKurjAS9.jpg',
  'https://image.tmdb.org/t/p/w185/cHkhS5nnhxz9bO2HEpAUd3C4yB.jpg',
  'https://image.tmdb.org/t/p/w185/2vFuG6b1vmu3LRCEdGVsCG2bNFc.jpg',
  'https://image.tmdb.org/t/p/w185/gaHgnwb3kK3AdDBE6GMKx9jh4WB.jpg',
  'https://image.tmdb.org/t/p/w185/pPHPdLdFlNMO1AfCcrJRCWRI6mH.jpg',
];

/** 分列：轮询分配，保证各列海报不重复且条数均衡 */
export function splitPostersIntoColumns(urls, columnCount = 3) {
  const cols = Array.from({ length: columnCount }, () => []);
  urls.forEach((u, i) => {
    cols[i % columnCount].push(u);
  });
  return cols;
}

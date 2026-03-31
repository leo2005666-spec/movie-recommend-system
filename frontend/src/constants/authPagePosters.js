/**
 * 登录/注册页右侧「流动海报」：竖版 TMDB 海报（经 proxy-img），条目不重复、分列轮询
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
  'https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Iqh7otVBgnIi8q.jpg',
  'https://image.tmdb.org/t/p/w342/f89U3ADr1oiB1s9GkdPOEp3C8y8.jpg',
  'https://image.tmdb.org/t/p/w342/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
  'https://image.tmdb.org/t/p/w342/7WsyChQLEftFiDOVTGkv3eFmnTi.jpg',
  'https://image.tmdb.org/t/p/w342/velWPhVMQeQKcxggNEU8YmIo52R.jpg',
  'https://image.tmdb.org/t/p/w342/7lyq8hK0MhPHpUXdnqbFvZ5ypOW.jpg',
  'https://image.tmdb.org/t/p/w342/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
  'https://image.tmdb.org/t/p/w342/wwemzKWzjKYJFfCeiB57q3r4Bcm.jpg',
  'https://image.tmdb.org/t/p/w342/udD8Jo2vJOECzqBxBUUV8oAXznb.jpg',
  'https://image.tmdb.org/t/p/w342/q719jXXEzOoYaps6babgKnONONX.jpg',
  'https://image.tmdb.org/t/p/w342/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg',
  'https://image.tmdb.org/t/p/w342/hZkgoQYus5vegCetke1vKYSBpMm.jpg',
  'https://image.tmdb.org/t/p/w342/AbI0YJjVXhj0WkFA2YK6iYqxV7e.jpg',
  'https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6M8NBInIb.jpg',
  'https://image.tmdb.org/t/p/w342/lIv1QnuFzJTqzsTFpggkQwvqGBV.jpg',
  'https://image.tmdb.org/t/p/w342/5YZbUmjbMaBClZSNrvN6g3wePJx.jpg',
  'https://image.tmdb.org/t/p/w342/iiZZdoQBEYBv6id8jskSrTFkJrS.jpg',
  'https://image.tmdb.org/t/p/w342/9E2y5Q7WlCVNE48PDvxEjNvd1fc.jpg',
  'https://image.tmdb.org/t/p/w342/34n7Q5bRQyYYvFEB7S9710HpXvF.jpg',
  'https://image.tmdb.org/t/p/w342/4q2hzjtrDImf8YaXpdFvPEGQkOX.jpg',
  'https://image.tmdb.org/t/p/w342/5hNcsn5kw8ByafBh3HclJU0Pqsy.jpg',
  'https://image.tmdb.org/t/p/w342/7W0GbrYKo9vdzmWvJ4SctIHIw0.jpg',
  'https://image.tmdb.org/t/p/w342/6FfCtAuVWwZ029VEIzR8T8XET7W.jpg',
  'https://image.tmdb.org/t/p/w342/8kSerJrhrJWKhYQqyXNkL5pnIy.jpg',
  'https://image.tmdb.org/t/p/w342/ln6d5APFKGTWHNe5PiW6zyNFnhi.jpg',
  'https://image.tmdb.org/t/p/w342/oRvmaF0aZGqIX2ioDZs4NFSGX6H.jpg',
  'https://image.tmdb.org/t/p/w342/pIkRyDqJ4ADPwXqn6WwjC8wXZTC.jpg',
  'https://image.tmdb.org/t/p/w342/zSqJ6GpIyQvkXyHHeL6e8BbIOiL.jpg',
  'https://image.tmdb.org/t/p/w342/n31Vd4MVFtEetVvsp0W0IopmIl3.jpg',
];

/** 分列：轮询分配，保证各列海报不重复且条数均衡 */
export function splitPostersIntoColumns(urls, columnCount = 3) {
  const seen = new Set();
  const unique = [];
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    unique.push(u);
  }
  const cols = Array.from({ length: columnCount }, () => []);
  unique.forEach((u, i) => {
    cols[i % columnCount].push(u);
  });
  return cols;
}

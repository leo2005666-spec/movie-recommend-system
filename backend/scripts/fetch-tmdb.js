/**
 * 从 TMDB（The Movie Database）获取电影数据
 *
 * TMDB 是业界常用的公用电影数据库，数据开源、社区维护，
 * 被 Kodi、Jellyfin、Plex 等广泛使用，非商业用途免费。
 *
 * API Key 获取：https://www.themoviedb.org/settings/api
 * 设置环境变量：set TMDB_API_KEY=你的key
 */
const path = require('path');
const fs = require('fs');

const API_KEY = process.env.TMDB_API_KEY;
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function main() {
  if (!API_KEY) {
    console.error('');
    console.error('请先设置 TMDB API Key：');
    console.error('  Windows: set TMDB_API_KEY=你的key');
    console.error('  Mac/Linux: export TMDB_API_KEY=你的key');
    console.error('');
    console.error('获取 Key: https://www.themoviedb.org/settings/api');
    console.error('注意: 运行前请先停止后端服务，否则数据可能被覆盖');
    process.exit(1);
  }

  console.log('使用 TMDB API 获取电影数据（含封面）...\n');

  const { init, getDb, save } = require('../src/db/db');
  await init();
  const db = getDb();

  // 先获取热门电影（支持中文名）
  const pagesToFetch = 3; // 抓取前3页，约60部
  const allMovies = [];
  for (let page = 1; page <= pagesToFetch; page++) {
    const url = `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=zh-CN&page=${page}`;
    console.log(`获取第 ${page} 页...`);
    const data = await fetchJson(url);
    allMovies.push(...(data.results || []));
    await new Promise((r) => setTimeout(r, 300)); // 避免请求过快
  }

  let added = 0;
  for (const m of allMovies) {
    const title = m.title || m.original_title || '未知';
    const existing = db.prepare('SELECT id FROM movies WHERE title = ?').get(title);
    if (existing) continue;

    const cover = m.poster_path ? `${POSTER_BASE}${m.poster_path}` : null;
    const description = (m.overview || '').trim() || null;
    const releaseYear = m.release_date ? parseInt(m.release_date.slice(0, 4)) : null;

    // 获取详情（导演、演员）
    let director = null;
    let actors = null;
    try {
      const detail = await fetchJson(
        `https://api.themoviedb.org/3/movie/${m.id}?api_key=${API_KEY}&language=zh-CN&append_to_response=credits`
      );
      if (detail.credits?.crew) {
        const d = detail.credits.crew.find((c) => c.job === 'Director');
        if (d) director = d.name;
      }
      if (detail.credits?.cast?.length) {
        actors = detail.credits.cast
          .slice(0, 5)
          .map((c) => c.name)
          .join(', ');
      }
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.warn(`  获取 ${title} 详情失败:`, e.message);
    }

    db.prepare(
      `INSERT INTO movies (title, cover, description, release_year, director, actors, duration) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(title, cover, description, releaseYear, director, actors, null);

    const mid = db.prepare('SELECT last_insert_rowid() as id').get().id;

    // 简单映射 TMDB 类型到我们的分类: 1动作 2喜剧 3爱情 4科幻 5悬疑 6动画
    const genreMap = { 28: 1, 35: 2, 10749: 3, 878: 4, 9648: 5, 16: 6 };
    const genreIds = (m.genre_ids || []).slice(0, 2);
    for (const gid of genreIds) {
      const cid = genreMap[gid];
      if (cid) db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, ?)').run(mid, cid);
    }

    // 默认加热门标签
    db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(mid, 3); // 热门
    added++;
    console.log(`  + ${title} ${cover ? '✓有封面' : ''}`);
  }

  save();
  console.log(`\n完成！新增 ${added} 部电影`);
}

main().catch((e) => {
  console.error('错误:', e.message);
  process.exit(1);
});

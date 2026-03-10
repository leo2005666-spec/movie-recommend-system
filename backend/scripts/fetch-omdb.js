/**
 * 从 OMDb（Open Movie Database）获取电影数据
 *
 * OMDb 注册更简单：只需邮箱，无需填应用概述
 * 申请地址：https://www.omdbapi.com/apikey.aspx （选 FREE 免费版，1000次/天）
 *
 * 设置环境变量：set OMDb_API_KEY=你的key
 */
const API_KEY = process.env.OMDB_API_KEY || process.env.OMDb_API_KEY;

const SEARCH_TERMS = [
  'Avengers', 'Titanic', 'Avatar', 'Inception', 'Matrix',
  'Harry Potter', 'Star Wars', 'Batman', 'Spider-Man', 'Iron Man',
  'Jurassic Park', 'The Lion King', 'Frozen', 'Toy Story', 'Finding Nemo',
  'Forrest Gump', 'Shawshank', 'Godfather', 'Pulp Fiction', 'Fight Club',
  'Interstellar', 'Gladiator', 'Braveheart', 'Schindler', 'Green Mile',
  'Kung Fu Panda', 'Shrek', 'Despicable Me', 'Zootopia', 'Moana',
  'Captain America', 'Thor', 'Black Panther', 'Wonder Woman', 'Doctor Strange',
  'Guardians of the Galaxy', 'Ant-Man', 'Deadpool', 'Joker', 'Superman',
  'Mission Impossible', 'James Bond', 'Transformers', 'Fast and Furious',
  'Lord of the Rings', 'Hobbit', 'Pirates of the Caribbean',
  'Marvel', 'DC', 'Disney', 'Pixar',
  'Terminator', 'Alien', 'Predator', 'Back to the Future',
  'Indiana Jones', 'Die Hard', 'John Wick', 'Taken',
  'Léon', 'La La Land', 'Parasite', '1917',
];

async function fetchJson(url) {
  const res = await fetch(encodeURI(url));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  if (!API_KEY) {
    console.error('');
    console.error('请先设置 OMDb API Key：');
    console.error('  set OMDB_API_KEY=你的key');
    console.error('');
    console.error('申请地址（只需邮箱，选FREE）：');
    console.error('  https://www.omdbapi.com/apikey.aspx');
    console.error('');
    console.error('注意：运行前请先停止后端服务');
    process.exit(1);
  }

  const { init, getDb, save } = require('../src/db/db');
  await init();
  const db = getDb();

  const seenIds = new Set();
  const allMovies = [];

  console.log('使用 OMDb API 获取电影数据（含封面）...\n');

  for (const term of SEARCH_TERMS) {
    try {
      const url = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${term}&type=movie`;
      const data = await fetchJson(url);
      if (data.Response === 'True' && data.Search) {
        for (const m of data.Search) {
          if (!seenIds.has(m.imdbID) && m.Poster && m.Poster !== 'N/A') {
            seenIds.add(m.imdbID);
            allMovies.push({
              imdbID: m.imdbID,
              title: m.Title,
              year: m.Year,
              poster: m.Poster,
            });
          }
        }
      }
      await new Promise((r) => setTimeout(r, 400)); // 免费版限制
    } catch (e) {
      console.warn(`  搜索 "${term}" 失败:`, e.message);
    }
  }

  let added = 0;
  for (const m of allMovies) {
    const existing = await db.prepare('SELECT id FROM movies WHERE title = ? AND release_year = ?').get(m.title, parseInt(m.year) || null);
    if (existing) continue;

    try {
      const detail = await fetchJson(
        `https://www.omdbapi.com/?apikey=${API_KEY}&i=${m.imdbID}&plot=full`
      );
      if (detail.Response !== 'True') continue;

      const title = detail.Title || m.title;
      const cover = detail.Poster && detail.Poster !== 'N/A' ? detail.Poster : null;
      if (!cover) continue; // 只添加有封面的电影

      const description = (detail.Plot || '').trim() || null;
      const releaseYear = detail.Year ? parseInt(detail.Year.replace(/\D/g, '').slice(0, 4)) : null;
      const director = detail.Director && detail.Director !== 'N/A' ? detail.Director : null;
      const actors = detail.Actors && detail.Actors !== 'N/A' ? detail.Actors : null;
      const durationMatch = (detail.Runtime || '').match(/(\d+)/);
      const duration = durationMatch ? parseInt(durationMatch[1]) : null;
      if (duration !== null && duration < 40) continue; // 排除短片

      await db.prepare(
        'INSERT INTO movies (title, cover, description, release_year, director, actors, duration) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(title, cover, description, releaseYear, director, actors, duration);

      const lastRow = await db.prepare('SELECT last_insert_rowid() as id').get();
      const mid = lastRow?.id;

      // 简单映射 OMDb Genre 到分类
      const genreStr = (detail.Genre || '').toLowerCase();
      if (genreStr.includes('action') || genreStr.includes('adventure')) await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, 1)').run(mid);
      if (genreStr.includes('comedy')) await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, 2)').run(mid);
      if (genreStr.includes('romance') || genreStr.includes('drama')) await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, 3)').run(mid);
      if (genreStr.includes('sci-fi') || genreStr.includes('science')) await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, 4)').run(mid);
      if (genreStr.includes('thriller') || genreStr.includes('mystery')) await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, 5)').run(mid);
      if (genreStr.includes('animation')) await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, 6)').run(mid);

      await db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, 3)').run(mid);
      added++;
      console.log(`  + ${title} (${releaseYear}) ${cover ? '✓' : ''}`);
    } catch (e) {
      console.warn(`  获取 ${m.title} 详情失败:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  save();
  console.log(`\n完成！新增 ${added} 部电影`);
}

main().catch((e) => {
  console.error('错误:', e.message);
  process.exit(1);
});

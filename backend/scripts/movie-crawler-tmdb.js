/**
 * TMDB 电影数据同步脚本（推荐使用，非爬虫）
 *
 * 使用 TMDB 官方 API，数据完整稳定，支持中文。
 * 豆瓣无公开 API，爬虫易被封且违反 ToS，不推荐。
 *
 * 字段：电影名、评分(tmdb_rating)、海报、简介、导演、演员、年份、片长
 *
 * 使用方法：
 *   set TMDB_API_KEY=你的key
 *   node scripts/movie-crawler-tmdb.js          # 单次运行（与现有 OMDb 数据合并）
 *   node scripts/movie-crawler-tmdb.js --replace # 清空旧数据，仅保留 TMDB
 *   node scripts/movie-crawler-tmdb.js --cron  # 启动定时任务（每6小时）
 *
 * API Key: https://www.themoviedb.org/settings/api
 */
const API_KEY = process.env.TMDB_API_KEY;
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const HTTPS_PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

// 请求间隔（毫秒），TMDB 免费版约 40 次/10 秒
const REQUEST_DELAY = 280;

// 数据源：热门、高分、正在上映、即将上映
const ENDPOINTS = [
  { name: '热门', path: '/movie/popular' },
  { name: '高分', path: '/movie/top_rated' },
  { name: '正在上映', path: '/movie/now_playing' },
  { name: '即将上映', path: '/movie/upcoming' },
];

const PAGES_PER_SOURCE = 25; // 每个源抓取页数，约 500 部/源，总量约 800–1200 部（去重后）

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getFetchOptions() {
  const opts = {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0' },
  };
  if (HTTPS_PROXY) {
    const { ProxyAgent } = require('undici');
    opts.dispatcher = new ProxyAgent(HTTPS_PROXY);
  }
  return opts;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  const fetchFn = HTTPS_PROXY ? require('undici').fetch : fetch;
  try {
    const res = await fetchFn(url, {
      ...getFetchOptions(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.json();
  } catch (e) {
    clearTimeout(timeout);
    throw new Error(e.cause?.code || e.message || 'fetch failed');
  }
}

async function ensureSchema(db) {
  // SQLite 不支持 ADD COLUMN 时直接加 UNIQUE
  for (const col of [
    'ALTER TABLE movies ADD COLUMN tmdb_id INTEGER',
    'ALTER TABLE movies ADD COLUMN tmdb_rating REAL',
  ]) {
    try {
      await db.exec(col);
      console.log('  已添加列:', col.split(' ')[5]);
    } catch (e) {
      if (!/duplicate column name/i.test(e.message)) console.warn('  列可能已存在:', e.message);
    }
  }
}

async function runCrawler() {
  const replaceMode = process.argv.includes('--replace');

  if (!API_KEY) {
    console.error('\n请设置 TMDB_API_KEY：');
    console.error('  set TMDB_API_KEY=你的key');
    console.error('  https://www.themoviedb.org/settings/api\n');
    process.exit(1);
  }

  const { init, getDb, save } = require('../src/db/db');
  await init();
  const db = getDb();

  // 运行 init 的建表与迁移（crawler 独立运行时不经过 index.js）
  const { run: runInit } = require('../src/db/init');
  await runInit();
  await ensureSchema(db);

  if (replaceMode) {
    console.log('--replace 模式：清空旧电影数据（保留用户、分类等）...');
    await db.prepare('DELETE FROM movie_categories').run();
    await db.prepare('DELETE FROM movie_tags').run();
    await db.prepare('DELETE FROM ratings').run();
    await db.prepare('DELETE FROM favorites').run();
    await db.prepare('DELETE FROM comments').run();
    await db.prepare('DELETE FROM recommend_events').run();
    await db.prepare('DELETE FROM movies').run();
    console.log('  已清空\n');
  }

  const seenTmdbIds = new Set();
  const allMovies = [];

  console.log('开始从 TMDB 拉取电影数据（控制频率）...\n');

  for (const ep of ENDPOINTS) {
    for (let page = 1; page <= PAGES_PER_SOURCE; page++) {
      const url = `https://api.themoviedb.org/3${ep.path}?api_key=${API_KEY}&language=zh-CN&page=${page}`;
      try {
        const data = await fetchJson(url);
        const list = data.results || [];
        for (const m of list) {
          if (!seenTmdbIds.has(m.id)) {
            seenTmdbIds.add(m.id);
            allMovies.push({ ...m, _source: ep.name });
          }
        }
        console.log(`  ${ep.name} 第 ${page} 页: +${list.length} 部`);
      } catch (e) {
        console.warn(`  ${ep.name} 第 ${page} 页 失败:`, e.message);
      }
      await sleep(REQUEST_DELAY);
    }
  }

  let added = 0;
  let updated = 0;

  for (const m of allMovies) {
    const title = (m.title || m.original_title || '').trim() || '未知';
    const cover = m.poster_path ? `${POSTER_BASE}${m.poster_path}` : null;
    const description = (m.overview || '').trim() || null;
    const releaseYear = m.release_date ? parseInt(m.release_date.slice(0, 4)) : null;
    const rating = m.vote_average != null ? m.vote_average : null;

    if (!cover) continue;

    let director = null;
    let actors = null;
    let duration = null;

    try {
      const detail = await fetchJson(
        `https://api.themoviedb.org/3/movie/${m.id}?api_key=${API_KEY}&language=zh-CN&append_to_response=credits`
      );
      if (detail.credits?.crew) {
        const d = detail.credits.crew.find((c) => c.job === 'Director');
        if (d) director = d.name;
      }
      if (detail.credits?.cast?.length) {
        actors = detail.credits.cast.slice(0, 5).map((c) => c.name).join(', ');
      }
      if (detail.runtime) duration = detail.runtime;
    } catch (e) {
      console.warn(`  详情 ${title} 失败:`, e.message);
    }
    await sleep(REQUEST_DELAY);

    const existing = await db.prepare('SELECT id, tmdb_rating FROM movies WHERE tmdb_id = ?').get(m.id);

    if (existing) {
      await db
        .prepare(
          `UPDATE movies SET title=?, cover=?, description=?, release_year=?, director=?, actors=?, duration=?, tmdb_rating=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
        )
        .run(title, cover, description, releaseYear, director, actors, duration, rating, existing.id);
      updated++;
    } else {
      await db
        .prepare(
          `INSERT INTO movies (title, cover, description, release_year, director, actors, duration, tmdb_id, tmdb_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(title, cover, description, releaseYear, director, actors, duration, m.id, rating);

      const lastRow = await db.prepare('SELECT last_insert_rowid() as id').get();
      const mid = lastRow?.id;

      const genreMap = { 28: 1, 35: 2, 10749: 3, 878: 4, 9648: 5, 16: 6 };
      for (const gid of (m.genre_ids || []).slice(0, 2)) {
        const cid = genreMap[gid];
        if (cid) await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, ?)').run(mid, cid);
      }
      await db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(mid, 3);
      added++;
    }

    if ((added + updated) % 20 === 0) {
      console.log(`  已处理 ${added + updated}/${allMovies.length}...`);
    }
  }

  save();
  console.log(`\n完成！新增 ${added} 部，更新 ${updated} 部`);
  return { added, updated };
}

async function main() {
  const useCron = process.argv.includes('--cron');

  if (useCron) {
    const cron = require('node-cron');
    console.log('定时任务已启动，每 6 小时同步一次（0:00, 6:00, 12:00, 18:00）\n');
    cron.schedule('0 */6 * * *', async () => {
      console.log(`[${new Date().toISOString()}] 开始定时同步...`);
      try {
        await runCrawler();
      } catch (e) {
        console.error('定时同步失败:', e.message);
      }
    });
    await runCrawler();
    process.stdin.resume();
  } else {
    await runCrawler();
  }
}

main().catch((e) => {
  console.error('错误:', e.message);
  if (process.env.CI) console.error(e.stack);
  process.exit(1);
});

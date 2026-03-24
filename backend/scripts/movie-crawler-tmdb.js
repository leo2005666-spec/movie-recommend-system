// 从 backend/.env 加载 TMDB_API_KEY、TMDB_CRAWLER_CRON 等（无文件则忽略）
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });

// TMDB 电影数据同步脚本（推荐使用，非爬虫）
// 使用 TMDB 官方 API；豆瓣无公开 API，不推荐爬取。
// 字段：电影名、评分、海报、简介、导演、演员、年份、片长、制片国、语言、release_date、tmdb_vote_count 等
// 用法示例：
//   set TMDB_API_KEY=你的key
//   node scripts/movie-crawler-tmdb.js
//   node scripts/movie-crawler-tmdb.js --replace
//   node scripts/movie-crawler-tmdb.js --cron
//   node scripts/movie-crawler-tmdb.js --cron --full
//   node scripts/movie-crawler-tmdb.js --quick
// 环境变量：TMDB_CRAWLER_CRON（默认约每 30 分钟）、TMDB_CRAWLER_PAGES、TMDB_CRAWLER_DELAY_MS
// API Key: https://www.themoviedb.org/settings/api
const API_KEY = process.env.TMDB_API_KEY;
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const HTTPS_PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

// 请求间隔（毫秒），TMDB 免费版约 40 次/10 秒；略调低可加快整轮同步
const REQUEST_DELAY = Math.max(
  150,
  parseInt(process.env.TMDB_CRAWLER_DELAY_MS || '220', 10) || 220,
);

// 数据源：热门、高分、正在上映、即将上映
const ENDPOINTS = [
  { name: '热门', path: '/movie/popular' },
  { name: '高分', path: '/movie/top_rated' },
  { name: '正在上映', path: '/movie/now_playing' },
  { name: '即将上映', path: '/movie/upcoming' },
];

const PAGES_PER_SOURCE_DEFAULT = 13; // 每个源抓取页数，全量时约 1000+ 部（去重后）

function resolvePagesPerSource(argv, envPages) {
  if (argv.includes('--quick')) return 1;
  const n = parseInt(envPages || process.env.TMDB_CRAWLER_PAGES || '', 10);
  if (!Number.isNaN(n) && n >= 1 && n <= 50) return n;
  return PAGES_PER_SOURCE_DEFAULT;
}

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
  for (const col of [
    'ALTER TABLE movies ADD COLUMN tmdb_id INTEGER',
    'ALTER TABLE movies ADD COLUMN tmdb_rating REAL',
    'ALTER TABLE movies ADD COLUMN origin_countries TEXT',
    'ALTER TABLE movies ADD COLUMN original_language TEXT',
    'ALTER TABLE movies ADD COLUMN release_date TEXT',
    'ALTER TABLE movies ADD COLUMN tmdb_vote_count INTEGER',
  ]) {
    try {
      await db.exec(col);
      console.log('  已添加列:', col.split(' ')[5]);
    } catch (e) {
      if (!/duplicate column name/i.test(e.message)) console.warn('  列可能已存在:', e.message);
    }
  }
}

// TMDB movie 详情里的国家字段 → 库存储格式，如 |US|GB|
function formatOriginCountries(detail) {
  if (!detail || typeof detail !== 'object') return null;
  const raw = detail.production_countries;
  if (Array.isArray(raw) && raw.length) {
    const codes = raw
      .map((x) => (x && x.iso_3166_1 ? String(x.iso_3166_1).toUpperCase() : ''))
      .filter(Boolean);
    if (codes.length) return `|${codes.join('|')}|`;
  }
  const oc = detail.origin_country;
  if (Array.isArray(oc) && oc.length) {
    const codes = oc.map((c) => String(c).toUpperCase()).filter(Boolean);
    if (codes.length) return `|${codes.join('|')}|`;
  }
  return null;
}

async function runCrawler(options = {}) {
  const replaceMode = process.argv.includes('--replace');
  const pagesPerSource =
    typeof options.pagesPerSource === 'number' && options.pagesPerSource >= 1
      ? options.pagesPerSource
      : resolvePagesPerSource(process.argv, process.env.TMDB_CRAWLER_PAGES);

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

  console.log(`开始从 TMDB 拉取电影数据（每源 ${pagesPerSource} 页，请求间隔 ${REQUEST_DELAY}ms）...\n`);

  for (const ep of ENDPOINTS) {
    for (let page = 1; page <= pagesPerSource; page++) {
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
    let originCountries = null;
    let originalLanguage = null;
    let releaseDate = null;
    let tmdbVoteCount = null;

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
      originCountries = formatOriginCountries(detail);
      originalLanguage = detail.original_language ? String(detail.original_language).toLowerCase() : null;
      releaseDate = detail.release_date || null;
      if (detail.vote_count != null && !Number.isNaN(Number(detail.vote_count))) {
        tmdbVoteCount = Math.round(Number(detail.vote_count));
      }
    } catch (e) {
      console.warn(`  详情 ${title} 失败:`, e.message);
    }
    await sleep(REQUEST_DELAY);

    const existing = await db.prepare('SELECT id, tmdb_rating FROM movies WHERE tmdb_id = ?').get(m.id);

    if (existing) {
      await db
        .prepare(
          `UPDATE movies SET title=?, cover=?, description=?, release_year=?, director=?, actors=?, duration=?, tmdb_rating=?,
            origin_countries=COALESCE(?, origin_countries), original_language=COALESCE(?, original_language),
            release_date=COALESCE(?, release_date), tmdb_vote_count=COALESCE(?, tmdb_vote_count),
            updated_at=CURRENT_TIMESTAMP WHERE id=?`
        )
        .run(
          title,
          cover,
          description,
          releaseYear,
          director,
          actors,
          duration,
          rating,
          originCountries,
          originalLanguage,
          releaseDate,
          tmdbVoteCount,
          existing.id
        );
      updated++;
    } else {
      await db
        .prepare(
          `INSERT INTO movies (title, cover, description, release_year, director, actors, duration, tmdb_id, tmdb_rating,
            origin_countries, original_language, release_date, tmdb_vote_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          title,
          cover,
          description,
          releaseYear,
          director,
          actors,
          duration,
          m.id,
          rating,
          originCountries,
          originalLanguage,
          releaseDate,
          tmdbVoteCount
        );
      const row = await db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(m.id);
      const mid = row?.id;

      if (mid) {
        try {
          const genreMap = { 28: 1, 35: 2, 10749: 3, 878: 4, 9648: 5, 16: 6 };
          for (const gid of (m.genre_ids || []).slice(0, 2)) {
            const cid = genreMap[gid];
            if (cid) await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, ?)').run(mid, cid);
          }
          await db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(mid, 3);
        } catch (fkErr) {
          if (/foreign key|FOREIGN_KEY|SQLITE_CONSTRAINT/i.test(fkErr.message)) {
            console.warn(`  [跳过] ${title} 分类/标签插入失败（FK），电影已入库`);
          } else throw fkErr;
        }
      }
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
  // 默认定时每 30 分钟；全量模式请把 TMDB_CRAWLER_CRON 设慢（如每天凌晨）
  const cronExpr = (process.env.TMDB_CRAWLER_CRON || '*/30 * * * *').trim();
  // --cron 默认快速增量（每源 1 页），加 --full 才多页全量
  const cronUseFull = process.argv.includes('--full');
  const cronPages = cronUseFull ? resolvePagesPerSource(process.argv, process.env.TMDB_CRAWLER_PAGES) : 1;

  if (useCron) {
    const cron = require('node-cron');
    console.log(`定时任务已启动：${cronExpr}`);
    console.log(
      `  同步模式：${cronUseFull ? '全量（多页）' : '快速（每源 1 页，推荐配合高频定时）'}`,
    );
    console.log(`  可设置 TMDB_CRAWLER_CRON 覆盖计划；详见脚本头部注释\n`);
    const scheduleOpts = {};
    if (process.env.TMDB_CRAWLER_TZ) scheduleOpts.timezone = process.env.TMDB_CRAWLER_TZ;
    cron.schedule(
      cronExpr,
      async () => {
        console.log(`[${new Date().toISOString()}] 开始定时同步...`);
        try {
          await runCrawler({ pagesPerSource: cronPages });
        } catch (e) {
          console.error('定时同步失败:', e.message);
        }
      },
      scheduleOpts,
    );
    await runCrawler({ pagesPerSource: cronPages });
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

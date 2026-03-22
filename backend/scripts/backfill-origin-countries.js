/**
 * 仅根据 TMDB 详情补全已有电影的 origin_countries / original_language / release_date / tmdb_vote_count
 * 不拉新片，适合已有库快速对齐制片国筛选。
 *
 *   set TMDB_API_KEY=xxx
 *   node scripts/backfill-origin-countries.js
 */
const API_KEY = process.env.TMDB_API_KEY;
const REQUEST_DELAY = 280;
const HTTPS_PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getFetchOptions() {
  const opts = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' } };
  if (HTTPS_PROXY) {
    const { ProxyAgent } = require('undici');
    opts.dispatcher = new ProxyAgent(HTTPS_PROXY);
  }
  return opts;
}

async function fetchJson(url) {
  const fetchFn = HTTPS_PROXY ? require('undici').fetch : fetch;
  const res = await fetchFn(url, getFetchOptions());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatOriginCountries(detail) {
  if (!detail || typeof detail !== 'object') return null;
  const raw = detail.production_countries;
  if (Array.isArray(raw) && raw.length) {
    const codes = raw.map((x) => (x && x.iso_3166_1 ? String(x.iso_3166_1).toUpperCase() : '')).filter(Boolean);
    if (codes.length) return `|${codes.join('|')}|`;
  }
  const oc = detail.origin_country;
  if (Array.isArray(oc) && oc.length) {
    const codes = oc.map((c) => String(c).toUpperCase()).filter(Boolean);
    if (codes.length) return `|${codes.join('|')}|`;
  }
  return null;
}

async function main() {
  if (!API_KEY) {
    console.error('请设置 TMDB_API_KEY');
    process.exit(1);
  }
  const { init, getDb, save } = require('../src/db/db');
  const { run: runInit } = require('../src/db/init');
  await init();
  await runInit();
  const db = getDb();

  const rows = await db.prepare('SELECT id, tmdb_id FROM movies WHERE tmdb_id IS NOT NULL').all();
  let ok = 0;
  let fail = 0;
  console.log(`共 ${rows.length} 条有 tmdb_id，开始补全制片国等字段...\n`);

  for (const { id, tmdb_id: tid } of rows) {
    try {
      const detail = await fetchJson(
        `https://api.themoviedb.org/3/movie/${tid}?api_key=${API_KEY}&language=zh-CN`
      );
      const originCountries = formatOriginCountries(detail);
      const originalLanguage = detail.original_language ? String(detail.original_language).toLowerCase() : null;
      const releaseDate = detail.release_date || null;
      const tmdbVoteCount =
        detail.vote_count != null && !Number.isNaN(Number(detail.vote_count))
          ? Math.round(Number(detail.vote_count))
          : null;

      await db
        .prepare(
          `UPDATE movies SET origin_countries=?, original_language=?, release_date=?, tmdb_vote_count=?,
           updated_at=CURRENT_TIMESTAMP WHERE id=?`
        )
        .run(originCountries, originalLanguage, releaseDate, tmdbVoteCount, id);
      ok++;
      if (ok % 30 === 0) console.log(`  已更新 ${ok}...`);
    } catch (e) {
      fail++;
      console.warn(`  id=${id} tmdb_id=${tid} 失败:`, e.message);
    }
    await sleep(REQUEST_DELAY);
  }

  save();
  console.log(`\n完成：成功 ${ok}，失败 ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

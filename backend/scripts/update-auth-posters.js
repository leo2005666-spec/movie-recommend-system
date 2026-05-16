/**
 * 更新登录/注册页海报列表
 * 从 TMDB API 拉取最新热门电影海报，写入前端常量文件
 * 建议每 5 天执行一次：node scripts/update-auth-posters.js
 *
 * 用法：
 *   node scripts/update-auth-posters.js          # 更新海报列表
 *   node scripts/update-auth-posters.js --dry    # 仅打印，不写入文件
 */
const path = require('path');
const fs = require('fs');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
  console.error('请设置环境变量 TMDB_API_KEY');
  process.exit(1);
}

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w185';
const OUTPUT_FILE = path.join(__dirname, '../../frontend/src/constants/authPagePosters.js');
const TARGET_COUNT = 78; // 生成 78 张不重复海报（3列 x 26行，足够滚动）

const FETCH_PAGES = 6; // 每页 20 部 × 6 = 120 候选，去重后筛 78

async function tmdbFetch(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovieRecommend/1.0)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function fetchPopularMovies() {
  const allMovies = [];
  const seenIds = new Set();

  for (let page = 1; page <= FETCH_PAGES; page++) {
    const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=zh-CN&page=${page}`;
    console.log(`  获取第 ${page} 页...`);
    const json = await tmdbFetch(url);
    const results = json.results || [];
    for (const m of results) {
      if (m.poster_path && !seenIds.has(m.id)) {
        seenIds.add(m.id);
        allMovies.push({
          id: m.id,
          title: m.title,
          poster_path: m.poster_path,
          release_date: m.release_date,
          popularity: m.popularity,
        });
      }
    }
    if (allMovies.length >= TARGET_COUNT + 20) break; // 有多余候选即停止
  }

  // 按热度降序排列
  allMovies.sort((a, b) => b.popularity - a.popularity);
  return allMovies.slice(0, TARGET_COUNT);
}

async function fetchNowPlayingMovies() {
  const movies = [];
  const seenIds = new Set();
  for (let page = 1; page <= 3; page++) {
    const url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=zh-CN&page=${page}`;
    console.log(`  获取正在上映第 ${page} 页...`);
    const json = await tmdbFetch(url);
    for (const m of json.results || []) {
      if (m.poster_path && !seenIds.has(m.id)) {
        seenIds.add(m.id);
        movies.push({
          id: m.id,
          title: m.title,
          poster_path: m.poster_path,
          release_date: m.release_date,
          popularity: m.popularity,
        });
      }
    }
  }
  movies.sort((a, b) => b.popularity - a.popularity);
  return movies;
}

function generateConstantFile(posterUrls, movieInfo) {
  const lines = posterUrls.map((url, i) => {
    const info = movieInfo[i];
    return `  '${url}', // ${info.title} (${info.release_date?.slice(0, 4) || 'N/A'})`;
  });

  const content = `/**
 * 登录/注册页右侧「流动海报」：竖版 TMDB 海报 w185
 * ${posterUrls.length} 张不重复，覆盖热门 + 正在上映电影
 * 最后更新：${new Date().toISOString().slice(0, 10)}
 * 更新方式：node backend/scripts/update-auth-posters.js
 */
export const AUTH_PAGE_POSTER_URLS = [
${lines.join('\n')}
];

/** 分列：轮询分配，保证各列海报不重复且条数均衡 */
export function splitPostersIntoColumns(urls, columnCount = 3) {
  const cols = Array.from({ length: columnCount }, () => []);
  urls.forEach((u, i) => {
    cols[i % columnCount].push(u);
  });
  return cols;
}
`;

  return content;
}

async function main() {
  const dryRun = process.argv.includes('--dry');

  console.log('🎬 更新认证页海报列表...\n');

  console.log('📡 获取 TMDB 热门电影...');
  const popular = await fetchPopularMovies();
  console.log(`  获取到 ${popular.length} 部热门电影`);

  console.log('📡 获取正在上映电影...');
  const nowPlaying = await fetchNowPlayingMovies();
  console.log(`  获取到 ${nowPlaying.length} 部正在上映电影`);

  // 合并去重：正在上映优先，热门补充
  const seenIds = new Set();
  const merged = [];

  for (const m of nowPlaying) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id);
      merged.push(m);
    }
  }

  for (const m of popular) {
    if (!seenIds.has(m.id) && merged.length < TARGET_COUNT) {
      seenIds.add(m.id);
      merged.push(m);
    }
  }

  const finalMovies = merged.slice(0, TARGET_COUNT);
  const posterUrls = finalMovies.map((m) => `${TMDB_IMG_BASE}${m.poster_path}`);

  console.log(`\n✅ 最终生成 ${posterUrls.length} 张不重复海报`);
  console.log('  前 5 部:');
  finalMovies.slice(0, 5).forEach((m, i) => {
    console.log(`    ${i + 1}. ${m.title} (${m.release_date?.slice(0, 4) || 'N/A'})`);
  });

  const content = generateConstantFile(posterUrls, finalMovies);

  if (dryRun) {
    console.log('\n📝 [DRY RUN] 以下是要写入的内容（前 500 字符）:');
    console.log(content.slice(0, 500));
  } else {
    fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
    console.log(`\n📝 已写入: ${OUTPUT_FILE}`);
  }

  console.log('\n✨ 完成！');
}

main().catch((err) => {
  console.error('❌ 失败:', err.message);
  process.exit(1);
});

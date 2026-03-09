/**
 * 为缺少封面的电影从 OMDb 补充封面
 * 需设置 OMDB_API_KEY，运行前请停止后端
 */
const API_KEY = process.env.OMDB_API_KEY || process.env.OMDb_API_KEY;

// 中文片名 -> 英文 OMDb 搜索词（init 等非 mapping 来源的电影）
const ZH_TO_EN_EXTRA = {
  '肖申克的救赎': 'The Shawshank Redemption',
  '这个杀手不太冷': 'Leon',
  '千与千寻': 'Spirited Away',
  '楚门的世界': 'The Truman Show',
  '当幸福来敲门': 'The Pursuit of Happyness',
  '放牛班的春天': 'Les Choristes',
  '忠犬八公的故事': 'Hachi: A Dog\'s Tale',
  '三傻大闹宝莱坞': '3 Idiots',
  '海上钢琴师': 'The Legend of 1900',
  '控方证人': 'Witness for the Prosecution',
  '熔炉': 'Silenced',
  '触不可及': 'Intouchables',
  '霸王别姬': 'Farewell My Concubine',
  '摔跤吧！爸爸': 'Dangal',
  '怦然心动': 'Flipped',
  '龙猫': 'My Neighbor Totoro',
  '绿皮书': 'Green Book',
  '我不是药神': 'Dying to Survive',
  '心灵奇旅': 'Soul',
};

function buildReverseMap() {
  const map = {};
  for (const [zh, en] of Object.entries(ZH_TO_EN_EXTRA)) {
    map[zh] = en;
  }
  try {
    const mapping = require('./movie-zh-mapping.json');
    for (const [key, val] of Object.entries(mapping)) {
      const m = key.match(/^(.+)\s*\((\d{4})\)\s*$/);
      if (m && val.title) {
        const en = m[1].trim();
        const year = parseInt(m[2]);
        map[`${val.title}|${year}`] = en;
        map[`${val.title}|${year - 1}`] = en;
        map[`${val.title}|${year + 1}`] = en;
      }
    }
  } catch (_) {}
  return map;
}

async function fetchJson(url) {
  const res = await fetch(encodeURI(url));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function searchOMDb(title, year) {
  if (!API_KEY) return null;
  const attempts = [title, title.split(/[·：:\s]/)[0]].filter(Boolean);
  for (const q of [...new Set(attempts)]) {
    try {
      const query = q.replace(/[（）()]/g, ' ').trim();
      let url = `https://www.omdbapi.com/?apikey=${API_KEY}&t=${encodeURIComponent(query)}`;
      if (year) url += `&y=${year}`;
      const data = await fetchJson(url);
      if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
        return data.Poster;
      }
      const searchUrl = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(query)}&type=movie`;
      const search = await fetchJson(searchUrl);
      if (search.Response === 'True' && search.Search?.[0]) {
        const first = search.Search[0];
        const detail = await fetchJson(`https://www.omdbapi.com/?apikey=${API_KEY}&i=${first.imdbID}`);
        if (detail.Poster && detail.Poster !== 'N/A') return detail.Poster;
      }
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.warn(`  OMDb 查询失败: ${e.message}`);
    }
  }
  return null;
}

async function main() {
  if (!API_KEY) {
    console.error('');
    console.error('请设置 OMDB_API_KEY：set OMDB_API_KEY=你的key');
    console.error('运行前请先停止后端服务');
    process.exit(1);
  }

  const reverseMap = buildReverseMap();
  const { init, getDb, save } = require('../src/db/db');
  await init();
  const db = getDb();

  const needCover = db.prepare(
    `SELECT id, title, cover, release_year FROM movies WHERE cover IS NULL OR cover = '' OR cover LIKE '%douban%' OR cover LIKE '%doubanio%'`
  ).all();

  console.log(`发现 ${needCover.length} 部电影需补充/替换封面，正在从 OMDb 获取...\n`);

  let updated = 0;
  for (const m of needCover) {
    const year = m.release_year || null;
    let searchTitle = reverseMap[`${m.title}|${year}`] || reverseMap[m.title] || m.title;
    const poster = await searchOMDb(searchTitle, year);
    if (poster) {
      db.prepare('UPDATE movies SET cover = ? WHERE id = ?').run(poster, m.id);
      updated++;
      console.log(`  ✓ ${m.title} (${year})`);
    } else {
      console.log(`  ✗ 未找到: ${m.title} (${year})`);
    }
    await new Promise((r) => setTimeout(r, 350));
  }

  save();
  console.log(`\n完成！补充了 ${updated} 部电影的封面`);
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});

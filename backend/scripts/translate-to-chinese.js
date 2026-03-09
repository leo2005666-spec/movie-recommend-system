/**
 * 将电影标题和简介替换为中文（使用本地静态映射）
 * 导演、演员等保持不变
 */
const fs = require('fs');
const path = require('path');

const mappingPath = path.join(__dirname, 'movie-zh-mapping.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

function getChinese(movie) {
  const key1 = `${movie.title} (${movie.release_year || ''})`;
  const key2 = movie.title;
  return mapping[key1] || mapping[key2] || null;
}

async function main() {
  console.log('开始将电影标题和简介替换为中文...\n');
  console.log('使用本地映射，无需网络。运行前请先停止后端。\n');

  const { init, getDb, save } = require('../src/db/db');
  await init();
  const db = getDb();

  const movies = db.prepare('SELECT id, title, description, release_year FROM movies').all();
  let count = 0;

  for (const m of movies) {
    const zh = getChinese(m);
    if (!zh) continue;

    const newTitle = zh.title || m.title;
    const newDesc = zh.description !== undefined ? zh.description : m.description;

    db.prepare('UPDATE movies SET title = ?, description = ? WHERE id = ?').run(
      newTitle,
      newDesc || m.description,
      m.id
    );
    count++;
    console.log(`  [${count}] ${m.title} -> ${newTitle}`);
  }

  save();
  console.log(`\n完成！共更新 ${count} 部电影（映射表共 ${Object.keys(mapping).length} 条）`);
  console.log('未映射的电影保持原名，可编辑 movie-zh-mapping.json 添加');
  console.log('\n⚠️ 重要：请重启后端服务（npm run dev）并刷新浏览器才能看到中文效果！');
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});

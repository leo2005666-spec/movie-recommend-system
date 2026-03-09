/**
 * 删除没有封面或封面链接无效的电影（如豆瓣图床）
 * 运行前请停止后端
 */
const { init, getDb, save } = require('../src/db/db');

async function main() {
  await init();
  const db = getDb();

  const toRemove = db.prepare(`
    SELECT id, title, cover FROM movies
    WHERE cover IS NULL OR TRIM(COALESCE(cover,'')) = '' OR cover = 'N/A'
       OR cover LIKE '%douban%' OR cover LIKE '%doubanio%'
  `).all();

  if (toRemove.length === 0) {
    console.log('没有需要删除的无封面电影');
    return;
  }

  console.log(`发现 ${toRemove.length} 部无封面/无效封面电影，即将删除:\n`);
  for (const m of toRemove) {
    console.log(`  - ${m.title} (id: ${m.id})`);
    db.prepare('DELETE FROM movie_categories WHERE movie_id = ?').run(m.id);
    db.prepare('DELETE FROM movie_tags WHERE movie_id = ?').run(m.id);
    db.prepare('DELETE FROM ratings WHERE movie_id = ?').run(m.id);
    db.prepare('DELETE FROM favorites WHERE movie_id = ?').run(m.id);
    db.prepare('DELETE FROM comments WHERE movie_id = ?').run(m.id);
    db.prepare('DELETE FROM movies WHERE id = ?').run(m.id);
  }

  save();
  console.log(`\n已删除 ${toRemove.length} 部电影`);
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});

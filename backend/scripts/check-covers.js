/** 快速检查数据库中封面情况 */
const { init, getDb } = require('../src/db/db');
async function main() {
  await init();
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as n FROM movies').get().n;
  const noCover = db.prepare("SELECT COUNT(*) as n FROM movies WHERE cover IS NULL OR cover = ''").get().n;
  const na = db.prepare("SELECT COUNT(*) as n FROM movies WHERE cover = 'N/A'").get().n;
  const douban = db.prepare("SELECT COUNT(*) as n FROM movies WHERE cover LIKE '%douban%'").get().n;
  console.log('总数:', total);
  console.log('cover 为空:', noCover);
  console.log('cover=N/A:', na);
  console.log('豆瓣链接:', douban);
  if (noCover + na + douban > 0) {
    const list = db.prepare("SELECT id, title FROM movies WHERE cover IS NULL OR cover = '' OR cover = 'N/A' OR cover LIKE '%douban%'").all();
    console.log('\n待删除:', list.map(m => m.id + ' ' + m.title).join('\n'));
  }
}
main().catch(console.error);

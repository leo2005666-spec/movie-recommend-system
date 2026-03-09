/**
 * 迁移：为用户表新增 gender、age 字段
 * node backend/scripts/migrate-user-demographics.js
 */
async function run() {
  const { init, getDb, save } = require('../src/db/db');
  await init();
  const db = getDb();

  const cols = db.prepare("PRAGMA table_info(users)").all().map((r) => r.name);
  if (!cols.includes('gender')) {
    db.exec('ALTER TABLE users ADD COLUMN gender TEXT');
    console.log('已添加 gender 列');
  }
  if (!cols.includes('age')) {
    db.exec('ALTER TABLE users ADD COLUMN age INTEGER');
    console.log('已添加 age 列');
  }
  save();
  console.log('用户画像字段 migration 完成');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });

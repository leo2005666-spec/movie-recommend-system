/**
 * 迁移：创建 recommend_events 表（已初始化 DB 需单独运行）
 * node backend/scripts/migrate-recommend-events.js
 */
const path = require('path');
const fs = require('fs');

async function run() {
  const { init, getDb, save } = require('../src/db/db');
  await init();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS recommend_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      scene TEXT NOT NULL,
      movie_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (movie_id) REFERENCES movies(id)
    )
  `);
  save();
  console.log('recommend_events 表就绪');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });

/**
 * 重置数据库并重新初始化（会删除现有数据，慎用）
 */
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('已删除旧数据库');
}
require('../src/db/init.js');

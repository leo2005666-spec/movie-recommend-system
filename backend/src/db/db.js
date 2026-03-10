/**
 * 数据库连接模块
 * 根据环境变量选择：Turso 云数据库 或 sql.js 本地文件
 * Turso：设置 TURSO_DATABASE_URL、TURSO_AUTH_TOKEN
 * 本地：不设置上述变量时使用 sql.js
 */
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'database.db');

let _db = null;
let _useTurso = false;

// ---------- sql.js 实现（返回 Promise 以统一接口）----------
function createSqlJsWrapper(nativeDb) {
  return {
    prepare(sql) {
      return {
        run(...params) {
          const stmt = nativeDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {}
          stmt.free();
          const changes = nativeDb.getRowsModified();
          const lastIdRes = nativeDb.exec('SELECT last_insert_rowid() as id');
          const lastInsertRowid = lastIdRes[0]?.values?.[0]?.[0];
          return Promise.resolve({ changes, lastInsertRowid });
        },
        get(...params) {
          const stmt = nativeDb.prepare(sql);
          stmt.bind(params);
          const result = stmt.step() ? stmt.getAsObject() : undefined;
          stmt.free();
          return Promise.resolve(result);
        },
        all(...params) {
          const stmt = nativeDb.prepare(sql);
          stmt.bind(params);
          const results = [];
          while (stmt.step()) results.push(stmt.getAsObject());
          stmt.free();
          return Promise.resolve(results);
        },
      };
    },
    exec(sql) {
      nativeDb.exec(sql);
      return Promise.resolve();
    },
    save() {
      try {
        const data = nativeDb.export();
        fs.writeFileSync(dbPath, Buffer.from(data));
      } catch (e) {
        console.error('[DB] 保存失败:', e.message);
      }
    },
  };
}

async function initSqlJs() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  let nativeDb;
  if (fs.existsSync(dbPath)) {
    nativeDb = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    nativeDb = new SQL.Database();
  }
  return createSqlJsWrapper(nativeDb);
}

// ---------- 统一入口 ----------
async function init() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url && authToken) {
    _useTurso = true;
    const { init: initTurso } = require('./db-turso');
    _db = await initTurso();
    console.log('[DB] 使用 Turso 云数据库');
  } else {
    _db = await initSqlJs();
    console.log('[DB] 使用 sql.js 本地数据库');
  }
  return _db;
}

function getDb() {
  if (!_db) throw new Error('数据库未初始化，请先调用 init()');
  return _db;
}

function save() {
  if (_useTurso) return; // Turso 自动持久化
  if (_db && _db.save) _db.save();
}

const proxy = new Proxy(
  {},
  {
    get(_, prop) {
      if (prop === 'init') return init;
      if (prop === 'getDb') return getDb;
      if (prop === 'save') return save;
      const db = getDb();
      const val = db[prop];
      return typeof val === 'function' ? val.bind(db) : val;
    },
  }
);
module.exports = proxy;

/**
 * 数据库连接模块 - 使用 sql.js（纯 JS，无需编译）
 */
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'database.db');

let _db = null;

/**
 * 创建兼容 better-sqlite3 的封装
 */
function createWrapper(nativeDb) {
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
          return { changes, lastInsertRowid };
        },
        get(...params) {
          const stmt = nativeDb.prepare(sql);
          stmt.bind(params);
          const result = stmt.step() ? stmt.getAsObject() : undefined;
          stmt.free();
          return result;
        },
        all(...params) {
          const stmt = nativeDb.prepare(sql);
          stmt.bind(params);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        },
      };
    },
    exec(sql) {
      nativeDb.exec(sql);
    },
    close() {
      if (_db && _db._native) {
        _db._native.close();
      }
    },
    get _native() {
      return nativeDb;
    },
  };
}

/**
 * 初始化数据库（异步）
 */
async function init() {
  const SQL = await initSqlJs();
  let nativeDb;
  if (fs.existsSync(dbPath)) {
    nativeDb = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    nativeDb = new SQL.Database();
  }
  const wrapped = createWrapper(nativeDb);
  wrapped._native = nativeDb;
  _db = wrapped;
  return _db;
}

/**
 * 保存数据库到文件
 */
function save() {
  if (_db?._native) {
    const data = _db._native.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

/**
 * 获取数据库实例（必须在 init 之后调用）
 */
function getDb() {
  if (!_db) throw new Error('数据库未初始化，请先调用 init()');
  return _db;
}

// 兼容原有 require('../db/db') 用法，返回代理对象
const proxy = new Proxy({}, {
  get(_, prop) {
    // init、getDb、save 直接返回，不依赖已初始化的 db
    if (prop === 'init') return init;
    if (prop === 'getDb') return getDb;
    if (prop === 'save') return save;
    const db = getDb();
    const val = db[prop];
    return typeof val === 'function' ? val.bind(db) : val;
  },
});
module.exports = proxy;

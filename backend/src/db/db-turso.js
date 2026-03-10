/**
 * Turso 云数据库适配层
 * 使用 @libsql/client，提供与 sql.js 兼容的 prepare/exec 接口（异步）
 * 环境变量：TURSO_DATABASE_URL、TURSO_AUTH_TOKEN
 */
const { createClient } = require('@libsql/client');

let _client = null;

function createWrapper(client) {
  return {
    prepare(sql) {
      return {
        async run(...params) {
          const r = await client.execute({ sql, args: params });
          const lastId = r.lastInsertRowid;
          return {
            changes: r.rowsAffected ?? 0,
            lastInsertRowid: lastId != null ? Number(lastId) : undefined,
          };
        },
        async get(...params) {
          const r = await client.execute({ sql, args: params });
          const row = r.rows[0];
          if (!row) return undefined;
          const obj = {};
          r.columns.forEach((col, i) => { obj[col] = row[i]; });
          return obj;
        },
        async all(...params) {
          const r = await client.execute({ sql, args: params });
          return r.rows.map((row) => {
            const obj = {};
            r.columns.forEach((col, i) => { obj[col] = row[i]; });
            return obj;
          });
        },
      };
    },
    async exec(sql) {
      const stmts = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('--'));
      for (const stmt of stmts) {
        if (stmt) await client.execute(stmt);
      }
    },
    save() {
      // Turso 云端自动持久化，无需 save
    },
  };
}

async function init() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error('使用 Turso 需设置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN');
  }
  _client = createClient({ url, authToken });
  const wrapped = createWrapper(_client);
  return wrapped;
}

function getDb() {
  if (!_client) throw new Error('数据库未初始化，请先调用 init()');
  return createWrapper(_client);
}

module.exports = { init, getDb };

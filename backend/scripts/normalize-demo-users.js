/**
 * 将演示账号昵称统一为「自己的名字」，并保证每人有 avatar_style（与 init-db 一致）。
 *
 * 用法（在项目 backend 目录）：
 *   OWNER_NICKNAME=张三 node scripts/normalize-demo-users.js
 * 不设环境变量时默认昵称为「刘翼鸣」。
 *
 * 可选：OWNER_RENAME_ALL_USERS=1 时，除管理员外所有用户的 nickname 都改为上述昵称（慎用）。
 */
require('dotenv').config();
const path = require('path');

const DEFAULT_OWNER = '刘翼鸣';
const DEMO_NICKNAMES = [
  'LEO',
  'JACK',
  'SAM',
  'leo',
  'jack',
  'sam',
  'Leo',
  'Jack',
  'Sam',
  '普通用户',
];
const DEMO_USERNAMES = ['leo', 'jack', 'sam', 'LEO', 'JACK', 'SAM', 'Jack', 'Leo', 'Sam'];

async function main() {
  const { init, getDb, save } = require(path.join(__dirname, '../src/db/db'));
  await init();
  const db = getDb();
  const owner = (process.env.OWNER_NICKNAME || process.env.DEMO_OWNER_NICKNAME || DEFAULT_OWNER).trim() || DEFAULT_OWNER;
  const renameAll = String(process.env.OWNER_RENAME_ALL_USERS || '').trim() === '1';

  const admin = await db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
  const adminId = admin?.id ?? 0;

  try {
    await db.exec('ALTER TABLE users ADD COLUMN avatar_style INTEGER');
  } catch (_) {
    /* 已有列 */
  }
  await db.exec(`
    UPDATE users SET avatar_style = (ABS(id * 17 + LENGTH(COALESCE(username,''))) % 12)
    WHERE avatar_style IS NULL
  `);

  if (renameAll) {
    const r = await db
      .prepare('UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE id != ? AND role != ?')
      .run(owner, adminId, 'admin');
    console.log(`[normalize-demo-users] 已批量更新昵称（除管理员外）为「${owner}」，影响行数:`, r.changes ?? '—');
  } else {
    const bulk = await db
      .prepare(
        `UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id != ? AND role != 'admin' AND (
           UPPER(TRIM(COALESCE(nickname,''))) IN ('LEO','JACK','SAM')
           OR UPPER(TRIM(COALESCE(username,''))) IN ('LEO','JACK','SAM')
         )`
      )
      .run(owner, adminId);
    let n = bulk.changes || 0;
    for (const nick of DEMO_NICKNAMES) {
      const r = await db
        .prepare(
          'UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE TRIM(nickname) = ? AND id != ? AND role != ?'
        )
        .run(owner, nick, adminId, 'admin');
      n += r.changes || 0;
    }
    for (const un of DEMO_USERNAMES) {
      const r = await db
        .prepare(
          `UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP
           WHERE LOWER(TRIM(username)) = LOWER(?) AND id != ?`
        )
        .run(owner, un, adminId);
      n += r.changes || 0;
    }
    console.log(`[normalize-demo-users] 已将演示账号昵称替换为「${owner}」，累计更新（含 LEO/JACK/SAM 批量）: ${n} 行`);
  }

  save();
  console.log('[normalize-demo-users] 完成（本地库已保存）');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

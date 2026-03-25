/**
 * 演示数据整理：
 * 1) 用户名 leo / jack / sam（不区分大小写）→ 拼音登录名（冲突时自动加 _用户id），nickname 与 username 一致
 * 2) 全表 nickname 与 username 对齐（与 init 一致）
 * 3) 补全 avatar_style（与 init-db 一致）
 *
 * 用法（在 backend 目录）：
 *   npm run normalize-demo-users
 */
require('dotenv').config();
const path = require('path');

/** 原英文演示账号 → 新登录名（拼音小写） */
const EN_DEMO_TO_USERNAME = [
  { from: 'leo', username: 'zhangwei' },
  { from: 'jack', username: 'lina' },
  { from: 'sam', username: 'wangqiang' },
];

async function pickUniqueUsername(db, base, excludeUserId) {
  let candidate = base;
  for (let i = 0; i < 24; i += 1) {
    const row = await db
      .prepare('SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(?) AND id != ?')
      .get(candidate, excludeUserId);
    if (!row) return candidate;
    candidate = i === 0 ? `${base}_${excludeUserId}` : `${base}_${excludeUserId}_${i}`;
  }
  return `${base}_${excludeUserId}_${Date.now()}`;
}

async function main() {
  const { init, getDb, save } = require(path.join(__dirname, '../src/db/db'));
  await init();
  const db = getDb();

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

  let renamedAccounts = 0;

  for (const { from, username: wantUser } of EN_DEMO_TO_USERNAME) {
    const rows = await db
      .prepare(
        `SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(?) AND id != ? AND role != 'admin'`
      )
      .all(from, adminId);
    for (const { id } of rows) {
      const finalUser = await pickUniqueUsername(db, wantUser, id);
      await db
        .prepare(
          `UPDATE users SET username = ?, nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        )
        .run(finalUser, finalUser, id);
      renamedAccounts += 1;
      console.log(`[normalize-demo-users] 用户 id=${id}: ${from} → 登录名「${finalUser}」`);
    }
  }

  await db.exec(`UPDATE users SET nickname = username`);

  save();
  console.log(`[normalize-demo-users] 完成；leo/jack/sam 调整 ${renamedAccounts} 个账号，本地库已保存`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

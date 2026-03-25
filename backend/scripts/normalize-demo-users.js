/**
 * 演示用户英文化名清理：
 * 1) 用户名 leo / jack / sam（不区分大小写）→ 拼音登录名 + 中文昵称（张伟 / 李娜 / 王强），登录名冲突时自动加 _用户id
 * 2) 昵称仍为 LEO、JACK、SAM（不区分大小写）的非管理员 → 对应改为上述中文名
 * 3) 补全 avatar_style（与 init-db 一致）
 *
 * 用法（在 backend 目录）：
 *   npm run normalize-demo-users
 *
 * 可选：OWNER_NICKNAME=刘翼鸣 时，将昵称「普通用户」等替换为你的名字
 * 可选：OWNER_RENAME_ALL_USERS=1 时，除管理员外所有用户 nickname 都改为 OWNER_NICKNAME（慎用）
 */
require('dotenv').config();
const path = require('path');

const DEFAULT_OWNER = '刘翼鸣';

/** 原英文演示账号 → 新登录名（拼音小写）+ 中文昵称 */
const EN_DEMO_TO_CN = [
  { from: 'leo', username: 'zhangwei', nickname: '张伟' },
  { from: 'jack', username: 'lina', nickname: '李娜' },
  { from: 'sam', username: 'wangqiang', nickname: '王强' },
];

/** 仅昵称仍为英文大写/小写混合的 LEO JACK SAM 时，映射到中文（用户名已改的用户若昵称未同步可再修） */
const NICK_EN_TO_CN = [
  { match: 'LEO', nickname: '张伟' },
  { match: 'JACK', nickname: '李娜' },
  { match: 'SAM', nickname: '王强' },
];

const EXTRA_NICK_TO_OWNER = ['普通用户'];

async function pickUniqueUsername(db, base, excludeUserId) {
  let candidate = base;
  for (let i = 0; i < 24; i++) {
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

  let renamedAccounts = 0;

  if (!renameAll) {
    for (const { from, username: wantUser, nickname: wantNick } of EN_DEMO_TO_CN) {
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
          .run(finalUser, wantNick, id);
        renamedAccounts += 1;
        console.log(`[normalize-demo-users] 用户 id=${id}: ${from} → 登录「${finalUser}」昵称「${wantNick}」`);
      }
    }

    for (const { match, nickname } of NICK_EN_TO_CN) {
      const r = await db
        .prepare(
          `UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id != ? AND role != 'admin' AND UPPER(TRIM(COALESCE(nickname,''))) = ?`
        )
        .run(nickname, adminId, match);
      if (r.changes) {
        console.log(`[normalize-demo-users] 昵称 ${match} → ${nickname}，行数:`, r.changes);
      }
    }

    for (const nick of EXTRA_NICK_TO_OWNER) {
      const r = await db
        .prepare(
          `UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP
           WHERE TRIM(nickname) = ? AND id != ? AND role != 'admin'`
        )
        .run(owner, nick, adminId);
      if (r.changes) {
        console.log(`[normalize-demo-users] 昵称「${nick}」→「${owner}」，行数:`, r.changes);
      }
    }
  }

  if (renameAll) {
    const r = await db
      .prepare('UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE id != ? AND role != ?')
      .run(owner, adminId, 'admin');
    console.log(`[normalize-demo-users] 已批量更新昵称（除管理员外）为「${owner}」，影响行数:`, r.changes ?? '—');
  }

  if (!renameAll) {
    console.log(`[normalize-demo-users] 英文演示账号重命名完成，共调整 ${renamedAccounts} 个 leo/jack/sam 账号`);
  }

  save();
  console.log('[normalize-demo-users] 完成（本地库已保存）');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

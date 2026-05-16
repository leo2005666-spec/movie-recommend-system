/**
 * 为数据库补充演示用户（中文名+ DiceBear 头像 Base64）
 * 使用 DiceBear Bottts Neutral 风格，基于用户名 seed 生成唯一头像
 *
 * 用法（在 backend 目录）：
 *   npm run seed-demo-users  或  node scripts/seed-demo-users.js
 */
require('dotenv').config();
const path = require('path');
const bcrypt = require('bcryptjs');

const DEMO_USERS = [
  { username: 'zhangwei', nickname: '影迷阿哲', gender: 'male', age: 25 },
  { username: 'lina', nickname: '糖炒栗子', gender: 'female', age: 22 },
  { username: 'wangqiang', nickname: 'NightOwl', gender: 'male', age: 30 },
  { username: 'xiaochen', nickname: '小陈不沉', gender: 'male', age: 20 },
  { username: 'seabreeze', nickname: 'SeaBreeze', gender: 'female', age: 27 },
  { username: 'muzi', nickname: '木子李', gender: 'female', age: 24 },
  { username: 'moviefan_wang', nickname: '电影民工小王', gender: 'male', age: 28 },
  { username: 'popcorntime', nickname: 'PopcornTime', gender: 'female', age: 23 },
  { username: 'filmgeek_liu', nickname: '胶片大叔', gender: 'male', age: 35 },
  { username: 'cinephile_chen', nickname: '文艺片控', gender: 'female', age: 26 },
  { username: 'dapeng', nickname: '大鹏看电影', gender: 'male', age: 32 },
  { username: 'xinyi', nickname: '心怡爱追剧', gender: 'female', age: 21 },
  { username: 'moviebuff_zhou', nickname: '周周影评', gender: 'male', age: 29 },
  { username: 'catlover_movie', nickname: '猫猫头', gender: 'female', age: 25 },
  { username: 'directorcut', nickname: '导演剪辑版', gender: 'male', age: 33 },
];

/**
 * 用 DiceBear API 生成 SVG 头像，转换为 Base64 data URI
 * DiceBear Bottts Neutral 风格：机器人风格头像，每个 seed 生成唯一图案
 */
async function fetchAvatarBase64(username) {
  const seed = encodeURIComponent(username);
  const url = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&size=128`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const svg = await res.text();
    const b64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${b64}`;
  } catch (e) {
    console.warn(`  ⚠️ 头像获取失败 (${username}): ${e.message}`);
    return null;
  }
}

async function main() {
  const { init, getDb, save } = require(path.join(__dirname, '../src/db/db'));
  await init();
  const db = getDb();

  const defaultPass = bcrypt.hashSync('user123', 10);
  let created = 0;
  let skipped = 0;

  console.log('👥 创建演示用户并获取头像...\n');

  for (const u of DEMO_USERS) {
    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(u.username);
    if (existing) {
      // 已有用户：补充头像和基本信息
      const avatar = await fetchAvatarBase64(u.username);
      if (avatar) {
        await db.prepare(
          'UPDATE users SET avatar_data = ?, nickname = ?, gender = ?, age = ? WHERE id = ?'
        ).run(avatar, u.nickname, u.gender, u.age, existing.id);
        console.log(`  ✅ ${u.username} (${u.nickname}) 头像已更新`);
      } else {
        await db.prepare(
          'UPDATE users SET nickname = ?, gender = ?, age = ? WHERE id = ?'
        ).run(u.nickname, u.gender, u.age, existing.id);
        console.log(`  🔄 ${u.username} 信息已更新（无头像）`);
      }
      skipped += 1;
      continue;
    }

    const avatar = await fetchAvatarBase64(u.username);
    await db.prepare(
      `INSERT INTO users (username, password, nickname, gender, age, role, avatar_data, avatar_style)
       VALUES (?, ?, ?, ?, ?, 'user', ?, ?)`
    ).run(
      u.username,
      defaultPass,
      u.nickname,
      u.gender,
      u.age,
      avatar,
      Math.abs(u.username.length * 17 + u.age) % 12
    );
    created += 1;
    console.log(`  ✨ ${u.username} (${u.nickname}) 已创建${avatar ? ' + 头像' : ''}`);
  }

  save();
  console.log(`\n✅ 完成：新增 ${created} 个用户，更新 ${skipped} 个已有用户`);
}

main().catch(e => { console.error(e); process.exit(1); });

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

const AVATAR_FETCH_TIMEOUT_MS = 8000;
const AVATAR_STYLE_COUNT = 12;
const COLOR_SEED_PRIME = 17;

const AVATAR_COLORS = [
  '#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#ec4899',
  '#14b8a6', '#d946ef', '#f97316', '#22c55e', '#3b82f6',
  '#a855f7', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16',
];

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

function svgToDataUri(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function generateLocalAvatar(username) {
  const idx = username.length * COLOR_SEED_PRIME % AVATAR_COLORS.length;
  const bg = AVATAR_COLORS[idx];
  const letter = (username[0] || '?').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="64" fill="${bg}"/>
  <text x="64" y="64" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="56" font-weight="bold" fill="#fff">${letter}</text>
</svg>`;
  return svgToDataUri(svg);
}

async function fetchAvatarBase64(username) {
  const seed = encodeURIComponent(username);
  try {
    const res = await fetch(`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}&size=128`, {
      signal: AbortSignal.timeout(AVATAR_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return svgToDataUri(await res.text());
  } catch (e) {
    console.warn(`  ⚠️ DiceBear 不可达 (${username})，使用本地头像: ${e.message}`);
    return generateLocalAvatar(username);
  }
}

async function main() {
  const { init, getDb, save } = require(path.join(__dirname, '../src/db/db'));
  await init();
  const db = getDb();

  const defaultPass = await bcrypt.hash('user123', 10);
  let created = 0;
  let skipped = 0;

  console.log('👥 创建演示用户并获取头像...\n');

  // 并行获取所有头像（15 个用户从 120s → 8s）
  const avatarResults = await Promise.all(
    DEMO_USERS.map(u => fetchAvatarBase64(u.username))
  );

  for (let i = 0; i < DEMO_USERS.length; i++) {
    const u = DEMO_USERS[i];
    const avatar = avatarResults[i];
    const existing = db.prepare(
      'SELECT id, avatar_data IS NOT NULL AS has_avatar FROM users WHERE LOWER(username) = LOWER(?)'
    ).get(u.username);

    if (existing) {
      if (!existing.has_avatar) {
        db.prepare(
          'UPDATE users SET avatar_data = ?, nickname = ?, gender = ?, age = ? WHERE id = ?'
        ).run(avatar, u.nickname, u.gender, u.age, existing.id);
        console.log(`  ✅ ${u.username} (${u.nickname}) 头像已更新`);
      }
      skipped += 1;
      continue;
    }

    db.prepare(
      `INSERT INTO users (username, password, nickname, gender, age, role, avatar_data, avatar_style)
       VALUES (?, ?, ?, ?, ?, 'user', ?, ?)`
    ).run(
      u.username,
      defaultPass,
      u.nickname,
      u.gender,
      u.age,
      avatar,
      Math.abs(u.username.length * COLOR_SEED_PRIME + u.age) % AVATAR_STYLE_COUNT
    );
    created += 1;
    console.log(`  ✨ ${u.username} (${u.nickname}) 已创建 + 头像`);
  }

  save();
  console.log(`\n✅ 完成：新增 ${created} 个用户，更新 ${skipped} 个已有用户`);
}

main().catch(e => { console.error(e); process.exit(1); });

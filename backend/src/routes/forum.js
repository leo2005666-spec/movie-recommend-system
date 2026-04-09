const express = require('express');
const db = require('../db/db');
const { authMiddleware, optionalAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { mapCommentUserAvatar } = require('../utils/userPublic');
const { logActivity } = require('../middleware/log');

const router = express.Router();
const BASE_TOPICS = [
  { key: 'actor', label: '演员', desc: '演技、角色、作品推荐、花絮趣谈' },
  { key: 'recommend', label: '求推荐', desc: '片荒求助、同类型安利、入坑顺序' },
  { key: 'review', label: '影评讨论', desc: '观点碰撞、细节解读、彩蛋挖掘' },
  { key: 'list', label: '片单', desc: '主题片单、年度十佳、必看清单' },
];

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

function normalizeTopicKey(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const base = BASE_TOPICS.find((t) => t.key === s);
  if (base) return base.key;
  if (/^movie:\d{1,9}$/.test(s)) return s;
  if (/^director:[\w .\-\u4e00-\u9fa5]{1,40}$/i.test(s)) return s;
  return '';
}

function svgAvatarData(username) {
  const name = String(username || 'U').trim() || 'U';
  const initial = name.slice(0, 1).toUpperCase();
  const seed = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;
  const hue2 = (hue + 42) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},85%,58%)"/><stop offset="1" stop-color="hsl(${hue2},85%,50%)"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/><text x="64" y="72" font-family="system-ui,Segoe UI,Arial" font-size="56" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-weight="800">${initial}</text></svg>`;
  const b64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

async function ensureSomeUserAvatars() {
  const rows = await db.prepare('SELECT id, username, avatar, avatar_data FROM users ORDER BY id ASC').all();
  const users = Array.isArray(rows) ? rows : [];
  let updated = 0;
  for (const u of users.slice(0, 8)) {
    const has = (u.avatar && String(u.avatar).trim()) || (u.avatar_data && String(u.avatar_data).trim());
    if (has) continue;
    const data = svgAvatarData(u.username);
    await db.prepare('UPDATE users SET avatar_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(data, u.id);
    updated += 1;
  }
  return updated;
}

async function buildTopics() {
  const hotMovie = await db.prepare(`
    SELECT id, title, tmdb_vote_count
    FROM movies
    ORDER BY COALESCE(tmdb_vote_count, 0) DESC, id DESC
    LIMIT 1
  `).get();
  const hotDirector = await db.prepare(`
    SELECT director, COUNT(*) as cnt
    FROM movies
    WHERE director IS NOT NULL AND TRIM(director) <> ''
    GROUP BY director
    ORDER BY cnt DESC
    LIMIT 1
  `).get();

  const out = [];
  if (hotMovie?.id && hotMovie?.title) {
    out.push({
      key: `movie:${hotMovie.id}`,
      label: `电影：${hotMovie.title}`,
      desc: '围绕这部电影聊剧情、细节、结局与彩蛋',
      kind: 'movie',
    });
  } else {
    out.push({ key: 'movie:0', label: '电影：热门作品', desc: '聊剧情、细节、结局与彩蛋', kind: 'movie' });
  }
  if (hotDirector?.director) {
    out.push({
      key: `director:${String(hotDirector.director).trim()}`,
      label: `导演：${String(hotDirector.director).trim()}`,
      desc: '聊导演风格、代表作与入坑顺序',
      kind: 'director',
    });
  } else {
    out.push({ key: 'director:热门导演', label: '导演：热门导演', desc: '聊风格、代表作与入坑顺序', kind: 'director' });
  }
  out.push(...BASE_TOPICS.map((t) => ({ ...t, kind: 'base' })));
  return out;
}

function normalizeThreadRow(r) {
  if (!r) return r;
  return mapCommentUserAvatar(r);
}

function normalizeReplyRow(r) {
  if (!r) return r;
  return mapCommentUserAvatar(r);
}

router.get('/threads', optionalAuth, asyncHandler(async (req, res) => {
  const page = clamp(parseInt(req.query.page || '1', 10) || 1, 1, 200);
  const limit = clamp(parseInt(req.query.limit || '20', 10) || 20, 5, 50);
  const offset = (page - 1) * limit;
  const sort = String(req.query.sort || 'latest').toLowerCase();
  const topicKey = normalizeTopicKey(req.query.topic);
  const orderBy = sort === 'hot'
    ? 'reply_cnt DESC, t.id DESC'
    : 't.id DESC';

  const whereSql = topicKey ? 'WHERE t.topic_key = ?' : '';
  const params = topicKey ? [topicKey, limit, offset] : [limit, offset];
  const rows = await db.prepare(`
    SELECT t.id, t.user_id, u.username, u.avatar, u.avatar_data, u.avatar_style,
           u.updated_at AS user_updated_at,
           t.topic_key, t.title, t.content, t.created_at,
           (SELECT COUNT(*) FROM forum_replies r WHERE r.thread_id = t.id) AS reply_cnt
    FROM forum_threads t
    INNER JOIN users u ON u.id = t.user_id
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params);
  const total = topicKey
    ? ((await db.prepare('SELECT COUNT(*) as n FROM forum_threads WHERE topic_key = ?').get(topicKey))?.n ?? 0)
    : ((await db.prepare('SELECT COUNT(*) as n FROM forum_threads').get())?.n ?? 0);
  res.json({ code: 0, data: { list: (rows || []).map(normalizeThreadRow), total, page, limit } });
}));

router.get('/topics', optionalAuth, asyncHandler(async (req, res) => {
  const TOPICS = await buildTopics();
  const counts = await db.prepare(`
    SELECT topic_key, COUNT(*) as cnt
    FROM forum_threads
    WHERE topic_key IS NOT NULL AND TRIM(topic_key) <> ''
    GROUP BY topic_key
  `).all();
  const byKey = Object.fromEntries((counts || []).map((r) => [String(r.topic_key), Number(r.cnt) || 0]));
  const list = TOPICS.map((t) => ({ ...t, thread_cnt: byKey[t.key] || 0 }));
  res.json({ code: 0, data: list });
}));

router.get('/threads/:id', optionalAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) return res.status(400).json({ code: 400, message: '无效帖子 ID' });

  const thread = await db.prepare(`
    SELECT t.id, t.user_id, u.username, u.avatar, u.avatar_data, u.avatar_style,
           u.updated_at AS user_updated_at,
           t.topic_key, t.title, t.content, t.created_at
    FROM forum_threads t
    INNER JOIN users u ON u.id = t.user_id
    WHERE t.id = ?
  `).get(id);
  if (!thread) return res.status(404).json({ code: 404, message: '帖子不存在' });

  const replies = await db.prepare(`
    SELECT r.id, r.thread_id, r.user_id, u.username, u.avatar, u.avatar_data, u.avatar_style,
           u.updated_at AS user_updated_at,
           r.parent_id, r.content, r.created_at
    FROM forum_replies r
    INNER JOIN users u ON u.id = r.user_id
    WHERE r.thread_id = ?
    ORDER BY r.id ASC
  `).all(id);

  res.json({ code: 0, data: { thread: normalizeThreadRow(thread), replies: (replies || []).map(normalizeReplyRow) } });
}));

router.post('/threads', authMiddleware, asyncHandler(async (req, res) => {
  const topicKey = normalizeTopicKey(req.body?.topic) || null;
  const title = String(req.body?.title || '').trim();
  const content = String(req.body?.content || '').trim();
  if (!title || title.length < 2 || title.length > 80) {
    return res.status(400).json({ code: 400, message: '标题需 2-80 字' });
  }
  if (!content || content.length < 1 || content.length > 4000) {
    return res.status(400).json({ code: 400, message: '内容需 1-4000 字' });
  }
  await db.prepare('INSERT INTO forum_threads (user_id, topic_key, title, content) VALUES (?, ?, ?, ?)').run(req.user.id, topicKey, title, content);
  const row = await db.prepare('SELECT last_insert_rowid() as id').get();
  await logActivity(req, 'FORUM_THREAD', 'forum', row.id, title);
  res.json({ code: 0, data: { id: row.id } });
}));

router.post('/threads/:id/replies', authMiddleware, asyncHandler(async (req, res) => {
  const threadId = parseInt(req.params.id, 10);
  if (!Number.isFinite(threadId) || threadId < 1) return res.status(400).json({ code: 400, message: '无效帖子 ID' });
  const content = String(req.body?.content || '').trim();
  const parentId = req.body?.parentId != null ? parseInt(req.body.parentId, 10) : null;
  if (!content || content.length < 1 || content.length > 2000) {
    return res.status(400).json({ code: 400, message: '回复需 1-2000 字' });
  }
  const th = await db.prepare('SELECT id, title FROM forum_threads WHERE id = ?').get(threadId);
  if (!th) return res.status(404).json({ code: 404, message: '帖子不存在' });
  if (parentId != null && Number.isFinite(parentId)) {
    const p = await db.prepare('SELECT id FROM forum_replies WHERE id = ? AND thread_id = ?').get(parentId, threadId);
    if (!p) return res.status(400).json({ code: 400, message: '父回复不存在' });
  }
  await db.prepare('INSERT INTO forum_replies (thread_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)').run(threadId, req.user.id, parentId, content);
  await db.prepare('UPDATE forum_threads SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(threadId);
  const row = await db.prepare('SELECT last_insert_rowid() as id').get();
  await logActivity(req, 'FORUM_REPLY', 'forum', threadId, content.slice(0, 50));
  res.json({ code: 0, data: { id: row.id } });
}));

router.post('/seed', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const threadsN = clamp(parseInt(req.body?.threads || '12', 10) || 12, 3, 60);
  const maxReplies = clamp(parseInt(req.body?.maxReplies || '10', 10) || 10, 2, 40);

  await ensureSomeUserAvatars();
  const TOPICS = await buildTopics();
  const users = await db.prepare('SELECT id, username FROM users ORDER BY id ASC').all();
  const userIds = (users || []).map((u) => u.id).filter((n) => Number.isFinite(n) && n > 0);
  if (!userIds.length) return res.status(400).json({ code: 400, message: '无可用用户' });

  const hotMovieTopic = TOPICS.find((t) => String(t.key).startsWith('movie:'))?.label?.replace(/^电影：/, '') || '这部电影';
  const hotDirectorTopic = TOPICS.find((t) => String(t.key).startsWith('director:'))?.label?.replace(/^导演：/, '') || '这位导演';

  const sampleTitles = [
    `《${hotMovieTopic}》结局你们怎么理解？`,
    `《${hotMovieTopic}》有哪些被忽略的细节？`,
    `${hotDirectorTopic} 的入坑顺序怎么排？`,
    `${hotDirectorTopic} 最强的一部是哪部？`,
    '大家最近看了什么？求推荐',
    '有没有类似风格的电影？',
    '你最喜欢的反转电影是哪部？',
    '周末想轻松一点，有没有喜剧推荐',
    '你会给这部片打几分？理由是？',
    '来聊聊你最喜欢的角色',
  ];
  const sampleBodies = [
    '我最近片荒了，想找点不踩雷的。大家有推荐吗？',
    '感觉前半段铺垫很多，后半段一下子爆发，挺爽的。',
    '我更喜欢这种节奏慢一点但情绪很足的片子。',
    '有些细节我没看懂，尤其是最后那一段，想听听你们的理解。',
    '我觉得评分有点虚高，但也可能是我没共鸣到点。',
    '配乐太加分了，氛围拉满。',
    '我最喜欢的是人物关系的变化，很真实。',
  ];
  const sampleReplies = [
    '同感！我也被最后那段震到了。',
    '我推荐你看一下同类型的经典片，风格很像。',
    '我觉得核心是“选择”，不是“结果”。',
    '我反而喜欢它不解释太明白，留点空间。',
    '如果喜欢这种氛围，可以试试导演的另一部。',
    '这部我给 4 分，情绪很到位。',
    '我当时看完缓了好久，后劲很大。',
  ];

  let createdThreads = 0;
  for (let i = 0; i < threadsN; i += 1) {
    const uid = userIds[i % userIds.length];
    const topicKey = TOPICS[i % TOPICS.length].key;
    const title = sampleTitles[i % sampleTitles.length];
    const content = sampleBodies[(i * 3) % sampleBodies.length] + '\n\n' + sampleBodies[(i * 5 + 1) % sampleBodies.length];
    await db.prepare('INSERT INTO forum_threads (user_id, topic_key, title, content) VALUES (?, ?, ?, ?)').run(uid, topicKey, title, content);
    const tidRow = await db.prepare('SELECT last_insert_rowid() as id').get();
    const tid = tidRow?.id;
    if (!tid) continue;

    const repliesN = 3 + (i % Math.min(7, maxReplies));
    let lastParent = null;
    for (let j = 0; j < repliesN; j += 1) {
      const ruid = userIds[(i + j + 1) % userIds.length];
      const body = sampleReplies[(i + j) % sampleReplies.length];
      const parentId = j % 4 === 3 ? lastParent : null;
      await db.prepare('INSERT INTO forum_replies (thread_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)').run(tid, ruid, parentId, body);
      const ridRow = await db.prepare('SELECT last_insert_rowid() as id').get();
      lastParent = ridRow?.id ?? lastParent;
    }
    createdThreads += 1;
  }

  res.json({ code: 0, data: { createdThreads }, message: '已生成论坛虚拟对话' });
}));

module.exports = router;


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

async function enrichThreadTopics(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const movieIds = [];
  const directorKeys = [];
  for (const r of list) {
    const tk = String(r.topic_key || '').trim();
    if (/^movie:\d+$/.test(tk)) {
      const mid = parseInt(tk.split(':')[1], 10);
      if (Number.isFinite(mid) && mid > 0) movieIds.push(mid);
    } else if (tk.startsWith('director:')) {
      directorKeys.push(tk);
    }
  }
  const uniqMovieIds = [...new Set(movieIds)];
  const movieTitleById = {};
  if (uniqMovieIds.length) {
    const ph = uniqMovieIds.map(() => '?').join(',');
    const mrows = await db.prepare(`SELECT id, title FROM movies WHERE id IN (${ph})`).all(...uniqMovieIds);
    (mrows || []).forEach((m) => { movieTitleById[m.id] = m.title; });
  }

  const baseByKey = Object.fromEntries(BASE_TOPICS.map((t) => [t.key, t]));
  return list.map((r) => {
    const tk = String(r.topic_key || '').trim();
    let topic_label = '讨论';
    let topic_display = '';
    if (/^movie:\d+$/.test(tk)) {
      const mid = parseInt(tk.split(':')[1], 10);
      const title = movieTitleById[mid] || '某部电影';
      topic_label = '电影';
      topic_display = `《${title}》`;
    } else if (tk.startsWith('director:')) {
      const name = tk.slice('director:'.length);
      topic_label = '导演';
      topic_display = String(name || '').trim();
    } else if (baseByKey[tk]) {
      topic_label = baseByKey[tk].label;
      topic_display = baseByKey[tk].label;
    }
    return { ...r, topic_label, topic_display };
  });
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
  const normalized = (rows || []).map(normalizeThreadRow);
  const enriched = await enrichThreadTopics(normalized);
  res.json({ code: 0, data: { list: enriched, total, page, limit } });
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

  const tNorm = normalizeThreadRow(thread);
  const [tEnriched] = await enrichThreadTopics([tNorm]);
  res.json({ code: 0, data: { thread: tEnriched, replies: (replies || []).map(normalizeReplyRow) } });
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

router.delete('/threads/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const threadId = parseInt(req.params.id, 10);
  if (!Number.isFinite(threadId) || threadId < 1) {
    return res.status(400).json({ code: 400, message: '无效帖子 ID' });
  }
  const th = await db.prepare('SELECT id, title FROM forum_threads WHERE id = ?').get(threadId);
  if (!th) return res.status(404).json({ code: 404, message: '帖子不存在' });

  await db.prepare('DELETE FROM forum_replies WHERE thread_id = ?').run(threadId);
  await db.prepare('DELETE FROM forum_threads WHERE id = ?').run(threadId);
  await logActivity(req, 'FORUM_THREAD_DELETE', 'forum', threadId, String(th.title || '').slice(0, 80));
  res.json({ code: 0, message: '帖子已删除' });
}));

router.delete('/replies/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const replyId = parseInt(req.params.id, 10);
  if (!Number.isFinite(replyId) || replyId < 1) {
    return res.status(400).json({ code: 400, message: '无效回复 ID' });
  }
  const root = await db.prepare('SELECT id, thread_id, content FROM forum_replies WHERE id = ?').get(replyId);
  if (!root) return res.status(404).json({ code: 404, message: '回复不存在' });

  // 删除当前回复及其所有子回复，避免孤儿节点
  const allRows = await db.prepare('SELECT id, parent_id FROM forum_replies WHERE thread_id = ?').all(root.thread_id);
  const byParent = new Map();
  for (const r of allRows || []) {
    const pid = r.parent_id == null ? 0 : Number(r.parent_id);
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(Number(r.id));
  }
  const toDelete = new Set([replyId]);
  const stack = [replyId];
  while (stack.length) {
    const cur = stack.pop();
    const kids = byParent.get(cur) || [];
    for (const kid of kids) {
      if (toDelete.has(kid)) continue;
      toDelete.add(kid);
      stack.push(kid);
    }
  }
  const ids = [...toDelete];
  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    await db.prepare(`DELETE FROM forum_replies WHERE id IN (${ph})`).run(...ids);
  }
  await db.prepare('UPDATE forum_threads SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(root.thread_id);
  await logActivity(req, 'FORUM_REPLY_DELETE', 'forum', root.thread_id, String(root.content || '').slice(0, 80));
  res.json({ code: 0, data: { deleted: ids.length }, message: '回复已删除' });
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

  const titlePoolByKind = {
    movie: [
      `《${hotMovieTopic}》结局你们怎么理解？`,
      `《${hotMovieTopic}》最打动你的是哪一段？`,
      `《${hotMovieTopic}》有哪些细节二刷才懂？`,
      `《${hotMovieTopic}》如果删掉一个情节会更好吗？`,
    ],
    director: [
      `${hotDirectorTopic} 的入坑顺序怎么排？`,
      `${hotDirectorTopic} 最强的一部是哪部？`,
      `${hotDirectorTopic} 的风格你更喜欢哪一面？`,
    ],
    recommend: [
      '大家最近看了什么？求推荐',
      '想找一部不太烧脑但有反转的片子，有吗？',
      '有没有节奏舒服、后劲很大的电影？',
    ],
    review: [
      '评分高但我没看懂，是我问题吗？',
      '这部片的主题到底是什么？我有点纠结',
      '来聊聊你最喜欢的角色',
    ],
    actor: [
      '这位演员的演技巅峰是哪部？',
      '同一个演员在不同作品里差别太大了',
    ],
    list: [
      '想做一个“周末轻松片单”，你会放哪些？',
      '年度十佳怎么选？欢迎互相安利',
    ],
  };

  const bodyPoolByKind = {
    movie: [
      `我想认真聊聊《${hotMovieTopic}》。我最在意的是“动机”那块：前面铺垫很多，但最后的选择让我有点纠结。`,
      `《${hotMovieTopic}》我看完后劲很大。不是爽片那种，是会反复回想一些台词和镜头。`,
      `我觉得《${hotMovieTopic}》最强的是节奏：前半段像在慢慢把你带进去，后半段情绪一下子拉满。`,
    ],
    director: [
      `${hotDirectorTopic} 的片子我感觉都有一种共同气质：看似冷静，但情绪很克制地往里走。`,
      `想问问大家：${hotDirectorTopic} 如果只看一部入坑，选哪部最合适？`,
    ],
    recommend: [
      '我最近片荒了，想找点不踩雷的。最好节奏舒服一点、情绪到位一点。',
      '不想看太烧脑的，但也不想太平。有没有“好看又不累”的推荐？',
    ],
    review: [
      '我有点两极分化：很多地方喜欢，但也有些地方觉得解释不够清楚。想听听你们的理解。',
      '我更关心它想表达什么，而不是情节本身。大家觉得它的核心是什么？',
    ],
    actor: [
      '这位演员的表演细节很厉害，你们有哪部印象最深？',
      '同一个演员在不同作品里的气质差别很大，怎么做到的？',
    ],
    list: [
      '想整理一个片单：适合周末晚上放松的那种。你会推荐哪些？',
      '如果只能给朋友推荐 3 部不踩雷的，你会选什么？',
    ],
  };

  const replyPoolByKind = {
    movie: [
      `我也在聊《${hotMovieTopic}》。我更站“主题”这一边，结局其实是为了把主题推到极致。`,
      `关于《${hotMovieTopic}》我同意你说的节奏，后半段那个点一下就把前面都串起来了。`,
      `我觉得《${hotMovieTopic}》留白是优点，不解释太死反而更真实。`,
    ],
    director: [
      `如果聊 ${hotDirectorTopic}，我建议先看他/她更“好入口”的那部，再看更实验的。`,
      `${hotDirectorTopic} 的强项是气氛营造和细节，很多镜头不是为了推进情节，而是为了情绪。`,
    ],
    generic: [
      '同感！我也是这样想的。',
      '我不太同意，不过你的角度挺有意思。',
      '这个点我之前没注意到，准备二刷。',
      '我更喜欢它的配乐和氛围，真的加分。',
    ],
  };

  const existing = await db.prepare('SELECT topic_key, title FROM forum_threads ORDER BY id DESC LIMIT 400').all();
  const existsSet = new Set((existing || []).map((r) => `${String(r.topic_key || '')}||${String(r.title || '')}`));

  let createdThreads = 0;
  for (let i = 0; i < threadsN; i += 1) {
    const uid = userIds[i % userIds.length];
    const topicKey = TOPICS[i % TOPICS.length].key;
    const kind = String(topicKey).startsWith('movie:') ? 'movie'
      : String(topicKey).startsWith('director:') ? 'director'
        : (BASE_TOPICS.find((t) => t.key === topicKey)?.key || 'review');
    const titlePool = titlePoolByKind[kind] || titlePoolByKind.review;
    const bodyPool = bodyPoolByKind[kind] || bodyPoolByKind.review;
    let title = titlePool[i % titlePool.length];
    const content = bodyPool[(i * 3) % bodyPool.length] + '\n\n' + bodyPool[(i * 5 + 1) % bodyPool.length];

    // 避免重复标题：如已存在则加后缀
    const baseKey = `${topicKey}||${title}`;
    if (existsSet.has(baseKey)) {
      title = `${title}（第${(i % 9) + 2}聊）`;
    }
    existsSet.add(`${topicKey}||${title}`);

    await db.prepare('INSERT INTO forum_threads (user_id, topic_key, title, content) VALUES (?, ?, ?, ?)').run(uid, topicKey, title, content);
    const tidRow = await db.prepare('SELECT last_insert_rowid() as id').get();
    const tid = tidRow?.id;
    if (!tid) continue;

    const repliesN = 3 + (i % Math.min(7, maxReplies));
    let lastParent = null;
    for (let j = 0; j < repliesN; j += 1) {
      const ruid = userIds[(i + j + 1) % userIds.length];
      const pool = kind === 'movie'
        ? [...replyPoolByKind.movie, ...replyPoolByKind.generic]
        : kind === 'director'
          ? [...replyPoolByKind.director, ...replyPoolByKind.generic]
          : replyPoolByKind.generic;
      const body = pool[(i + j) % pool.length];
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


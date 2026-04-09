const express = require('express');
const db = require('../db/db');
const { authMiddleware, optionalAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { mapCommentUserAvatar } = require('../utils/userPublic');
const { logActivity } = require('../middleware/log');

const router = express.Router();

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
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
  const orderBy = sort === 'hot'
    ? 'reply_cnt DESC, t.id DESC'
    : 't.id DESC';

  const rows = await db.prepare(`
    SELECT t.id, t.user_id, u.username, u.avatar, u.avatar_data, u.avatar_style,
           u.updated_at AS user_updated_at,
           t.title, t.content, t.created_at,
           (SELECT COUNT(*) FROM forum_replies r WHERE r.thread_id = t.id) AS reply_cnt
    FROM forum_threads t
    INNER JOIN users u ON u.id = t.user_id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  const total = (await db.prepare('SELECT COUNT(*) as n FROM forum_threads').get())?.n ?? 0;
  res.json({ code: 0, data: { list: (rows || []).map(normalizeThreadRow), total, page, limit } });
}));

router.get('/threads/:id', optionalAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) return res.status(400).json({ code: 400, message: '无效帖子 ID' });

  const thread = await db.prepare(`
    SELECT t.id, t.user_id, u.username, u.avatar, u.avatar_data, u.avatar_style,
           u.updated_at AS user_updated_at,
           t.title, t.content, t.created_at
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
  const title = String(req.body?.title || '').trim();
  const content = String(req.body?.content || '').trim();
  if (!title || title.length < 2 || title.length > 80) {
    return res.status(400).json({ code: 400, message: '标题需 2-80 字' });
  }
  if (!content || content.length < 1 || content.length > 4000) {
    return res.status(400).json({ code: 400, message: '内容需 1-4000 字' });
  }
  await db.prepare('INSERT INTO forum_threads (user_id, title, content) VALUES (?, ?, ?)').run(req.user.id, title, content);
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

  const users = await db.prepare('SELECT id, username FROM users ORDER BY id ASC').all();
  const userIds = (users || []).map((u) => u.id).filter((n) => Number.isFinite(n) && n > 0);
  if (!userIds.length) return res.status(400).json({ code: 400, message: '无可用用户' });

  const sampleTitles = [
    '大家最近看了什么？求推荐',
    '这部片结局你们怎么理解？',
    '有没有类似风格的电影？',
    '这位导演的入坑顺序怎么排？',
    '评分高但我没看懂，是我问题吗？',
    '周末想轻松一点，有没有喜剧推荐',
    '你最喜欢的反转电影是哪部？',
    '有没有看完会治愈一点的片子',
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
    const title = sampleTitles[i % sampleTitles.length];
    const content = sampleBodies[(i * 3) % sampleBodies.length] + '\n\n' + sampleBodies[(i * 5 + 1) % sampleBodies.length];
    await db.prepare('INSERT INTO forum_threads (user_id, title, content) VALUES (?, ?, ?)').run(uid, title, content);
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


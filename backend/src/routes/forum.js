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

  // 从数据库取真实电影名、导演名、演员名，确保讨论有具体内容
  const realMovies = await db.prepare(`
    SELECT id, title, director, actors, release_year
    FROM movies WHERE title IS NOT NULL AND TRIM(title) <> ''
    ORDER BY COALESCE(tmdb_vote_count, 0) DESC LIMIT 30
  `).all();
  const movieNames = (realMovies || []).map((m) => m.title).filter(Boolean);
  const directorNames = [...new Set((realMovies || []).map((m) => m.director).filter(Boolean))];
  const allActorNames = [...new Set(
    (realMovies || []).flatMap((m) => (m.actors || '').split(',').map((s) => s.trim()).filter(Boolean))
  )];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function mname() { return movieNames.length ? pick(movieNames) : '那部电影'; }
  function dname() { return directorNames.length ? pick(directorNames) : '那位导演'; }
  function aname() { return allActorNames.length ? pick(allActorNames) : '那位演员'; }

  // —— 标题池：每种话题 10+ 模板，嵌入真实片名/导演/演员 ——
  const _m = () => mname(); const _d = () => dname(); const _a = () => aname();

  const titlePool = {
    movie: [
      `《${_m()}》结局那段你们怎么看？`,
      `刚看完《${_m()}》，有点没缓过来`,
      `《${_m()}》是不是被低估了？`,
      `二刷《${_m()}》才发现好多细节`,
      `《${_m()}》和《${_m()}》哪个更值得看？`,
      `有没有人觉得《${_m()}》后劲特别大`,
      `《${_m()}》里最出彩的角色是谁？`,
      `聊一聊《${_m()}》的摄影和色调`,
      `《${_m()}》删减片段听说很关键`,
      `《${_m()}》的配乐真的绝了`,
      `为什么《${_m()}》评分两极分化？`,
      `《${_m()}》让我想起了另一部片`,
    ],
    director: [
      `${_d()} 的片子你们最喜欢哪部？`,
      `${_d()} 和 ${_d()} 的风格差异好大`,
      `入坑 ${_d()} 从哪部开始比较好？`,
      `${_d()} 的新片大家期待吗`,
      `有没有人觉得 ${_d()} 被过誉了？`,
      `${_d()} 的镜头语言真的很特别`,
      `聊聊 ${_d()} 的御用班底`,
      `${_d()} 早期的作品和现在差别好大`,
    ],
    recommend: [
      '剧荒了，求推荐几部不踩雷的',
      '有没有类似《'+_m()+'》这种风格的？',
      '想找一部节奏慢但后劲大的片',
      '周末宅家适合看什么？求安利',
      '最近有什么冷门但好看的片吗',
      '求推荐适合一个人安静看的电影',
      '有没有不恐怖但有反转的悬疑片？',
      '想找一部看完会觉得”活着真好”的电影',
      '最近片荒到刷老片了，救救我',
      '有没有笑中带泪的喜剧推荐？',
    ],
    review: [
      '高评分但我看完有点失望，有人同感吗',
      '大家都在夸的片我却get不到',
      '有些电影第一遍看不懂，第二遍才通',
      '你们会因为一个镜头爱上一部电影吗',
      '配乐对一部电影的影响到底多大？',
      '有没有哪部电影改变了你的想法？',
      '电影里的”留白”和”说不清”，你更喜欢哪种？',
      '你心中”完美的结局”是什么样的？',
      '为什么有些烂片反而反复看？',
      '看过最多次的电影是哪部？看了几遍？',
    ],
    actor: [
      `${_a()} 的演技真的好细腻`,
      `${_a()} 和 ${_a()} 对戏太精彩了`,
      '有没有演员让你因为TA去看一部片？',
      `${_a()} 最近几年的选片眼光怎么样？`,
      '同一个演员，哪部作品反差最大？',
      `${_a()} 的台词功底真的好`,
      '你们会因为讨厌一个演员而弃片吗',
      `${_a()} 拿奖那部实至名归吗？`,
    ],
    list: [
      '分享我的年度十佳，欢迎补充',
      '如果能回到过去，你会推荐哪10部给20岁的自己？',
      '一人推荐一部”改变你人生”的电影',
      '最适合下雨天看的片单',
      '”第一次看惊为天人，再看依然好”的片单',
      '你的”深夜emo必看”片单是什么？',
      '适合和爸妈一起看的电影有哪些？',
      '来互相安利：一人一部，不许重复',
    ],
  };

  // —— 正文池：更口语化、更有个人色彩 ——
  const bodyPool = {
    movie: [
      `刚刷完《${_m()}》，说真的，前半段我差点弃了，但后半段直接封神。那个镜头切换的节奏太舒服了，特别是结尾那段，我反复拉了三遍。有没有人跟我一样觉得最后的台词是精心设计的双关？`,
      `其实我一直想聊《${_m()}》。最大的感受是它没有把观众当傻子，很多情节留白让你自己去想。特别是关于选择的那场戏，主角什么都没说但什么都表达了。`,
      `看《${_m()}》的时候我一直在想：如果我是主角，我会做同样的选择吗？越想越觉得这个本子写得真好，没有绝对的对错，就是把人放在两难里。`,
      `不吐不快：《${_m()}》的配乐到底是谁做的？我从头听到尾，有几段直接起鸡皮疙瘩。感觉这片子一半的情绪是音乐带出来的。有没有人知道这个配乐团队还做过哪些片子？`,
      `昨天带朋友去看了《${_m()}》，他出来第一句话是”这什么玩意”，我差点跟他吵起来哈哈。但后来聊着聊着，他居然说想二刷了。这片子就是这种类型：第一遍可能get不到，越品越有味道。`,
      `《${_m()}》里面有个细节我太喜欢了：主角进房间之前看了一眼桌上照片，那一秒就交代了太多背景。现在的电影很少用这种方式讲故事了，都是直接旁白灌你一脸。`,
      `有没有人看了《${_m()}》之后去查了相关的真实事件/原著？我发现改编其实改了不少，但改得都挺合理。原著粉可能不太开心，但作为电影来说节奏确实更紧凑了。`,
      `可能是我过度解读了，但《${_m()}》里的颜色用得也太讲究了吧。开头冷色调，中间暖了一下，结尾又偏冷。我截了好多图当壁纸，这片子的摄影真的可以。`,
      `《${_m()}》里演员的微表情太强了。有一个镜头就两秒，但那个眼神直接让我破防了。很多人说这个演员只会一种演法，我觉得不是，这部里面明显跟之前的角色完全不一样。`,
      `关于《${_m()}》的结局，我看到网上至少三种解读。我觉得导演是故意的，留了一个开放式的结尾让你自己去选。这种处理方式比直接给答案高级太多了。`,
    ],
    director: [
      `最近重新按时间顺序看了一遍 ${_d()} 的作品，发现一个很有意思的点：早期的片子更注重故事，后期的片子更注重氛围。其实说不上哪个更好，就是风格在变。大家更喜欢哪个时期的TA？`,
      `${_d()} 给我最大的感觉是”克制”。很多导演特别喜欢用大特写、大配乐来煽情，但TA不一样，该收的时候就收，反而更有力量。有部片子里一个长镜头就拍主角的背影，走了快两分钟，但一点都不闷。`,
      `我觉得 ${_d()} 最被忽视的一部是早期的那部小成本。虽然制作糙了点，但故事的核特别硬，后来的几部大制作反而有点为了市场妥协了。有没有看过TA早期作品的朋友？`,
      `说真的，${_d()} 和 ${_d()} 虽然经常被拿来比较，但根本不是一个赛道的。前者更擅长人物刻画，后者的强项是叙事结构。非要比的话，看你想看什么类型的了。你们觉得呢？`,
    ],
    recommend: [
      '最近片荒了，翻了半天片库都找不到想看的。我喜欢那种节奏不赶、情绪细腻的片子，但也不能太闷。求推荐！最好能告诉我为什么推荐这部。',
      '刚看完一部，后劲太大了睡不着。需要一部轻松点的洗洗眼睛。有没有那种笑中带泪的喜剧？不要纯搞笑的，要有点内核的那种。',
      '最近心态有点崩，想看一部温暖治愈的片子缓一缓。不要鸡汤，要那种看完觉得生活还是很美好、但又不刻意的感觉。有没有推荐？',
      '跟朋友打赌输了要推荐一部片给他，他说要”看了觉得智商受到尊重但又不至于太累”的。这要求也太刁钻了吧…大家帮忙想想？',
    ],
    review: [
      '你们有没有那种体验：一部电影第一次看觉得一般，过了几年再看突然就懂了？我最近重看了几部以前不喜欢的片子，发现是我当时太年轻了。有些东西真的要经历点什么才能理解。',
      '其实我最喜欢聊的不是那些公认的神作，而是那些有争议的片子。因为大家的看法不一样才有的聊啊。如果所有人都说好，反而不想讨论了。你们有没有那种”我觉得很好但周围人都不喜欢”的片子？',
      '我看电影有一个习惯：好片子会故意隔一段时间再看第二遍。因为有些片子的味道需要沉淀，连续看反而会腻。你们一般怎么决定要不要二刷？',
      '你们会因为评分低而跳过一部片吗？我觉得影评和观众分有时候差距挺大的。有些片影评人很爱但观众不买账，有些反过来。你们更信影评还是观众评分？',
    ],
    actor: [
      `最近看了 ${_a()} 的几部片，发现TA在每个角色里的走路姿势都不一样。这种细节能做到的演员真不多。很多人只关注台词和表情，其实肢体语言才是最见功底的。大家有没有注意过这类细节？`,
      `我觉得 ${_a()} 最厉害的不是爆发戏，而是安静的戏。那种不说话但眼睛里全是戏的状态，真的需要很深的功底。最近一部里面TA坐在车里看着窗外，什么都没说，但那一幕我看哭了。`,
      `关于 ${_a()}，其实TA早期有一部被严重低估的作品。当时可能因为题材比较冷门或者宣传不够，票房一般，但表演是真的在线。有没有TA的老粉来聊聊？`,
    ],
    list: [
      '想跟大家一起建一个”适合下雨天窝在沙发上看”的片单。我先来：要那种色调偏暖、节奏不紧不慢、看完心里暖暖的类型。每人推一部吧，我整理起来！',
      '突发奇想：如果能给10年前的自己推荐10部电影，你会选哪些？不是为了装B或者显得有品位，而是真觉得那些电影改变了你、让你成为了现在的自己。',
      '你们有没有那种”每次别人问推荐电影都会脱口而出”的片子？就是那种不需要多想、第一反应就是它、而且推荐之后从来没被朋友吐槽过的。我有三部，等下写在评论区。',
    ],
  };

  // —— 回复池：不同风格，避免全是”同感” ——
  const replyPool = {
    agree_long: [
      `说的太好了。我也是这种感觉——这片子后劲真的大，看完之后好几天脑子里都是那些画面。特别是你提到的那个细节，我去翻了一下别人的解析，发现还有好多我没注意到的点。`,
      `完全同意！而且我觉得还有一个点：这种处理方式其实是在尊重观众的智商。现在太多电影把什么都说得明明白白，反而少了想象的空间。`,
      `对对对，终于有人说这个了！我一直在跟朋友安利这部，但他们都说太闷了。我也不知道怎么解释，就是你得静下心来看，它不是那种爆米花爽片。`,
      `握手🤝 我看的时候也是这个感受。而且你有没有注意到色调的变化？开头偏冷，越往后越暖。不是偶然的，应该是刻意设计的。`,
      `+1 但我补充一点：这种风格实际上对演员要求特别高。因为没有花里胡哨的特效和剪辑，观众注意力全在演员身上，演得稍微差一点就会被看出来。`,
    ],
    disagree_mild: [
      `我理解你的感受，但说实话我看完感觉不太一样。可能是我期待的方向不一样吧。我不是说这片子不好，就是觉得它想表达的跟我期待的不是一回事。`,
      `你说的有道理，但我有个不同的角度。我觉得这片子的问题可能不是节奏慢，而是它在前半段给了观众一个错误预期。如果你是冲着XXX去看的，可能会有点落差。`,
      `嗯…我持保留意见。不过你让我想重看一遍了。有时候第一遍会被某个细节影响整体感受，第二遍可能更客观。`,
      `我其实觉得一般般，但你的分析挺有意思。可能是我太在意剧情逻辑了，忽略了视觉语言的部分。周末重新看一遍再来说。`,
    ],
    question: [
      `好奇问一下：你说的那个情节，在原著/真实事件里是怎么处理的？改编和原版哪个更好？`,
      `那你觉得如果换个导演来拍这个故事，会是什么样的？我脑补了一下如果是 ${_d()} 来拍，感觉完全不一样。`,
      `问个题外话：你们看电影一般会提前看影评和剧透吗？还是完全空白的去看？我两种都试过，感觉体验差别挺大的。`,
      `补充一个问题：这部片子的配乐是不是原创的？有几段我感觉在哪听过但想不起来。配乐团队好像跟 ${_d()} 合作过好几次？`,
    ],
    shift_topic: [
      `说起来，这让我想到另一部题材类似的片子。虽然风格完全不同，但核心想表达的东西挺像的。你们觉得同一主题用不同风格来拍，效果会差很多吗？`,
      `歪个楼，你们觉不觉得近几年的电影在摄影方面越来越讲究了？画面都很好看，但有时候感觉故事反而弱了。画面和剧情，你们更看重哪个？`,
      `这让我想起前阵子跟朋友讨论的一个话题：看电影到底是看故事还是看情绪？有些片子没什么剧情但情绪做到了极致，一样能打动我。你们怎么看？`,
      `聊这么细真的让我又想去看一遍了。我觉得好片子就是这样，每次看都能发现新的东西。你们有没有看过十遍以上的电影？是啥？`,
    ],
    recommend_inline: [
      `推荐一部风格类似的：《${_m()}》。虽然题材不一样，但给我的感觉挺像的，都是有质感的慢片。如果你喜欢这种类型的，应该也会喜欢这部。`,
      `插一句，如果你喜欢这个导演/演员，一定要去看TA那部《${_m()}》。虽然比较冷门，但我觉得是TA最好的作品之一。`,
      `推荐一部冷门但是神作级别的：《${_m()}》。跟这部其实有种呼应的感觉，但表达方式完全不同。有空的话建议找来看看。`,
    ],
  };

  const existing = await db.prepare('SELECT topic_key, title FROM forum_threads ORDER BY id DESC LIMIT 400').all();
  const existsSet = new Set((existing || []).map((r) => `${String(r.topic_key || '')}||${String(r.title || '')}`));

  // 给每个话题分配权重：电影和推荐类更多（更活跃）
  const weightedKind = () => {
    const r = Math.random();
    if (r < 0.30) return 'movie';
    if (r < 0.50) return 'recommend';
    if (r < 0.65) return 'review';
    if (r < 0.78) return 'director';
    if (r < 0.88) return 'actor';
    return 'list';
  };

  let createdThreads = 0;
  for (let i = 0; i < threadsN; i += 1) {
    const uid = userIds[i % userIds.length];
    const kind = weightedKind();
    const topicKey = (() => {
      if (kind === 'movie') {
        const m = realMovies?.[i % realMovies.length];
        return m?.id ? `movie:${m.id}` : TOPICS[i % TOPICS.length].key;
      }
      if (kind === 'director') {
        const dn = directorNames[i % directorNames.length] || '热门导演';
        return `director:${dn}`;
      }
      return (BASE_TOPICS.find((t) => t.key === kind) || BASE_TOPICS[0]).key;
    })();

    // 动态生成标题：每次取新的电影名/导演名/演员名
    const titleTemplates = titlePool[kind] || titlePool.review;
    const title = titleTemplates[i % titleTemplates.length];

    // 动态生成正文：正文池 + 适当的换行分段
    const bodyTemplates = bodyPool[kind] || bodyPool.review;
    const p1 = bodyTemplates[i % bodyTemplates.length];
    const p2 = bodyTemplates[(i * 3 + 2) % bodyTemplates.length];
    const content = p1 !== p2 ? p1 + '\n\n' + p2 : p1;

    // 避免标题完全重复
    let finalTitle = title;
    const baseKey = `${topicKey}||${finalTitle}`;
    if (existsSet.has(baseKey)) {
      finalTitle = title + `（续）`;
    }
    existsSet.add(`${topicKey}||${finalTitle}`);

    await db.prepare('INSERT INTO forum_threads (user_id, topic_key, title, content) VALUES (?, ?, ?, ?)').run(uid, topicKey, finalTitle, content);
    const tidRow = await db.prepare('SELECT last_insert_rowid() as id').get();
    const tid = tidRow?.id;
    if (!tid) continue;

    // 生成回复链：3~8条，混合不同风格
    const repliesN = 3 + Math.floor(Math.random() * Math.min(6, maxReplies - 2));
    let lastParent = null;
    for (let j = 0; j < repliesN; j += 1) {
      const ruid = userIds[(i + j + 1) % userIds.length];

      // 混合回复风格：60% 长回复，20% 温和反对，10% 提问，5% 推荐，5% 歪楼
      const rTypeRand = Math.random();
      let pool;
      if (rTypeRand < 0.55) {
        pool = replyPool.agree_long;
      } else if (rTypeRand < 0.75) {
        pool = replyPool.disagree_mild;
      } else if (rTypeRand < 0.88) {
        pool = replyPool.question;
      } else if (rTypeRand < 0.95) {
        pool = replyPool.recommend_inline;
      } else {
        pool = replyPool.shift_topic;
      }

      const body = pool[(i * 3 + j * 7) % pool.length];
      // 约 1/3 的回复是楼中楼
      const parentId = j > 0 && Math.random() < 0.35 ? lastParent : null;
      await db.prepare('INSERT INTO forum_replies (thread_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)').run(tid, ruid, parentId, body);
      const ridRow = await db.prepare('SELECT last_insert_rowid() as id').get();
      if (parentId == null) lastParent = ridRow?.id ?? lastParent;
    }
    createdThreads += 1;
  }

  res.json({ code: 0, data: { createdThreads }, message: '已生成论坛对话' });
}));

module.exports = router;


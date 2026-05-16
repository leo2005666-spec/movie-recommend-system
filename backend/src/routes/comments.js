/**
 * 评论功能：用户对影视作品进行简要评价（可选配图，Base64 存库与头像一致，避免无盘环境丢失）
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, optionalAuth, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { asyncHandler } = require('../utils/asyncHandler');
const { mapCommentUserAvatar } = require('../utils/userPublic');

const router = express.Router();

const DATA_IMG_RE = /^data:image\/(jpeg|png|gif|webp);base64,/i;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 450 * 1024;

function parseStoredImages(imagesCell) {
  if (imagesCell == null || String(imagesCell).trim() === '') return [];
  try {
    const p = JSON.parse(imagesCell);
    if (!Array.isArray(p)) return [];
    return p.filter((x) => typeof x === 'string' && DATA_IMG_RE.test(x));
  } catch {
    return [];
  }
}

function normalizeCommentRow(row) {
  if (!row) return row;
  const { images: raw, ...rest } = row;
  return { ...rest, images: parseStoredImages(raw) };
}

function validateCommentImagesPayload(raw) {
  if (raw == null || raw === undefined) return [];
  if (!Array.isArray(raw)) {
    const err = new Error('配图须为数组');
    err.status = 400;
    throw err;
  }
  if (raw.length > MAX_IMAGES) {
    const err = new Error(`最多上传 ${MAX_IMAGES} 张配图`);
    err.status = 400;
    throw err;
  }
  const out = [];
  for (const s of raw) {
    if (typeof s !== 'string' || !DATA_IMG_RE.test(s)) {
      const err = new Error('配图仅支持 jpg、png、gif、webp 的 Base64 数据');
      err.status = 400;
      throw err;
    }
    const parts = s.split(',');
    const b64 = parts[1];
    if (!b64) {
      const err = new Error('配图数据无效');
      err.status = 400;
      throw err;
    }
    const approx = (b64.length * 3) / 4;
    if (approx > MAX_IMAGE_BYTES) {
      const err = new Error('单张配图须小于 450KB，请压缩后重试');
      err.status = 400;
      throw err;
    }
    out.push(s);
  }
  return out;
}

/** 热门影评：最新发表的评论，跨作品，带电影信息 */
router.get('/hot', optionalAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(5, parseInt(req.query.limit) || 8));
  const rows = await db.prepare(`
    SELECT c.id, c.user_id, u.username, u.avatar, u.avatar_data, u.avatar_style,
           u.updated_at AS user_updated_at,
           c.content, c.created_at, c.images, c.movie_id,
           m.title as movie_title
    FROM comments c
    INNER JOIN users u ON c.user_id = u.id
    INNER JOIN movies m ON c.movie_id = m.id
    ORDER BY c.id DESC
    LIMIT ?
  `).all(limit);
  const list = rows.map((r) => normalizeCommentRow(mapCommentUserAvatar(r)));
  res.json({ code: 0, data: list });
}));

// 获取某作品的评论列表
router.get('/movie/:movieId', optionalAuth, asyncHandler(async (req, res) => {
  const movieId = parseInt(req.params.movieId);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  const rows = await db.prepare(`
    SELECT c.id, c.user_id, u.username, u.avatar, u.avatar_data, u.avatar_style,
           u.updated_at AS user_updated_at,
           c.parent_id, c.reply_to_user_id,
           ru.username AS reply_to_username,
           pc.content AS parent_content,
           c.content, c.created_at, c.images,
           r.score AS rating_score
    FROM comments c
    INNER JOIN users u ON c.user_id = u.id
    LEFT JOIN users ru ON ru.id = c.reply_to_user_id
    LEFT JOIN comments pc ON pc.id = c.parent_id
    LEFT JOIN ratings r ON r.user_id = c.user_id AND r.movie_id = c.movie_id
    WHERE c.movie_id = ?
    ORDER BY c.id DESC LIMIT ? OFFSET ?
  `).all(movieId, limit, offset);

  const list = rows.map((r) => normalizeCommentRow(mapCommentUserAvatar(r)));
  const total = (await db.prepare('SELECT COUNT(*) as n FROM comments WHERE movie_id = ?').get(movieId)).n;
  res.json({ code: 0, data: { list, total, page, limit } });
}));

// 发表评论（需登录）；images 可选，为 data:image/*;base64,... 数组
router.post('/', authMiddleware, [
  body('movieId').isInt(),
  body('content').trim().isLength({ min: 1, max: 2000 }),
  body('parentId').optional(),
  body('replyToUserId').optional(),
  body('images').optional(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ code: 400, message: '评论1-2000字' });
  const { movieId, content, images: rawImages } = req.body;
  const parentId = req.body?.parentId != null ? parseInt(req.body.parentId, 10) : null;
  const replyToUserId = req.body?.replyToUserId != null ? parseInt(req.body.replyToUserId, 10) : null;
  let imageArr;
  try {
    imageArr = validateCommentImagesPayload(rawImages);
  } catch (e) {
    return res.status(e.status || 400).json({ code: e.status || 400, message: e.message || '配图无效' });
  }

  const movie = await db.prepare('SELECT id, title FROM movies WHERE id = ?').get(movieId);
  if (!movie) return res.status(404).json({ code: 404, message: '作品不存在' });

  let safeParentId = null;
  let safeReplyToUserId = null;
  if (parentId != null && Number.isFinite(parentId) && parentId > 0) {
    const parent = await db.prepare('SELECT id, user_id, movie_id FROM comments WHERE id = ?').get(parentId);
    if (!parent || Number(parent.movie_id) !== Number(movieId)) {
      return res.status(400).json({ code: 400, message: '父评论不存在' });
    }
    safeParentId = parent.id;
    safeReplyToUserId = replyToUserId && Number.isFinite(replyToUserId) ? replyToUserId : parent.user_id;
  }

  const imagesJson = imageArr.length > 0 ? JSON.stringify(imageArr) : null;
  await db.prepare('INSERT INTO comments (user_id, movie_id, parent_id, reply_to_user_id, content, images) VALUES (?, ?, ?, ?, ?, ?)').run(
    req.user.id,
    movieId,
    safeParentId,
    safeReplyToUserId,
    content,
    imagesJson
  );
  const row = await db.prepare('SELECT last_insert_rowid() as id').get();
  await logActivity(req, 'COMMENT', 'movie', movieId, content.slice(0, 50));
  res.json({ code: 0, data: { id: row.id }, message: '评论成功' });
}));

// 删除自己的评论
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const comment = await db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  if (!comment) return res.status(404).json({ code: 404, message: '评论不存在' });
  if (comment.user_id !== req.user.id) {
    return res.status(403).json({ code: 403, message: '只能删除自己的评论' });
  }
  await db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  await logActivity(req, 'DELETE_COMMENT', 'comment', id, '');
  res.json({ code: 0, message: '已删除' });
}));

// 管理员：为某部作品生成一批“讨论式”评论（含回复），用于冷启动撑场面
router.post('/seed', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const movieId = parseInt(req.body?.movieId, 10);
  if (!Number.isFinite(movieId) || movieId < 1) {
    return res.status(400).json({ code: 400, message: '缺少 movieId' });
  }
  const rootsN = Math.min(30, Math.max(3, parseInt(req.body?.roots || 8, 10) || 8));
  const maxReplies = Math.min(30, Math.max(2, parseInt(req.body?.maxReplies || 10, 10) || 10));

  const movie = await db.prepare('SELECT id, title FROM movies WHERE id = ?').get(movieId);
  if (!movie) return res.status(404).json({ code: 404, message: '作品不存在' });

  const users = await db.prepare('SELECT id, username FROM users ORDER BY id ASC').all();
  const userIds = (Array.isArray(users) ? users : []).map((u) => u.id).filter((n) => Number.isFinite(n) && n > 0);
  if (userIds.length < 2) return res.status(400).json({ code: 400, message: '用户太少，无法生成对话' });

  const rootTexts = [
    '刚看完，导演的功力真的没话说，每个镜头都经得起琢磨。',
    '这部片我有点两极分化，前半段铺垫略长，但后半段太炸了。',
    '配乐和画面配合得太好了，有几个段落我反复拉回去看。',
    '结局处理得真妙，不是那种廉价的圆满，而是让人回味很久。',
    '不剧透地说一句：有几个伏笔埋得太好了，二刷才能发现。',
    '角色塑造很强，尤其是配角，每个人都有自己的高光时刻。',
    '摄影很讲究，光影的运用让我想起了一些欧洲文艺片。',
    '如果你喜欢这种类型，强烈建议补导演的其他作品，风格一脉相承。',
    '刚带朋友二刷完，他第一次看被震撼到了，我第二次看又发现了新细节。',
    '说实话，比近几年同类型的大多数作品都强，剧本很扎实。',
    '演员的表演很有层次感，不是那种表面化的情绪输出。',
    '看之前期望不高但看完很惊喜，这种”意外的好看”最让人开心。',
    '故事节奏把控得很准，张弛有度，两个小时一下子就过去了。',
    '有几个场景拍得特别有诗意，导演的审美真的好。',
    '看完之后一直在想某个情节，这种”后劲大”的电影越来越少了。',
    '服化道太用心了，每个场景都能看出来预算花在了刀刃上。',
  ];
  const replyTexts = [
    '同感！我也是这么想的，尤其你提到的那一点。',
    '我觉得重点是”选择”背后的动机，不只是结果。',
    '我当时没注意到你说的这个细节，回头我得再刷一遍。',
    '我反而喜欢它留白的处理方式，不把话说死让人更有想象空间。',
    '给4分，属于会主动推荐给朋友的作品。',
    '我更吃这种娓娓道来的叙事，比快节奏的商业片有味道。',
    '我不太同意你的看法，但你说的确实有道理。',
    '哈哈哈这段我也笑了，气氛调节得恰到好处。',
    '说的太好了，完全说出了我的感受。',
    '我看的时候也有类似的感觉，握手！',
    '你的解读角度很新颖，我之前没想到这一点。',
    '是的！！我二刷的时候才发现这个细节，导演埋得太深了。',
    '同类型的片子我也看了不少，这部确实在细节上更用心。',
    '评论写得好认真，给你点赞。我也觉得这部的演员阵容很强。',
    '我在电影院里看到这一幕的时候周围都在倒吸冷气。',
    '这已经是我今年最爱的电影之一了，后劲太大了。',
  ];

  let created = 0;
  for (let i = 0; i < rootsN; i += 1) {
    const uid = userIds[i % userIds.length];
    const content = rootTexts[i % rootTexts.length];
    await db.prepare('INSERT INTO comments (user_id, movie_id, parent_id, reply_to_user_id, content, images) VALUES (?, ?, NULL, NULL, ?, NULL)')
      .run(uid, movieId, content);
    const ridRow = await db.prepare('SELECT last_insert_rowid() as id').get();
    const rootId = ridRow?.id;
    if (!rootId) continue;
    created += 1;

    const repliesN = 2 + (i % Math.min(6, maxReplies));
    let lastReplyUserId = uid;
    for (let j = 0; j < repliesN; j += 1) {
      const ruid = userIds[(i + j + 1) % userIds.length];
      const rcontent = replyTexts[(i + j) % replyTexts.length];
      await db.prepare('INSERT INTO comments (user_id, movie_id, parent_id, reply_to_user_id, content, images) VALUES (?, ?, ?, ?, ?, NULL)')
        .run(ruid, movieId, rootId, lastReplyUserId, rcontent);
      lastReplyUserId = ruid;
    }
  }

  await logActivity(req, 'SEED_COMMENTS', 'movie', movieId, `seed ${created} roots`);
  res.json({ code: 0, data: { createdRoots: created }, message: '已生成影评对话' });
}));

module.exports = router;

/**
 * 影视作品信息管理：CRUD、分类标签、详情展示
 * 支持 tasteType 人群口味快捷筛选（学生党、上班族、家庭、情侣、影迷）
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { authMiddleware, requireAdmin, optionalAuth } = require('../middleware/auth');
const { logActivity } = require('../middleware/log');
const { getTasteFilterIds } = require('../utils/taste-presets');

const router = express.Router();

// 封面代理：解决外部图床防盗链/CORS/网络加载失败
// 先直连，失败则通过 wsrv.nl 全球 CDN 代理拉取
router.get('/:id/cover', async (req, res) => {
  const id = parseInt(req.params.id);
  const row = db.prepare('SELECT cover FROM movies WHERE id = ?').get(id);
  if (!row?.cover) {
    return res.status(404).send('No cover');
  }
  const src = row.cover;

  async function tryFetch(url) {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(r.status);
    return { buf: Buffer.from(await r.arrayBuffer()), ct: r.headers.get('content-type') || 'image/jpeg' };
  }

  for (const url of [src, 'https://wsrv.nl/?url=' + encodeURIComponent(src)]) {
    try {
      const { buf, ct } = await tryFetch(url);
      res.set('Content-Type', ct);
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(buf);
    } catch (_) {
      continue;
    }
  }
  res.status(502).send('Failed to fetch cover');
});

// 获取影视列表（支持分页、分类、标签、人群口味 tasteType 筛选）
router.get('/', optionalAuth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(500, Math.max(10, parseInt(req.query.limit) || 12));
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : null;
  const tagId = req.query.tagId ? parseInt(req.query.tagId) : null;
  const keyword = req.query.keyword ? req.query.keyword.trim() : null;
  const tasteType = (req.query.tasteType || '').trim();
  const offset = (page - 1) * limit;

  let sql = `
    SELECT m.id, m.title, m.cover, m.description, m.release_year, m.director, m.duration, m.created_at
    FROM movies m
  `;
  const params = [];
  const conditions = [];

  // 人群口味：匹配预设分类或标签的影视
  const { categoryIds: tasteCategoryIds, tagIds: tasteTagIds } = tasteType
    ? getTasteFilterIds(db, tasteType)
    : { categoryIds: [], tagIds: [] };

  if (tasteCategoryIds.length > 0 || tasteTagIds.length > 0) {
    const subQueries = [];
    if (tasteCategoryIds.length > 0) {
      const ph = tasteCategoryIds.map(() => '?').join(',');
      subQueries.push(`m.id IN (SELECT movie_id FROM movie_categories WHERE category_id IN (${ph}))`);
      params.push(...tasteCategoryIds);
    }
    if (tasteTagIds.length > 0) {
      const ph = tasteTagIds.map(() => '?').join(',');
      subQueries.push(`m.id IN (SELECT movie_id FROM movie_tags WHERE tag_id IN (${ph}))`);
      params.push(...tasteTagIds);
    }
    conditions.push('(' + subQueries.join(' OR ') + ')');
  }

  if (categoryId) {
    sql += ' INNER JOIN movie_categories mc ON m.id = mc.movie_id AND mc.category_id = ?';
    params.push(categoryId);
  }
  if (tagId) {
    sql += ' INNER JOIN movie_tags mt ON m.id = mt.movie_id AND mt.tag_id = ?';
    params.push(tagId);
  }
  if (keyword) {
    conditions.push('(m.title LIKE ? OR m.description LIKE ? OR m.director LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' GROUP BY m.id ORDER BY m.id DESC';
  const countSql = 'SELECT COUNT(*) as n FROM (' + sql + ') t';
  const total = db.prepare(countSql).get(...params)?.n ?? 0;

  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const list = db.prepare(sql).all(...params);

  // 附加分类和标签
  for (const m of list) {
    m.categories = db.prepare(`
      SELECT c.id, c.name FROM categories c
      INNER JOIN movie_categories mc ON c.id = mc.category_id WHERE mc.movie_id = ?
    `).all(m.id);
    m.tags = db.prepare(`
      SELECT t.id, t.name FROM tags t
      INNER JOIN movie_tags mt ON t.id = mt.tag_id WHERE mt.movie_id = ?
    `).all(m.id);
    if (req.user) {
      const r = db.prepare('SELECT score FROM ratings WHERE user_id = ? AND movie_id = ?').get(req.user.id, m.id);
      m.myScore = r ? r.score : null;
      m.isFavorite = !!db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND movie_id = ?').get(req.user.id, m.id);
    }
  }

  res.json({ code: 0, data: { list, total, page, limit } });
});

// 获取单个影视详情
router.get('/:id', optionalAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
  if (!movie) return res.status(404).json({ code: 404, message: '作品不存在' });

  movie.categories = db.prepare(`
    SELECT c.id, c.name FROM categories c
    INNER JOIN movie_categories mc ON c.id = mc.category_id WHERE mc.movie_id = ?
  `).all(id);
  movie.tags = db.prepare(`
    SELECT t.id, t.name FROM tags t
    INNER JOIN movie_tags mt ON t.id = mt.tag_id WHERE mt.movie_id = ?
  `).all(id);
  if (req.user) {
    const r = db.prepare('SELECT score FROM ratings WHERE user_id = ? AND movie_id = ?').get(req.user.id, id);
    movie.myScore = r ? r.score : null;
    movie.isFavorite = !!db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND movie_id = ?').get(req.user.id, id);
  }
  res.json({ code: 0, data: movie });
});

// 管理员：新增影视
router.post('/', authMiddleware, requireAdmin, [
  body('title').trim().notEmpty(),
  body('description').optional().trim(),
  body('cover').optional().trim(),
  body('release_year').optional().isInt(),
  body('director').optional().trim(),
  body('actors').optional().trim(),
  body('duration').optional().isInt(),
  body('categoryIds').optional().isArray(),
  body('tagIds').optional().isArray(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ code: 400, message: errors.array()[0].msg });
  const { title, cover, description, release_year, director, actors, duration, categoryIds = [], tagIds = [] } = req.body;
  db.prepare(`
    INSERT INTO movies (title, cover, description, release_year, director, actors, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, cover || null, description || null, release_year || null, director || null, actors || null, duration || null);
  const id = db.prepare('SELECT last_insert_rowid() as id').get().id;
  for (const cid of categoryIds) {
    db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, ?)').run(id, cid);
  }
  for (const tid of tagIds) {
    db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(id, tid);
  }
  logActivity(req, 'CREATE_MOVIE', 'movie', id, title);
  res.json({ code: 0, data: { id } });
});

// 管理员：修改影视
router.put('/:id', authMiddleware, requireAdmin, [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('cover').optional().trim(),
  body('release_year').optional().isInt(),
  body('director').optional().trim(),
  body('actors').optional().trim(),
  body('duration').optional().isInt(),
  body('categoryIds').optional().isArray(),
  body('tagIds').optional().isArray(),
], (req, res) => {
  const id = parseInt(req.params.id);
  if (!db.prepare('SELECT 1 FROM movies WHERE id = ?').get(id)) {
    return res.status(404).json({ code: 404, message: '作品不存在' });
  }
  const { title, cover, description, release_year, director, actors, duration, categoryIds, tagIds } = req.body;
  const updates = [];
  const values = [];
  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (cover !== undefined) { updates.push('cover = ?'); values.push(cover); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (release_year !== undefined) { updates.push('release_year = ?'); values.push(release_year); }
  if (director !== undefined) { updates.push('director = ?'); values.push(director); }
  if (actors !== undefined) { updates.push('actors = ?'); values.push(actors); }
  if (duration !== undefined) { updates.push('duration = ?'); values.push(duration); }
  if (updates.length) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE movies SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  if (Array.isArray(categoryIds)) {
    db.prepare('DELETE FROM movie_categories WHERE movie_id = ?').run(id);
    for (const cid of categoryIds) {
      db.prepare('INSERT INTO movie_categories (movie_id, category_id) VALUES (?, ?)').run(id, cid);
    }
  }
  if (Array.isArray(tagIds)) {
    db.prepare('DELETE FROM movie_tags WHERE movie_id = ?').run(id);
    for (const tid of tagIds) {
      db.prepare('INSERT INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(id, tid);
    }
  }
  logActivity(req, 'UPDATE_MOVIE', 'movie', id, '修改影视信息');
  res.json({ code: 0, message: '已更新' });
});

// 管理员：删除影视
router.delete('/:id', authMiddleware, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  db.prepare('DELETE FROM movie_categories WHERE movie_id = ?').run(id);
  db.prepare('DELETE FROM movie_tags WHERE movie_id = ?').run(id);
  db.prepare('DELETE FROM movies WHERE id = ?').run(id);
  logActivity(req, 'DELETE_MOVIE', 'movie', id, '删除影视');
  res.json({ code: 0, message: '已删除' });
});

module.exports = router;

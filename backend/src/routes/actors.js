/**
 * 演员详情：聚合 TMDB 人物信息 + 本站已入库的参演作品
 * GET /api/actors/:tmdbPersonId
 */
const express = require('express');
const db = require('../db/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_IMG = 'https://image.tmdb.org/t/p';

router.get('/:tmdbPersonId', asyncHandler(async (req, res) => {
  const pid = parseInt(req.params.tmdbPersonId, 10);
  if (Number.isNaN(pid) || pid < 1) {
    return res.status(400).json({ code: 400, message: '无效的演员 ID' });
  }
  if (!TMDB_API_KEY) {
    return res.status(503).json({ code: 503, message: '服务器未配置 TMDB_API_KEY，无法加载演员详情' });
  }

  const [pRes, cRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/person/${pid}?api_key=${TMDB_API_KEY}&language=zh-CN`),
    fetch(`https://api.themoviedb.org/3/person/${pid}/movie_credits?api_key=${TMDB_API_KEY}&language=zh-CN`),
  ]);

  if (!pRes.ok) {
    return res.status(404).json({ code: 404, message: '未找到该演员（TMDB）' });
  }

  const p = await pRes.json();
  const person = {
    tmdb_id: p.id,
    name: p.name,
    also_known_as: p.also_known_as || [],
    biography: p.biography || '',
    birthday: p.birthday || null,
    deathday: p.deathday || null,
    place_of_birth: p.place_of_birth || null,
    profile_path: p.profile_path ? `${TMDB_IMG}/w500${p.profile_path}` : null,
    known_for_department: p.known_for_department || null,
  };

  let tmdbCast = [];
  if (cRes.ok) {
    const c = await cRes.json();
    tmdbCast = (c.cast || [])
      .filter((x) => x && x.id)
      .map((m) => ({
        tmdb_id: m.id,
        title: m.title || m.original_title,
        release_date: m.release_date || null,
        character: m.character || '',
        poster_path: m.poster_path ? `${TMDB_IMG}/w300${m.poster_path}` : null,
      }));
  }

  const tmdbIds = [...new Set(tmdbCast.map((x) => x.tmdb_id))];
  const metaByTmdb = {};
  for (const row of tmdbCast) {
    if (!metaByTmdb[row.tmdb_id]) metaByTmdb[row.tmdb_id] = row;
  }

  let ourMovies = [];
  if (tmdbIds.length) {
    const placeholders = tmdbIds.map(() => '?').join(',');
    const rows = await db.prepare(`
      SELECT id, title, cover, release_year, release_date, tmdb_id, description
      FROM movies WHERE tmdb_id IN (${placeholders})
    `).all(...tmdbIds);
    const byTmdb = Object.fromEntries(rows.map((r) => [r.tmdb_id, r]));

    ourMovies = tmdbIds
      .map((tid) => {
        const local = byTmdb[tid];
        const tm = metaByTmdb[tid];
        if (!local) return null;
        return {
          ...local,
          character: tm?.character || '',
          tmdb_poster_path: tm?.poster_path || null,
        };
      })
      .filter(Boolean);

    ourMovies.sort((a, b) => {
      const da = String(a.release_date || `${a.release_year || 0}-01-01`);
      const db = String(b.release_date || `${b.release_year || 0}-01-01`);
      return db.localeCompare(da);
    });
  }

  res.json({
    code: 0,
    data: {
      person,
      /** 本站片库中已收录、且 TMDB  credits 中出现的电影 */
      movies: ourMovies,
      /** TMDB 中参演电影总数（含未入库） */
      tmdb_movie_credits_count: tmdbCast.length,
    },
  });
}));

module.exports = router;

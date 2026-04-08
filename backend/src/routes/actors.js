/**
 * 演员详情：聚合 TMDB 人物信息 + 本站已入库的参演作品
 * GET /api/actors/:tmdbPersonId
 */
const express = require('express');
const db = require('../db/db');
const { asyncHandler } = require('../utils/asyncHandler');
const { fetchPersonAwardsFromTmdbWeb, absolutizeTmdbPath } = require('../utils/tmdbPersonAwards');

const router = express.Router();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_IMG = 'https://image.tmdb.org/t/p';

/** 人物奖项与提名（解析 TMDB 官网奖项页 HTML，与 TMDB 展示一致） */
router.get('/:tmdbPersonId/awards', asyncHandler(async (req, res) => {
  const pid = parseInt(req.params.tmdbPersonId, 10);
  if (Number.isNaN(pid) || pid < 1) {
    return res.status(400).json({ code: 400, message: '无效的演员 ID' });
  }

  let raw;
  try {
    raw = await fetchPersonAwardsFromTmdbWeb(pid);
  } catch (e) {
    console.error('[actors/awards]', pid, e.message);
    return res.status(502).json({ code: 502, message: e.message || '拉取 TMDB 奖项页失败' });
  }

  const tmdbIds = new Set();
  raw.groups.forEach((g) => {
    g.entries.forEach((e) => {
      if (e.movie_tmdb_id) tmdbIds.add(e.movie_tmdb_id);
    });
  });

  const localByTmdb = {};
  if (tmdbIds.size) {
    const ids = [...tmdbIds];
    const placeholders = ids.map(() => '?').join(',');
    const rawRows = await db.prepare(`SELECT id, tmdb_id FROM movies WHERE tmdb_id IN (${placeholders})`).all(...ids);
    const rows = Array.isArray(rawRows) ? rawRows : [];
    rows.forEach((r) => {
      localByTmdb[r.tmdb_id] = r.id;
    });
  }

  const groups = raw.groups.map((g) => ({
    organization_name: g.organization_name,
    organization_path: g.organization_path,
    organization_url: absolutizeTmdbPath(g.organization_path),
    organization_logo_url: g.organization_logo_url,
    entries: g.entries.map((e) => ({
      ...e,
      movie_local_id: e.movie_tmdb_id != null ? localByTmdb[e.movie_tmdb_id] ?? null : null,
      ceremony_url: absolutizeTmdbPath(e.ceremony_path),
      category_url: absolutizeTmdbPath(e.category_path),
    })),
  }));

  res.json({
    code: 0,
    data: {
      nomination_count: raw.nomination_count,
      win_count: raw.win_count,
      summary_text: raw.summary_text,
      groups,
      source: raw.source,
    },
  });
}));

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
  /** TMDB gender: 0 未设 1 女 2 男 */
  let genderLabel = null;
  if (p.gender === 1) genderLabel = '女';
  else if (p.gender === 2) genderLabel = '男';

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
    gender: genderLabel,
    homepage: p.homepage || null,
    imdb_id: p.imdb_id || null,
    popularity: typeof p.popularity === 'number' ? p.popularity : null,
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
        poster_path: m.poster_path ? `${TMDB_IMG}/w92${m.poster_path}` : null,
      }));
  }

  const tmdbIds = [...new Set(tmdbCast.map((x) => x.tmdb_id))];
  const metaByTmdb = {};
  for (const row of tmdbCast) {
    if (!metaByTmdb[row.tmdb_id]) metaByTmdb[row.tmdb_id] = row;
  }

  let byTmdb = {};
  if (tmdbIds.length) {
    const placeholders = tmdbIds.map(() => '?').join(',');
    const rows = await db.prepare(`
      SELECT id, title, cover, release_year, release_date, tmdb_id, description
      FROM movies WHERE tmdb_id IN (${placeholders})
    `).all(...tmdbIds);
    byTmdb = Object.fromEntries(rows.map((r) => [r.tmdb_id, r]));
  }

  let ourMovies = tmdbIds
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

  /** 完整参演片单（与 TMDB 电影 credits 一致），标注是否已入库 */
  const seen = new Set();
  const filmography = [];
  for (const m of tmdbCast) {
    if (seen.has(m.tmdb_id)) continue;
    seen.add(m.tmdb_id);
    const local = byTmdb[m.tmdb_id];
    const y = m.release_date && m.release_date.length >= 4 ? m.release_date.slice(0, 4) : '—';
    filmography.push({
      tmdb_id: m.tmdb_id,
      title: m.title,
      release_date: m.release_date,
      release_year_label: y,
      character: m.character || '',
      poster_thumb: m.poster_path,
      in_library: !!local,
      local_id: local ? local.id : null,
    });
  }
  filmography.sort((a, b) => {
    const da = a.release_date || '0000-01-01';
    const db = b.release_date || '0000-01-01';
    return db.localeCompare(da);
  });

  res.json({
    code: 0,
    data: {
      person,
      movies: ourMovies,
      filmography,
      tmdb_movie_credits_count: tmdbCast.length,
      tmdb_person_url: `https://www.themoviedb.org/person/${p.id}`,
    },
  });
}));

module.exports = router;

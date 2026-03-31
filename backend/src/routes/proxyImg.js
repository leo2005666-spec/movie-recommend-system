/**
 * 图片代理：前端直连 TMDB / 部分外站图标在国内易被墙，经后端拉取再返回
 * GET /api/proxy-img?u=<encodeURIComponent(https://...)>
 */
const express = require('express');
const { URL } = require('url');

const router = express.Router();

const ALLOWED_HOSTS = new Set([
  'image.tmdb.org',
  /** TMDB 官网奖项页等使用的图片 CDN（与 image.tmdb.org 并存） */
  'media.themoviedb.org',
  'logo.clearbit.com',
  'www.google.com',
]);

function isAllowedUrl(href) {
  try {
    const u = new URL(href);
    if (u.protocol !== 'https:') return false;
    if (!ALLOWED_HOSTS.has(u.hostname)) return false;
    if (u.hostname === 'www.google.com' && !u.pathname.startsWith('/s2/favicons')) return false;
    return true;
  } catch {
    return false;
  }
}

router.get('/', async (req, res) => {
  const raw = req.query.u;
  if (!raw || typeof raw !== 'string') {
    return res.status(400).send('missing u');
  }
  let target;
  try {
    target = decodeURIComponent(raw);
  } catch {
    return res.status(400).send('bad u');
  }
  if (!isAllowedUrl(target)) {
    return res.status(403).send('host not allowed');
  }
  try {
    const r = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovieRecommend/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return res.status(502).send('upstream');
    const ct = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());
    res.set('Content-Type', ct.split(';')[0].trim());
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    return res.send(buf);
  } catch (e) {
    console.error('[proxy-img]', e.message);
    return res.status(502).send('fetch failed');
  }
});

module.exports = router;

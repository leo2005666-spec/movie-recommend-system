import { useEffect, useMemo, useState } from 'react';
import { api, getCoverUrl, getProxiedImageUrl } from '../api/request';
import { AUTH_PAGE_POSTER_URLS, splitPostersIntoColumns } from '../constants/authPagePosters';

/** 3 列固定宫格 */
const COLS = 3;
/** 每列 4 行：总计 12 张 */
const ROWS = 4;
const VISIBLE_COUNT = COLS * ROWS;
/** 池子容量：多拉一些电影确保有足够不重复封面 */
const FETCH_LIMIT = 120;
/** 封面宽度 */
const COVER_W = 220;
/** 低频整体刷新：默认 1 小时 */
const REFRESH_MS = Math.max(
  60 * 60 * 1000,
  Number(import.meta.env.VITE_AUTH_FILMFLOW_REFRESH_MS || 60 * 60 * 1000)
);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** TMDB 图片 URL 路径最后一段，用于识别同图不同尺寸 */
function posterPathToken(url) {
  if (!url || typeof url !== 'string') return '';
  // 只对 TMDB 图片 URL 生效
  if (!/themoviedb\.org/i.test(url)) return '';
  const s = url.split('?')[0];
  const seg = s.split('/').filter(Boolean).pop();
  return seg || '';
}

/**
 * 从电影列表提取不重复封面。
 * 去重依据：本地 id、tmdb_id、标题规范化、TMDB 海报 token
 * 修复：posterPathToken 只对 TMDB 原始 URL 生效，跳过代理 URL
 */
function uniqueCoverUrlsFromMovies(movies) {
  const out = [];
  const seenId = new Set();
  const seenTmdb = new Set();
  const seenTitle = new Set();
  const seenPosterToken = new Set();

  for (const m of movies) {
    if (!m || m.id == null) continue;
    const id = Number(m.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (seenId.has(id)) continue;

    const tid = m.tmdb_id != null ? Number(m.tmdb_id) : null;
    if (tid != null && Number.isFinite(tid) && tid > 0) {
      if (seenTmdb.has(tid)) continue;
    }

    // 标题去重：名同内容大概率同
    const tkey = String(m.title || '').trim().toLowerCase().replace(/\s+/g, '');
    if (tkey && seenTitle.has(tkey)) continue;

    // 用 TMDB 原始封面 URL 做海报级别的去重（原始 cover 字段，非代理 URL）
    const rawCover = m.cover;
    const pt = posterPathToken(rawCover);
    if (pt && seenPosterToken.has(pt)) continue;

    seenId.add(id);
    if (tid != null && Number.isFinite(tid) && tid > 0) seenTmdb.add(tid);
    if (tkey) seenTitle.add(tkey);
    if (pt) seenPosterToken.add(pt);

    // 最终展示用代理 URL
    out.push(getCoverUrl(m, { w: COVER_W }));
  }
  return out;
}

function resolvePosterSrc(raw) {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return getProxiedImageUrl(raw);
  return raw;
}

/**
 * 从池中选 count 张不重复的，以 token 去重
 */
function pickVisibleUnique(pool, count) {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const uniq = [];
  const seen = new Set();
  for (const u of pool) {
    const t = posterPathToken(u) || u; // 非 TMDB URL 用自身做 key
    if (t && !seen.has(t)) {
      seen.add(t);
      uniq.push(u);
    }
  }
  // 不足时用静态海报池补齐
  if (uniq.length < count) {
    const extras = shuffle([...AUTH_PAGE_POSTER_URLS]).filter((u) => {
      const t = posterPathToken(u) || u;
      return t && !seen.has(t);
    });
    for (const u of extras) {
      const t = posterPathToken(u) || u;
      if (t) seen.add(t);
      uniq.push(u);
      if (uniq.length >= count) break;
    }
  }
  const start = Math.floor(Math.random() * uniq.length);
  const rotated = [...uniq.slice(start), ...uniq.slice(0, start)];
  return rotated.slice(0, count);
}

function FlowPoster({ posterUrl, fallbackPool, priority }) {
  const [attempt, setAttempt] = useState(0);
  const chain = useMemo(() => {
    const first = posterUrl;
    const rest = fallbackPool.filter((u) => u !== first);
    return [first, ...rest].filter(Boolean);
  }, [posterUrl, fallbackPool]);

  if (attempt >= chain.length) {
    return <div className="auth-split__filmflow-ph" aria-hidden />;
  }

  const raw = chain[attempt];
  const src = resolvePosterSrc(raw);

  if (!src) {
    return <div className="auth-split__filmflow-ph" aria-hidden />;
  }

  return (
    <img
      src={src}
      alt=""
      className="auth-split__filmflow-img"
      loading="eager"
      decoding="async"
      draggable={false}
      {...(priority ? { fetchPriority: 'high' } : {})}
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}

export default function AuthFilmflow() {
  const [posterPool, setPosterPool] = useState(() => shuffle([...AUTH_PAGE_POSTER_URLS]));
  const [visiblePosters, setVisiblePosters] = useState(() =>
    pickVisibleUnique(shuffle([...AUTH_PAGE_POSTER_URLS]), VISIBLE_COUNT)
  );

  // 首次挂载从后端拉取真实电影封面，尽量用不同的排序维度拉更多样
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r1, r2, r3] = await Promise.all([
          api.get('/movies', { page: 1, limit: FETCH_LIMIT, orderBy: 'popular' }),
          api.get('/movies', { page: 1, limit: FETCH_LIMIT, orderBy: 'top_rated' }),
          api.get('/movies', { page: 1, limit: FETCH_LIMIT, orderBy: 'release_desc' }),
        ]);
        const list = [
          ...(Array.isArray(r1?.data?.list) ? r1.data.list : []),
          ...(Array.isArray(r2?.data?.list) ? r2.data.list : []),
          ...(Array.isArray(r3?.data?.list) ? r3.data.list : []),
        ];
        let covers = uniqueCoverUrlsFromMovies(list);
        covers = shuffle(covers);
        if (!cancelled && covers.length >= 12) {
          setPosterPool(covers);
        }
      } catch {
        /* 保持初始静态池 */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // fallbackPool：去重后的可用池
  const fallbackPool = useMemo(() => {
    const raw = posterPool.length ? posterPool : AUTH_PAGE_POSTER_URLS;
    const uniq = [];
    const seen = new Set();
    for (const u of raw) {
      const t = posterPathToken(u) || u;
      if (!u || seen.has(t)) continue;
      seen.add(t);
      uniq.push(u);
    }
    return uniq;
  }, [posterPool]);

  // 池子变化时刷新可见选择
  useEffect(() => {
    setVisiblePosters(pickVisibleUnique(fallbackPool, VISIBLE_COUNT));
  }, [fallbackPool]);

  // 定时低频整体刷新（避免同一组图永远显示）
  useEffect(() => {
    if (!fallbackPool.length) return undefined;
    const timer = setInterval(() => {
      setVisiblePosters(pickVisibleUnique(fallbackPool, VISIBLE_COUNT));
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [fallbackPool]);

  const columns = useMemo(() => {
    const padded = [...visiblePosters];
    while (padded.length < VISIBLE_COUNT) padded.push('');
    return splitPostersIntoColumns(padded, COLS);
  }, [visiblePosters]);

  return (
    <div className="auth-split__filmflow" aria-hidden>
      {columns.map((urls, colIdx) => (
        <div key={colIdx} className="auth-split__filmflow-col">
          <div className="auth-split__filmflow-stack">
            {urls.map((url, i) => (
              <div key={`${colIdx}-${i}-${url}`} className="auth-split__filmflow-cell">
                <FlowPoster
                  posterUrl={url}
                  fallbackPool={fallbackPool}
                  priority={i < 4}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

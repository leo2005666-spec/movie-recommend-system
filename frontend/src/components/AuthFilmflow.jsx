import { useEffect, useMemo, useRef, useState } from 'react';
import { api, getCoverUrl, getProxiedImageUrl } from '../api/request';
import { AUTH_PAGE_POSTER_URLS, splitPostersIntoColumns } from '../constants/authPagePosters';

/** 3 列固定宫格 */
const COLS = 3;
/** 每列 4 行：总计 12 张，视觉稳定 */
const ROWS = 4;
const VISIBLE_COUNT = COLS * ROWS;
/** 控制总图数量，避免一次并发过多 */
const MAX_POSTERS = 24;
/** 封面宽度：登录侧卡片不大，略小像素加快首包 */
const COVER_W = 220;
/** 静态宫格：每次只替换一张，保持稳定感 */
const ROTATE_EVERY_MS = 2200;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normTitle(t) {
  return String(t || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** TMDB 路径最后一段，避免同一图不同尺寸被当成多部 */
function posterPathToken(url) {
  if (!url || typeof url !== 'string') return '';
  const s = url.split('?')[0];
  const seg = s.split('/').filter(Boolean).pop();
  return seg || s;
}

/**
 * 同一影片只保留一条：本地 id、tmdb_id、规范化标题、封面 URL、海报文件 token 任一重复则丢弃
 */
function uniqueCoverUrlsFromMovies(movies) {
  const out = [];
  const seenId = new Set();
  const seenTmdb = new Set();
  const seenTitle = new Set();
  const seenCover = new Set();
  const seenToken = new Set();

  for (const m of movies) {
    if (!m || m.id == null) continue;
    const id = Number(m.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (seenId.has(id)) continue;

    const tid = m.tmdb_id != null ? Number(m.tmdb_id) : null;
    if (tid != null && Number.isFinite(tid) && tid > 0) {
      if (seenTmdb.has(tid)) continue;
    }

    const tkey = normTitle(m.title);
    if (tkey && seenTitle.has(tkey)) continue;

    const u = getCoverUrl(m, { w: COVER_W });
    if (!u || seenCover.has(u)) continue;

    const ftoken = posterPathToken(u);
    if (ftoken && seenToken.has(ftoken)) continue;

    seenId.add(id);
    if (tid != null && Number.isFinite(tid) && tid > 0) seenTmdb.add(tid);
    if (tkey) seenTitle.add(tkey);
    seenCover.add(u);
    if (ftoken) seenToken.add(ftoken);
    out.push(u);
  }
  return out;
}

function resolvePosterSrc(raw) {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return getProxiedImageUrl(raw);
  return raw;
}

/** 条带在 overflow 内滚动，lazy 常导致解码很晚；首若干张优先加载 */
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
  const [visiblePosters, setVisiblePosters] = useState(() => shuffle([...AUTH_PAGE_POSTER_URLS]).slice(0, VISIBLE_COUNT));
  const replaceIndexRef = useRef(0);
  const poolCursorRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          api.get('/movies', { page: 1, limit: 80, orderBy: 'rating_desc' }),
          api.get('/movies', { page: 2, limit: 80, orderBy: 'release_desc' }),
        ]);
        const list = [
          ...(Array.isArray(r1?.data?.list) ? r1.data.list : []),
          ...(Array.isArray(r2?.data?.list) ? r2.data.list : []),
        ];
        let covers = uniqueCoverUrlsFromMovies(list);
        covers = shuffle(covers).slice(0, MAX_POSTERS);
        if (!cancelled && covers.length >= 12) {
          setPosterPool(covers);
        }
      } catch {
        /* 保持初始 TMDB 池 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fallbackPool = useMemo(() => {
    const raw = posterPool.length ? posterPool : AUTH_PAGE_POSTER_URLS;
    const uniq = [];
    const seen = new Set();
    for (const u of raw) {
      const t = posterPathToken(u);
      if (!u || seen.has(t)) continue;
      seen.add(t);
      uniq.push(u);
    }
    return uniq;
  }, [posterPool]);

  useEffect(() => {
    const initial = shuffle([...fallbackPool]).slice(0, VISIBLE_COUNT);
    setVisiblePosters(initial);
    replaceIndexRef.current = 0;
    poolCursorRef.current = 0;
  }, [fallbackPool]);

  useEffect(() => {
    if (!fallbackPool.length) return undefined;
    const timer = setInterval(() => {
      setVisiblePosters((prev) => {
        if (!prev.length) return prev;
        const next = [...prev];
        const used = new Set(next);
        let candidate = '';
        const maxTry = Math.max(fallbackPool.length, 1);
        for (let i = 0; i < maxTry; i += 1) {
          const idx = (poolCursorRef.current + i) % fallbackPool.length;
          const u = fallbackPool[idx];
          if (!used.has(u)) {
            candidate = u;
            poolCursorRef.current = (idx + 1) % fallbackPool.length;
            break;
          }
        }
        if (!candidate) return prev;
        const rep = replaceIndexRef.current % next.length;
        next[rep] = candidate;
        replaceIndexRef.current = (replaceIndexRef.current + 1) % next.length;
        return next;
      });
    }, ROTATE_EVERY_MS);
    return () => clearInterval(timer);
  }, [fallbackPool]);

  const columns = useMemo(() => splitPostersIntoColumns(visiblePosters, COLS), [visiblePosters]);

  return (
    <div className="auth-split__filmflow" aria-hidden>
      {columns.map((urls, colIdx) => {
        return (
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
        );
      })}
    </div>
  );
}

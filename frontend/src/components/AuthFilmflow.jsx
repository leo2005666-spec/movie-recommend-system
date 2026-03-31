import { useEffect, useMemo, useState } from 'react';
import { api, getCoverUrl, getProxiedImageUrl } from '../api/request';
import { AUTH_PAGE_POSTER_URLS, splitPostersIntoColumns } from '../constants/authPagePosters';

/** 3 列：更少 DOM、滚动更省资源 */
const COLS = 3;
const MAX_POSTERS = 36;
/** 各列滚动周期（秒），略拉长减轻卡顿感 */
const DURATIONS_SEC = [56, 72, 64];
const DELAY_SEC = [0, -22, -11];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 同一影片只保留一条：按本地 id；封面 URL 也去重（避免库内脏数据两张片同封面）
 */
function uniqueCoverUrlsFromMovies(movies) {
  const byId = new Map();
  const seenCover = new Set();
  for (const m of movies) {
    if (!m || m.id == null) continue;
    const id = Number(m.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (byId.has(id)) continue;
    const u = getCoverUrl(m, { w: 300 });
    if (!u || seenCover.has(u)) continue;
    seenCover.add(u);
    byId.set(id, u);
  }
  return [...byId.values()];
}

function resolvePosterSrc(raw) {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return getProxiedImageUrl(raw);
  return raw;
}

function FlowPoster({ posterUrl, fallbackPool }) {
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
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}

export default function AuthFilmflow() {
  const [posterPool, setPosterPool] = useState(() => shuffle([...AUTH_PAGE_POSTER_URLS]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          api.get('/movies', { page: 1, limit: 80, orderBy: 'rating_desc' }),
          api.get('/movies', { page: 2, limit: 80, orderBy: 'rating_desc' }),
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

  const columns = useMemo(() => splitPostersIntoColumns(posterPool, COLS), [posterPool]);

  const fallbackPool = useMemo(() => [...new Set(posterPool.length ? posterPool : AUTH_PAGE_POSTER_URLS)], [posterPool]);

  return (
    <div className="auth-split__filmflow" aria-hidden>
      {columns.map((urls, colIdx) => {
        const loop = [...urls, ...urls];
        const duration = DURATIONS_SEC[colIdx % DURATIONS_SEC.length];
        const delay = DELAY_SEC[colIdx % DELAY_SEC.length];
        return (
          <div key={colIdx} className="auth-split__filmflow-col">
            <div
              className="auth-split__filmflow-track"
              style={{
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
            >
              {loop.map((url, i) => (
                <div key={`${colIdx}-${i}-${url}`} className="auth-split__filmflow-cell">
                  <FlowPoster posterUrl={url} fallbackPool={fallbackPool} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

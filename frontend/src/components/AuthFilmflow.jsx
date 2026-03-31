import { useEffect, useMemo, useState } from 'react';
import { api, getCoverUrl, getProxiedImageUrl } from '../api/request';
import { AUTH_PAGE_POSTER_URLS, splitPostersIntoColumns } from '../constants/authPagePosters';

const COLS = 4;
/** 各列滚动周期（秒），错开避免齐步 */
const DURATIONS_SEC = [46, 60, 52, 68];
const DELAY_SEC = [0, -18, -9, -24];

function FlowPoster({ url, pool }) {
  const ib = pool.indexOf(url);
  const baseIndex = ib >= 0 ? ib : 0;
  const [skip, setSkip] = useState(0);
  const [dead, setDead] = useState(false);
  const idx = (baseIndex + skip) % pool.length;
  const raw = pool[idx];
  const src = /^https?:\/\//i.test(raw) ? getProxiedImageUrl(raw) : raw;

  if (dead) {
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
      onError={() => {
        setSkip((s) => {
          if (s + 1 >= pool.length) {
            setDead(true);
            return s;
          }
          return s + 1;
        });
      }}
    />
  );
}

export default function AuthFilmflow() {
  const [posterPool, setPosterPool] = useState(AUTH_PAGE_POSTER_URLS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get('/movies', { page: 1, limit: 120, orderBy: 'rating_desc' });
        const list = Array.isArray(r?.data?.list) ? r.data.list : [];
        const covers = [];
        const seen = new Set();
        for (const m of list) {
          if (!m?.id) continue;
          const key = `${m.tmdb_id || ''}-${m.id}-${m.title || ''}`;
          if (seen.has(key)) continue;
          seen.add(key);
          covers.push(getCoverUrl(m, { w: 342 }));
        }
        if (!cancelled && covers.length >= 16) {
          setPosterPool(covers);
        }
      } catch {
        /* 保持 TMDB 备用池 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo(() => splitPostersIntoColumns(posterPool, COLS), [posterPool]);

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
                <div key={`${colIdx}-${i}`} className="auth-split__filmflow-cell">
                  <FlowPoster url={url} pool={posterPool} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

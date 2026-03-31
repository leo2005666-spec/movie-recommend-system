import { useMemo, useState } from 'react';
import { getProxiedImageUrl } from '../api/request';
import { AUTH_PAGE_POSTER_URLS, splitPostersIntoColumns } from '../constants/authPagePosters';

const COLS = 3;
/** 各列滚动周期（秒），错开避免齐步 */
const DURATIONS_SEC = [48, 62, 54];
const DELAY_SEC = [0, -20, -10];

function FlowPoster({ url, pool }) {
  const base = Math.max(0, pool.indexOf(url));
  const [skip, setSkip] = useState(0);
  const [dead, setDead] = useState(false);
  const idx = (base + skip) % pool.length;
  const src = getProxiedImageUrl(pool[idx]);

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
  const columns = useMemo(() => splitPostersIntoColumns(AUTH_PAGE_POSTER_URLS, COLS), []);

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
                  <FlowPoster url={url} pool={AUTH_PAGE_POSTER_URLS} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

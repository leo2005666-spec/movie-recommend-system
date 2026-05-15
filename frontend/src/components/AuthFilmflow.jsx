import { useMemo } from 'react';
import { getProxiedImageUrl } from '../api/request';
import { AUTH_PAGE_POSTER_URLS, splitPostersIntoColumns } from '../constants/authPagePosters';

/** 3 列固定宫格 */
const COLS = 3;
/** 每列 4 行：总计 12 张 */
const ROWS = 4;
const VISIBLE_COUNT = COLS * ROWS;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 从池中选 count 张不重复的 */
function pickUnique(pool, count) {
  const seen = new Set();
  const result = [];
  for (const u of shuffle(pool)) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    result.push(u);
    if (result.length >= count) break;
  }
  return result;
}

export default function AuthFilmflow() {
  const visiblePosters = useMemo(
    () => pickUnique(AUTH_PAGE_POSTER_URLS, VISIBLE_COUNT),
    [],
  );

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
                {url ? (
                  <img
                    src={getProxiedImageUrl(url)}
                    alt=""
                    className="auth-split__filmflow-img"
                    loading="eager"
                    decoding="async"
                    draggable={false}
                    fetchPriority={i < 4 ? 'high' : undefined}
                  />
                ) : (
                  <div className="auth-split__filmflow-ph" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

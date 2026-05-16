import { useMemo, useCallback, useRef } from 'react';
import { getProxiedImageUrl } from '../api/request';
import { AUTH_PAGE_POSTER_URLS, splitPostersIntoColumns } from '../constants/authPagePosters';

/** 3 列固定宫格 */
const COLS = 3;
/** 每列 4 行：总计 12 张 */
const ROWS = 4;
const VISIBLE_COUNT = COLS * ROWS;

export default function AuthFilmflow() {
  // 固定取前 N 张，不随机 —— 任何时候登录看到的都是同样的海报
  const visiblePosters = useMemo(
    () => AUTH_PAGE_POSTER_URLS.slice(0, VISIBLE_COUNT),
    [],
  );

  const columns = useMemo(() => {
    const padded = [...visiblePosters];
    while (padded.length < VISIBLE_COUNT) padded.push('');
    return splitPostersIntoColumns(padded, COLS);
  }, [visiblePosters]);

  const failedRef = useRef(new Set());

  /**
   * 图片加载失败时：优先尝试走后端代理兜底，其次显示占位色块
   */
  const handleImgError = useCallback((e, url) => {
    if (!url) return;
    const img = e.currentTarget;
    const failed = failedRef.current;
    // 第一次失败：尝试代理
    if (!failed.has(url)) {
      failed.add(url);
      const proxyUrl = getProxiedImageUrl(url);
      if (proxyUrl && proxyUrl !== img.src) {
        img.src = proxyUrl;
        return;
      }
    }
    // 代理也失败：显示占位色块
    img.style.display = 'none';
    const ph = img.parentElement?.querySelector('.auth-split__filmflow-ph-fallback');
    if (ph) ph.style.display = 'flex';
  }, []);

  return (
    <div className="auth-split__filmflow" aria-hidden>
      {columns.map((urls, colIdx) => (
        <div key={colIdx} className="auth-split__filmflow-col">
          <div className="auth-split__filmflow-stack">
            {urls.map((url, i) => (
              <div key={`${colIdx}-${i}`} className="auth-split__filmflow-cell">
                {url ? (
                  <>
                    <img
                      src={url}
                      alt=""
                      className="auth-split__filmflow-img"
                      loading={i < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                      onError={(e) => handleImgError(e, url)}
                    />
                    <div
                      className="auth-split__filmflow-ph-fallback"
                      style={{ display: 'none' }}
                      aria-hidden
                    />
                  </>
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

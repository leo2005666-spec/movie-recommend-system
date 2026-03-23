/**
 * 首页大横幅轮播：优先展示「即将上映」作品，可点进详情；无足够数据时退回热门推荐。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { api, getCoverUrl } from '../api/request';

const BANNER_INTERVAL_MS = 6000;
const UPCOMING_MIN = 3;

/** 上映时间文案 */
function releaseLine(movie, mode) {
  if (movie.release_date && String(movie.release_date).trim()) {
    try {
      const d = new Date(movie.release_date);
      if (!Number.isNaN(d.getTime())) {
        return `${d.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })} 起映`;
      }
    } catch {
      /* ignore */
    }
  }
  if (movie.release_year) {
    return mode === 'upcoming' ? `${movie.release_year} 年 · 具体日期待定` : `${movie.release_year} 年`;
  }
  return mode === 'upcoming' ? '档期待定' : '';
}

export default function MovieBanner() {
  const [movies, setMovies] = useState([]);
  const [mode, setMode] = useState('upcoming'); // 'upcoming' | 'fallback'
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [autoCycleKey, setAutoCycleKey] = useState(0);
  const stripRef = useRef(null);
  const thumbBtnRefs = useRef([]);
  const len = movies.length;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const r = await api.get('/movies', {
          releaseStatus: 'unreleased',
          limit: 48,
          page: 1,
          orderBy: 'release_asc',
        });
        const list = Array.isArray(r?.data?.list) ? r.data.list : [];
        if (cancelled) return;
        if (list.length >= UPCOMING_MIN) {
          setMovies(list.slice(0, 12));
          setMode('upcoming');
          return;
        }
        const rb = await api.get('/recommend', { limit: 12, prefer: 'popular' });
        if (cancelled) return;
        setMovies(Array.isArray(rb.data) ? rb.data.slice(0, 12) : []);
        setMode('fallback');
      } catch {
        try {
          const rb = await api.get('/recommend', { limit: 12, prefer: 'popular' });
          if (!cancelled) {
            setMovies(Array.isArray(rb.data) ? rb.data.slice(0, 12) : []);
            setMode('fallback');
          }
        } catch {
          if (!cancelled) setMovies([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (len === 0) return;
    setIndex((i) => (i >= len ? len - 1 : i));
  }, [len]);

  useEffect(() => {
    const el = thumbBtnRefs.current[index];
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [index]);

  const bumpAutoCycle = useCallback(() => {
    setAutoCycleKey((k) => k + 1);
  }, []);

  const goNext = useCallback(() => {
    if (len <= 1) return;
    setIndex((i) => (i + 1) % len);
    bumpAutoCycle();
  }, [len, bumpAutoCycle]);

  const goPrev = useCallback(() => {
    if (len <= 1) return;
    setIndex((i) => (i - 1 + len) % len);
    bumpAutoCycle();
  }, [len, bumpAutoCycle]);

  const goToDot = useCallback(
    (i) => {
      if (i === index || i < 0 || i >= len) return;
      setIndex(i);
      bumpAutoCycle();
    },
    [index, len, bumpAutoCycle]
  );

  useEffect(() => {
    if (len <= 1 || hoverPaused) return undefined;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % len);
    }, BANNER_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [len, hoverPaused, autoCycleKey]);

  if (loading) {
    return (
      <div
        className="movie-banner movie-banner--contained movie-banner--tmdb-hero movie-banner--premium movie-banner--skeleton-load"
        aria-hidden
      >
        <div className="movie-banner__track movie-banner__track--skeleton">
          <div className="movie-banner__skeleton-shimmer" />
        </div>
        <div className="movie-banner__strip-outer movie-banner__strip-outer--skeleton">
          <div className="movie-banner__strip">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="movie-banner__strip-thumb movie-banner__strip-thumb--sk" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!movies.length) return null;

  const kicker = mode === 'upcoming' ? '即将上映' : '热门精选';
  const kickerEn = mode === 'upcoming' ? 'COMING SOON' : "EDITOR'S PICK";

  return (
    <div
      className="movie-banner movie-banner--contained movie-banner--tmdb-hero movie-banner--premium"
      role="region"
      aria-roledescription="carousel"
      aria-label={mode === 'upcoming' ? '即将上映影片推荐' : '热门影片推荐'}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div className="movie-banner__track">
        {movies.map((movie, i) => {
          const dateStr = releaseLine(movie, mode);
          return (
            <Link
              key={movie.id}
              to={`/movies/${movie.id}`}
              className={`movie-banner__slide ${i === index ? 'active' : ''}`}
              style={{ '--banner-index': i - index }}
            >
              <div className="movie-banner__bg">
                <img
                  src={getCoverUrl(movie, { w: 1920 })}
                  alt=""
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  decoding="async"
                  fetchPriority={i === index ? 'high' : 'auto'}
                  loading={i === index ? 'eager' : 'lazy'}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="movie-banner__overlay movie-banner__overlay--premium" />
              </div>
              <div className="movie-banner__grain movie-banner__grain--slide" aria-hidden />
              <div className="movie-banner__content movie-banner__content--editorial movie-banner__content--premium">
                <div className="movie-banner__text-block">
                  <div className="movie-banner__kicker-row">
                    <span className="movie-banner__kicker-en">{kickerEn}</span>
                    <span className="movie-banner__kicker-dot" aria-hidden />
                    <span className="movie-banner__kicker-cn">{kicker}</span>
                  </div>
                  <div className="movie-banner__meta-row">
                    <span className="movie-banner__pill movie-banner__pill--premium">
                      {mode === 'upcoming' ? '未上映 · 抢先关注' : '全站热播'}
                    </span>
                    {dateStr ? <span className="movie-banner__date">{dateStr}</span> : null}
                  </div>
                  <h2 className="movie-banner__title">{movie.title}</h2>
                  {movie.director ? (
                    <p className="movie-banner__director">导演 {String(movie.director).split(/[,，]/)[0].trim()}</p>
                  ) : null}
                  {movie.description && (
                    <p className="movie-banner__desc">
                      {movie.description.length > 118 ? movie.description.slice(0, 118) + '…' : movie.description}
                    </p>
                  )}
                </div>
                <div className="movie-banner__bottom-row">
                  <span className="movie-banner__source">
                    {mode === 'upcoming' ? '点击横幅或下方小图进入详情页' : '点击即可查看简介与评分'}
                  </span>
                  <span className="movie-banner__cta-pill movie-banner__cta-pill--premium">
                    查看详情 <span className="movie-banner__cta-arrow">→</span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {len > 1 && (
        <>
          <button
            type="button"
            className="movie-banner__arrow movie-banner__arrow--prev"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goPrev();
            }}
            aria-label="上一张"
          >
            <CaretLeft size={26} weight="bold" aria-hidden />
          </button>
          <button
            type="button"
            className="movie-banner__arrow movie-banner__arrow--next"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goNext();
            }}
            aria-label="下一张"
          >
            <CaretRight size={26} weight="bold" aria-hidden />
          </button>
        </>
      )}

      <div className="movie-banner__strip-outer" ref={stripRef}>
        <p className="movie-banner__strip-hint">
          {mode === 'upcoming' ? '即将与观众见面 · 点按切换' : '热门作品轮播 · 点按切换'}
        </p>
        <div className="movie-banner__strip" role="tablist" aria-label="切换影片">
          {movies.map((movie, i) => (
            <button
              key={movie.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              title={movie.title}
              ref={(el) => {
                thumbBtnRefs.current[i] = el;
              }}
              className={`movie-banner__strip-thumb ${i === index ? 'movie-banner__strip-thumb--active' : ''}`}
              onClick={() => goToDot(i)}
            >
              <img src={getCoverUrl(movie, { w: 154 })} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

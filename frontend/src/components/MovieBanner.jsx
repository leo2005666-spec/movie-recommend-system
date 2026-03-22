/**
 * 流动电影广告轮播
 * 自动轮播展示电影介绍，点击可跳转详情
 * - 左右箭头切换；鼠标悬停暂停自动播放；手动操作后重新计时
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { api, getCoverUrl } from '../api/request';

const BANNER_INTERVAL_MS = 5000;

export default function MovieBanner() {
  const [movies, setMovies] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  /** 鼠标悬停时暂停自动轮播 */
  const [hoverPaused, setHoverPaused] = useState(false);
  /** 变更后重启 setInterval，使手动切图后重新满间隔再自动切 */
  const [autoCycleKey, setAutoCycleKey] = useState(0);
  const len = movies.length;

  useEffect(() => {
    let cancelled = false;
    api.get('/recommend', { limit: 8 })
      .then((r) => {
        if (!cancelled) setMovies(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        if (!cancelled) setMovies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  /** 列表变短时索引钳制到合法范围 */
  useEffect(() => {
    if (len === 0) return;
    setIndex((i) => (i >= len ? len - 1 : i));
  }, [len]);

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

  if (loading || !movies.length) return null;

  return (
    <div
      className="movie-banner"
      role="region"
      aria-roledescription="carousel"
      aria-label="精选电影推荐"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div className="movie-banner__track">
        {movies.map((movie, i) => (
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
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="movie-banner__overlay" />
            </div>
            <div className="movie-banner__content">
              <h2 className="movie-banner__title">{movie.title}</h2>
              {movie.description && (
                <p className="movie-banner__desc">
                  {movie.description.length > 80 ? movie.description.slice(0, 80) + '…' : movie.description}
                </p>
              )}
              {movie.release_year && <span className="movie-banner__year">{movie.release_year}</span>}
              <span className="movie-banner__cta">查看详情 →</span>
            </div>
          </Link>
        ))}
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
            <CaretLeft size={28} weight="bold" aria-hidden />
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
            <CaretRight size={28} weight="bold" aria-hidden />
          </button>
          <div className="movie-banner__dots">
            {movies.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`movie-banner__dot ${i === index ? 'active' : ''}`}
                onClick={() => goToDot(i)}
                aria-label={`第 ${i + 1} 张，共 ${len} 张`}
                aria-current={i === index ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

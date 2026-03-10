/**
 * 流动电影广告轮播
 * 自动轮播展示电影介绍，点击可跳转详情
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getCoverUrl } from '../api/request';

const BANNER_INTERVAL = 5000;

export default function MovieBanner() {
  const [movies, setMovies] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/recommend', { limit: 8 })
      .then((r) => setMovies(r.data || []))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (movies.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % movies.length), BANNER_INTERVAL);
    return () => clearInterval(id);
  }, [movies.length]);

  if (loading || !movies.length) return null;

  const m = movies[index];

  return (
    <div className="movie-banner">
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
                src={getCoverUrl(movie)}
                alt=""
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
      {movies.length > 1 && (
        <div className="movie-banner__dots">
          {movies.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`movie-banner__dot ${i === index ? 'active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`第 ${i + 1} 张`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

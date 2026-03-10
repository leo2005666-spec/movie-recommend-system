/**
 * 电影卡片 - 带火龙果主题图标装饰
 */
import { Link } from 'react-router-dom';
import { getCoverUrl } from '../api/request';

/** 火龙果风格角标 SVG */
function DragonFruitBadge() {
  return (
    <span className="movie-card__badge" aria-hidden>
      <svg viewBox="0 0 24 24" width="20" height="20">
        <ellipse cx="12" cy="12" rx="8" ry="10" fill="#D94D6E" />
        <path d="M8 4 Q12 2 16 4 Q14 6 12 6 Q10 6 8 4" fill="#4ADE80" />
        <circle cx="10" cy="11" r="1.5" fill="rgba(255,255,255,0.5)" />
        <circle cx="14" cy="13" r="1" fill="rgba(255,255,255,0.4)" />
      </svg>
    </span>
  );
}

/** 播放图标（悬停显示） */
function PlayOverlay() {
  return (
    <span className="movie-card__play" aria-hidden>
      <svg viewBox="0 0 24 24" width="48" height="48">
        <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.5)" />
        <path d="M10 8l6 4-6 4V8z" fill="#fff" />
      </svg>
    </span>
  );
}

/** 年份图标 */
function YearIcon() {
  return (
    <svg className="movie-card__meta-icon" viewBox="0 0 16 16" width="12" height="12">
      <path fill="currentColor" d="M8 2a1 1 0 011 1v1h3a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h3V3a1 1 0 011-1zM6 6H4v2h2V6zm0 3H4v2h2V9zm4 0H8v2h2V9zm0-3H8v6h2V6z" />
    </svg>
  );
}

export default function MovieCard({ movie, onClick, showBadge = true, topRight, className }) {
  const coverUrl = getCoverUrl(movie);
  const fallbackSvg = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" fill="%232a2a35"><rect width="100" height="150"/><text x="50" y="75" dominant-baseline="middle" text-anchor="middle" fill="%238a8a9a" font-size="12">暂无封面</text></svg>';

  return (
    <Link
      to={`/movies/${movie.id}`}
      className={`movie-card ${className || ''}`}
      onClick={onClick}
    >
      {(showBadge && !topRight) && <DragonFruitBadge />}
      {topRight && <span className="movie-card__top-right">{topRight}</span>}
      <div className="movie-card__cover-wrap">
        <img
          src={coverUrl}
          alt=""
          className="cover"
          onError={(e) => { e.target.src = fallbackSvg; }}
        />
        <PlayOverlay />
      </div>
      <div className="info">
        <div className="title">{movie.title}</div>
        <div className="meta">
          {movie.release_year && (
            <>
              <YearIcon />
              {movie.release_year}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * 电影卡片 · TMDB 风格
 * 封面左下角评分圆环（颜色编码）+ 右上角三点菜单
 */
import { Link } from 'react-router-dom';
import { getCoverUrl } from '../api/request';

/** 根据百分比获取评分颜色：绿(>=70) / 黄(40-69) / 红(<40) */
export function getScoreColor(percent) {
  if (percent == null) return 'var(--text-tertiary)';
  if (percent >= 70) return '#90EE90'; // 青绿
  if (percent >= 40) return '#FFD700'; // 金黄
  return '#FF6B6B'; // 红
}

/** TMDB 风格 · 封面上的评分圆环（左下角，半重叠） */
function ScoreCircle({ movie }) {
  const percent = movie.tmdb_rating != null ? Math.round(movie.tmdb_rating * 10) : (movie.avg_score != null ? Math.round(movie.avg_score * 20) : null);
  if (percent == null) return null;
  const color = getScoreColor(percent);
  return (
    <div className="movie-card__score-ring" aria-hidden>
      <svg viewBox="0 0 36 36">
        <path className="movie-card__score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path className="movie-card__score-fill" stroke={color} strokeDasharray={`${percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      </svg>
      <span className="movie-card__score-value">{percent}%</span>
    </div>
  );
}

/** 右上角三点菜单 */
function MoreMenu() {
  return (
    <span className="movie-card__more" aria-hidden onClick={(e) => e.preventDefault()}>
      <svg viewBox="0 0 24 24" width="20" height="20">
        <circle cx="12" cy="6" r="1.5" fill="white" />
        <circle cx="12" cy="12" r="1.5" fill="white" />
        <circle cx="12" cy="18" r="1.5" fill="white" />
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

export default function MovieCard({ movie, onClick, showBadge = true, topRight, className, reasonLabel }) {
  const coverUrl = getCoverUrl(movie);
  const fallbackSvg = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" fill="%232a2a35"><rect width="100" height="150"/><text x="50" y="75" dominant-baseline="middle" text-anchor="middle" fill="%238a8a9a" font-size="12">暂无封面</text></svg>';

  return (
    <Link
      to={`/movies/${movie.id}`}
      className={`movie-card ${className || ''}`}
      onClick={onClick}
    >
      {topRight && <span className="movie-card__top-right">{topRight}</span>}
      <div className="movie-card__cover-wrap">
        <img
          src={coverUrl}
          alt=""
          className="cover"
          onError={(e) => { e.target.src = fallbackSvg; }}
        />
        <ScoreCircle movie={movie} />
        <MoreMenu />
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
        {reasonLabel && <div className="movie-card__reason">{reasonLabel}</div>}
      </div>
    </Link>
  );
}

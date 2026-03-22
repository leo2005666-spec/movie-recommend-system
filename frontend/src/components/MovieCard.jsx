/**
 * 电影卡片 · TMDB 风格
 * 右上角三点菜单；信息区展示日期与片长（不展示评分圆环）
 */
import { Link } from 'react-router-dom';
import { getCoverUrl } from '../api/request';

/** 根据百分比获取评分颜色：绿(>=70) / 黄(40-69) / 红(<40) — 详情页等仍可用 */
export function getScoreColor(percent) {
  if (percent == null) return 'var(--text-tertiary)';
  if (percent >= 70) return '#90EE90';
  if (percent >= 40) return '#FFD700';
  return '#FF6B6B';
}

/** 片长：分钟 → 1h 45m */
export function formatRuntimeMinutes(mins) {
  if (mins == null || mins === '' || Number(mins) < 1) return null;
  const n = Number(mins);
  if (Number.isNaN(n)) return null;
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  if (h > 0 && m > 0) return `${h}小时${m}分`;
  if (h > 0) return `${h}小时`;
  return `${m}分`;
}

function formatReleaseLine(movie) {
  if (movie.release_date && String(movie.release_date).trim()) {
    const s = String(movie.release_date).slice(0, 10);
    return s;
  }
  if (movie.release_year) return String(movie.release_year);
  return null;
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

export default function MovieCard({ movie, onClick, showBadge = true, topRight, className }) {
  const coverUrl = getCoverUrl(movie);
  const fallbackSvg = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" fill="%232a2a35"><rect width="100" height="150"/><text x="50" y="75" dominant-baseline="middle" text-anchor="middle" fill="%238a8a9a" font-size="12">暂无封面</text></svg>';

  const dateLine = formatReleaseLine(movie);
  const runtimeLine = formatRuntimeMinutes(movie.duration);

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
        {showBadge !== false && <MoreMenu />}
        <PlayOverlay />
      </div>
      <div className="info">
        <div className="title">{movie.title}</div>
        <div className="meta movie-card__meta-col">
          {dateLine && <span className="movie-card__date-line">{dateLine}</span>}
          {runtimeLine && <span className="movie-card__runtime-line">{runtimeLine}</span>}
        </div>
      </div>
    </Link>
  );
}

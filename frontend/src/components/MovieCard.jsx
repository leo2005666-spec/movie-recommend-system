/**
 * 电影卡片 · TMDB 风格
 * 封面左下角好评率圆环 + 右上角菜单；信息区仅标题 + 日期（无片长）
 */
import { Link } from 'react-router-dom';
import { getCoverUrl } from '../api/request';

/** 根据百分比获取圆环颜色：绿(>=70) / 黄(40-69) / 红(<40) */
export function getScoreColor(percent) {
  if (percent == null) return 'var(--text-tertiary)';
  if (percent >= 70) return '#21d07a';
  if (percent >= 40) return '#d2d531';
  return '#db2360';
}

/** 片长：分钟 → 文案（详情页等外部仍可用） */
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
    return String(movie.release_date).slice(0, 10);
  }
  if (movie.release_year) return String(movie.release_year);
  return null;
}

/** TMDB 式好评率：10 分制→百分制；无 TMDB 时用站内均分×20 */
function getPraisePercent(movie) {
  if (movie.tmdb_rating != null && !Number.isNaN(Number(movie.tmdb_rating))) {
    return Math.round(Number(movie.tmdb_rating) * 10);
  }
  if (movie.avg_score != null && !Number.isNaN(Number(movie.avg_score))) {
    return Math.round(Number(movie.avg_score) * 20);
  }
  return null;
}

/** 左下角圆形好评率（与海报底边、信息区交界重叠） */
function PraiseRateRing({ movie }) {
  const percent = getPraisePercent(movie);
  if (percent == null) return null;
  const color = getScoreColor(percent);
  return (
    <div
      className="movie-card__score-ring"
      aria-label={`好评率 ${percent}%`}
      title={`好评率 ${percent}%（基于 TMDB 评分或站内评分）`}
    >
      <svg viewBox="0 0 36 36" className="movie-card__score-svg" aria-hidden>
        <path
          className="movie-card__score-bg"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="movie-card__score-fill"
          stroke={color}
          strokeDasharray={`${percent}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <span className="movie-card__score-value">
        {percent}
        <span className="movie-card__score-pct">%</span>
      </span>
    </div>
  );
}

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

export default function MovieCard({ movie, onClick, showBadge = true, topRight, className, showRecommendReason = true }) {
  const coverUrl = getCoverUrl(movie);
  const fallbackSvg = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" fill="%232a2a35"><rect width="100" height="150"/><text x="50" y="75" dominant-baseline="middle" text-anchor="middle" fill="%238a8a9a" font-size="12">暂无封面</text></svg>';

  const dateLine = formatReleaseLine(movie);

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
        <PraiseRateRing movie={movie} />
        {showBadge !== false && <MoreMenu />}
        <PlayOverlay />
      </div>
      <div className="info">
        {showRecommendReason && movie.recommendReason && (
          <span className="movie-card__reason-tag" title="推荐理由">
            {movie.recommendReason}
          </span>
        )}
        <div className="title">{movie.title}</div>
        {dateLine && (
          <div className="meta movie-card__meta-col">
            <span className="movie-card__date-line">{dateLine}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

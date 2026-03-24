/**
 * TMDB 首页横滑卡片：竖版海报 + 左下评分环 + 标题 + 日期（对齐 TMDB）
 * 电影：`/movies/tmdb/:id`（入库同步 TMDB）；剧集：`/tv/tmdb/:id`（详情实时拉 TMDB）
 */
import { Link } from 'react-router-dom';
import { getCoverUrl, getProxiedImageUrl } from '../../api/request';
import { getScoreColor } from '../MovieCard';

function posterSrc(item) {
  if (item?.id) return getCoverUrl(item, { w: 500 });
  if (item?.cover && /^https?:\/\//i.test(String(item.cover))) {
    return getProxiedImageUrl(String(item.cover).trim());
  }
  return '';
}

function dateLine(item) {
  const d = item.release_date;
  if (d && String(d).trim()) return String(d).slice(0, 10);
  return '';
}

function scorePercent(item) {
  const v = item.vote_average;
  if (v == null || Number.isNaN(Number(v))) return null;
  return Math.round(Number(v) * 10);
}

function ScoreRing({ item }) {
  const percent = scorePercent(item);
  if (percent == null) return null;
  const color = getScoreColor(percent);
  return (
    <div className="tmdb-rail-card__score-ring" aria-label={`用户评分 ${percent}%`}>
      <svg viewBox="0 0 36 36" className="tmdb-rail-card__score-svg" aria-hidden>
        <path
          className="tmdb-rail-card__score-bg"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="tmdb-rail-card__score-fill"
          stroke={color}
          strokeDasharray={`${percent}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <span className="tmdb-rail-card__score-value">
        {percent}
        <span className="tmdb-rail-card__score-pct">%</span>
      </span>
    </div>
  );
}

function MoreMenu() {
  return (
    <span className="tmdb-rail-card__more" aria-hidden>
      <svg viewBox="0 0 24 24" width="18" height="18">
        <circle cx="12" cy="6" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="18" r="1.5" fill="currentColor" />
      </svg>
    </span>
  );
}

export default function TmdbRailCard({ item, imagePriority = false }) {
  const src = posterSrc(item);
  const fallbackSvg =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" fill="%231e293b"><rect width="100" height="150"/><text x="50" y="75" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="11">无海报</text></svg>';
  const dl = dateLine(item);
  const isTv = item.media_type === 'tv';

  const inner = (
    <>
      <div className="tmdb-rail-card__cover-wrap">
        <img
          src={src || fallbackSvg}
          alt=""
          loading={imagePriority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={imagePriority ? 'high' : 'low'}
          onError={(e) => { e.target.src = fallbackSvg; }}
        />
        <ScoreRing item={item} />
        <MoreMenu />
      </div>
      <div className="tmdb-rail-card__info">
        <div className="tmdb-rail-card__title">{item.title}</div>
        {dl ? <div className="tmdb-rail-card__date">{dl}</div> : null}
      </div>
    </>
  );

  if (isTv && item.tmdb_id) {
    return (
      <Link to={`/tv/tmdb/${item.tmdb_id}`} className="tmdb-rail-card">
        {inner}
      </Link>
    );
  }

  if (item.tmdb_id) {
    return (
      <Link to={`/movies/tmdb/${item.tmdb_id}`} className="tmdb-rail-card">
        {inner}
      </Link>
    );
  }

  if (item.id) {
    return (
      <Link to={`/movies/${item.id}`} className="tmdb-rail-card">
        {inner}
      </Link>
    );
  }

  return (
    <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="tmdb-rail-card tmdb-rail-card--external">
      {inner}
    </a>
  );
}

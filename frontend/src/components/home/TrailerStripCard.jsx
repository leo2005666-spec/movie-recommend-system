/**
 * 首页「最新预告片」横条：固定 16:9 画幅 + 播放角标
 * 电影：`/movies/tmdb/:id`；剧集：`/tv/tmdb/:id`（均在本站打开，数据与 TMDB 同步）
 * 可选 onHoverStart/onHoverEnd：默认由首页轨道统一处理背景，避免卡片间移动闪动。
 */
import { Link } from 'react-router-dom';
import { getPosterOrCoverUrl } from '../../api/request';

function buildTrailerSubtitle(movie) {
  const date =
    movie.release_date && String(movie.release_date).trim()
      ? String(movie.release_date).slice(0, 10)
      : movie.release_year
        ? String(movie.release_year)
        : null;
  const typeLabel = movie.media_type === 'tv' ? '剧集' : '电影';
  const va = movie.vote_average;
  const score =
    va != null && !Number.isNaN(Number(va)) ? `TMDB ${Number(va).toFixed(1)} 分` : null;
  const line1 = [date, typeLabel, score].filter(Boolean).join(' · ');
  const ov = (movie.description || '').trim();
  const line2 =
    ov.length > 96 ? `${ov.slice(0, 96)}…` : ov || '点击查看详情与预告信息';
  return { line1, line2 };
}

export default function TrailerStripCard({ movie, subtitle, onHoverStart, onHoverEnd, imagePriority = false }) {
  const cover = getPosterOrCoverUrl(movie, { w: 780 });
  const { line1, line2 } = subtitle ? { line1: subtitle, line2: '' } : buildTrailerSubtitle(movie);

  const thumb = (
    <>
      <div className="trailer-strip-card__thumb">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading={imagePriority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={imagePriority ? 'high' : 'low'}
          />
        ) : (
          <div className="trailer-strip-card__thumb-placeholder" aria-hidden />
        )}
        <span className="trailer-strip-card__kebab" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <circle cx="12" cy="6" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="18" r="1.6" />
          </svg>
        </span>
        <span className="trailer-strip-card__play" aria-hidden>
          <svg viewBox="0 0 24 24" width="44" height="44">
            <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.25)" />
            <path d="M10 8l6 4-6 4V8z" fill="#fff" />
          </svg>
        </span>
      </div>
      <div className="trailer-strip-card__text">
        <div className="trailer-strip-card__title">{movie.title}</div>
        {line1 ? <div className="trailer-strip-card__meta">{line1}</div> : null}
        {line2 ? <div className="trailer-strip-card__sub">{line2}</div> : null}
      </div>
    </>
  );

  const hoverProps = {
    onMouseEnter: onHoverStart,
    onMouseLeave: onHoverEnd,
  };

  if (movie.media_type === 'tv' && movie.tmdb_id) {
    return (
      <Link to={`/tv/tmdb/${movie.tmdb_id}`} className="trailer-strip-card" {...hoverProps}>
        {thumb}
      </Link>
    );
  }

  if (movie.tmdb_id) {
    return (
      <Link to={`/movies/tmdb/${movie.tmdb_id}`} className="trailer-strip-card" {...hoverProps}>
        {thumb}
      </Link>
    );
  }

  if (movie.id) {
    return (
      <Link to={`/movies/${movie.id}`} className="trailer-strip-card" {...hoverProps}>
        {thumb}
      </Link>
    );
  }

  return (
    <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="trailer-strip-card trailer-strip-card--external" {...hoverProps}>
      {thumb}
    </a>
  );
}

/**
 * 首页「最新预告片」横条：固定 16:9 画幅 + 播放角标；本站详情或 TMDB 外链
 */
import { Link } from 'react-router-dom';
import { getPosterOrCoverUrl } from '../../api/request';

export default function TrailerStripCard({ movie, subtitle, onHoverStart, onHoverEnd }) {
  const cover = getPosterOrCoverUrl(movie, { w: 780 });
  const line =
    subtitle ||
    (movie.description && movie.description.length > 42
      ? movie.description.slice(0, 42) + '…'
      : movie.description || '点击观看详情与简介');

  const thumb = (
    <>
      <div className="trailer-strip-card__thumb">
        {cover ? (
          <img src={cover} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="trailer-strip-card__thumb-placeholder" aria-hidden />
        )}
        <span className="trailer-strip-card__play" aria-hidden>
          <svg viewBox="0 0 24 24" width="44" height="44">
            <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.25)" />
            <path d="M10 8l6 4-6 4V8z" fill="#fff" />
          </svg>
        </span>
      </div>
      <div className="trailer-strip-card__text">
        <div className="trailer-strip-card__title">{movie.title}</div>
        <div className="trailer-strip-card__sub">{line}</div>
      </div>
    </>
  );

  const hoverProps = {
    onMouseEnter: onHoverStart,
    onMouseLeave: onHoverEnd,
  };

  if (movie.id) {
    return (
      <Link to={`/movies/${movie.id}`} className="trailer-strip-card" {...hoverProps}>
        {thumb}
      </Link>
    );
  }

  return (
    <a
      href={movie.externalUrl || 'https://www.themoviedb.org/'}
      target="_blank"
      rel="noopener noreferrer"
      className="trailer-strip-card trailer-strip-card--external"
      {...hoverProps}
    >
      {thumb}
    </a>
  );
}

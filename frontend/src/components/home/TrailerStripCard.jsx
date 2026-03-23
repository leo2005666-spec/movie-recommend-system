/**
 * 首页「最新预告片」横条：固定 16:9 画幅 + 播放角标，点击进入详情
 */
import { Link } from 'react-router-dom';
import { getCoverUrl } from '../../api/request';

export default function TrailerStripCard({ movie, subtitle }) {
  const cover = getCoverUrl(movie, { w: 780 });
  const line =
    subtitle ||
    (movie.description && movie.description.length > 42
      ? movie.description.slice(0, 42) + '…'
      : movie.description || '点击观看详情与简介');

  return (
    <Link to={`/movies/${movie.id}`} className="trailer-strip-card">
      <div className="trailer-strip-card__thumb">
        <img src={cover} alt="" loading="lazy" />
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
    </Link>
  );
}

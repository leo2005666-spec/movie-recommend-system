import { Link } from 'react-router-dom';
import { getProxiedImageUrl } from '../../api/request';

function StarDecor({ className }) {
  return (
    <span className={className} aria-hidden>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21l2.3-7-6-4.6h7.6L12 2z" />
      </svg>
    </span>
  );
}

/** 详情页：TMDB 合集横幅 */
export function MovieCollectionBanner({ collection, movieId }) {
  if (!collection?.id || !collection.parts?.length) return null;
  const bg = collection.backdrop_path ? getProxiedImageUrl(collection.backdrop_path) : '';
  const names = collection.parts.map((p) => p.title).filter(Boolean);
  const sub = names.length ? `包括 ${names.join('、')}` : collection.overview || '';

  return (
    <section className="detail-extra-banner detail-extra-banner--collection" aria-label="影片合集">
      <div
        className="detail-extra-banner__bg"
        style={bg ? { backgroundImage: `url(${bg})` } : undefined}
      />
      <div className="detail-extra-banner__overlay" />
      <div className="detail-extra-banner__inner">
        <h3 className="detail-extra-banner__title">{collection.name || '系列合集'}</h3>
        {sub && <p className="detail-extra-banner__desc">{sub}</p>}
        <Link to={`/movies/${movieId}/collection`} className="detail-extra-banner__btn">
          查看合集
        </Link>
      </div>
    </section>
  );
}

/** 详情页：奖项入口横幅 */
export function MovieAwardsBanner({ extras, movieId }) {
  if (!extras?.tmdb_id) return null;
  const n = extras.awards?.nominations;
  const w = extras.awards?.wins;
  let sub = '查看奖项与提名';
  if (n != null && n > 0) sub = `共 ${n} 项提名`;
  else if (w != null && w > 0 && (n == null || n === 0)) sub = `共 ${w} 项获奖`;

  return (
    <Link to={`/movies/${movieId}/awards`} className="detail-extra-banner detail-extra-banner--awards">
      <div className="detail-extra-banner__awards-bg" />
      <div className="detail-extra-banner__inner detail-extra-banner__inner--row">
        <div className="detail-extra-banner__awards-left">
          <StarDecor className="detail-extra-banner__star-tl" />
          <span className="detail-extra-banner__awards-word">AWARDS</span>
        </div>
        <span className="detail-extra-banner__awards-meta">
          {sub}
          <span className="detail-extra-banner__awards-arrow" aria-hidden>
            →
          </span>
        </span>
        <div className="detail-extra-banner__stars-scatter" aria-hidden>
          <StarDecor className="detail-extra-banner__s1" />
          <StarDecor className="detail-extra-banner__s2" />
          <StarDecor className="detail-extra-banner__s3" />
        </div>
      </div>
    </Link>
  );
}

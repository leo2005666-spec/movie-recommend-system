/**
 * 首页横向海报骨架：放在 home-tmdb-carousel__track 内，与各 __cell 宽度一致
 */
export default function HomePosterSkeletonRow({ count = 8, variant = 'carousel', onDark = false }) {
  const cellClass =
    variant === 'rail'
      ? 'home-tmdb-carousel__cell home-tmdb-carousel__cell--rail'
      : variant === 'trailer'
        ? 'home-tmdb-carousel__cell home-tmdb-carousel__cell--trailer'
        : 'home-tmdb-carousel__cell';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cellClass} aria-hidden>
          <div className={`poster-skeleton-card${onDark ? ' poster-skeleton-card--on-dark' : ''}`}>
            <div className="poster-skeleton-card__media skeleton" />
            <div className="poster-skeleton-card__lines">
              <div className="poster-skeleton-card__line skeleton" />
              <div className="poster-skeleton-card__line poster-skeleton-card__line--short skeleton" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * 首页底部：真实热门影评 + 虚拟用户影评（双栏卡片）
 */
import { Link } from 'react-router-dom';
import { StarIcon } from '@phosphor-icons/react';

function Stars({ n }) {
  const v = Math.min(5, Math.max(0, Math.round(Number(n) || 0)));
  return (
    <span className="home-reviews-board__stars" aria-label={`${v} 分`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          size={14}
          weight={i < v ? 'fill' : 'regular'}
          className={i < v ? 'home-reviews-board__star--on' : 'home-reviews-board__star--off'}
        />
      ))}
    </span>
  );
}

export default function HomeReviewsBoard({ realComments = [], mockReviews = [], linkMovie }) {
  const items = [];

  realComments.slice(0, 5).forEach((c) => {
    items.push({
      key: `real-${c.id}`,
      real: true,
      username: c.nickname || c.username,
      content: c.content.length > 160 ? c.content.slice(0, 160) + '…' : c.content,
      movieTitle: c.movie_title,
      movieId: c.movie_id,
      rating: 4,
      createdAt: c.created_at,
    });
  });

  const fallbackId = linkMovie?.id;
  const fallbackTitle = linkMovie?.title;

  mockReviews.forEach((m) => {
    items.push({
      key: m.id,
      real: false,
      username: m.nickname || m.username,
      initial: m.initial,
      color: m.color,
      content: m.content,
      movieTitle: fallbackTitle ? `《${fallbackTitle}》` : '精选影片',
      movieId: fallbackId,
      rating: m.rating,
    });
  });

  const show = items.slice(0, 10);
  if (!show.length) return null;

  const mid = Math.ceil(show.length / 2);
  const colA = show.slice(0, mid);
  const colB = show.slice(mid);

  return (
    <section className="home-reviews-board">
      <div className="home-reviews-board__head">
        <h2 className="home-reviews-board__title">影迷热议</h2>
        <p className="home-reviews-board__hint">站内热门影评与社区展示昵称（部分为虚拟用户，仅作氛围展示）</p>
      </div>
      <div className="home-reviews-board__cols">
        {[colA, colB].map((col, ci) => (
          <div key={ci} className="home-reviews-board__col">
            {col.map((item) => (
              <article key={item.key} className="home-reviews-board__card">
                <div className="home-reviews-board__avatar">
                  {item.real ? (
                    <span className="home-reviews-board__avatar-fallback">
                      {(item.username || '?')[0].toUpperCase()}
                    </span>
                  ) : (
                    <span className="home-reviews-board__avatar-mock" style={{ background: item.color }}>
                      {item.initial}
                    </span>
                  )}
                </div>
                <div className="home-reviews-board__body">
                  <div className="home-reviews-board__headline">
                    <span className="home-reviews-board__name">{item.username}</span>
                    <Stars n={item.rating} />
                  </div>
                  {item.movieTitle && item.movieId ? (
                    <Link to={`/movies/${item.movieId}`} className="home-reviews-board__movie">
                      {item.movieTitle}
                    </Link>
                  ) : (
                    <span className="home-reviews-board__movie home-reviews-board__movie--plain">{item.movieTitle}</span>
                  )}
                  <p className="home-reviews-board__quote">{item.content}</p>
                  {item.createdAt ? (
                    <span className="home-reviews-board__time">{item.createdAt}</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

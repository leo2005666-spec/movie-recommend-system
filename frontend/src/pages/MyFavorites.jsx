import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartIcon } from '@phosphor-icons/react';
import { api } from '../api/request';
import MovieCard from '../components/MovieCard';

export default function MyFavorites() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/favorites')
      .then((r) => setList(r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (movieId) => {
    try {
      await api.delete(`/favorites/${movieId}`);
      setList((prev) => prev.filter((m) => m.id !== movieId));
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="page-title">
        <HeartIcon size={24} weight="regular" className="page-title__icon" />
        我的收藏
      </h1>
        <div className="movie-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card movie-card" style={{ pointerEvents: 'none' }}>
              <div className="skeleton skeleton-cover" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-meta" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">
        <HeartIcon size={24} weight="regular" className="page-title__icon" />
        我的收藏
      </h1>
      {list.length ? (
        <div className="movie-grid">
          {list.map((m) => (
            <MovieCard
              key={m.id}
              movie={m}
              showBadge={false}
              topRight={
                <button
                  type="button"
                  className="movie-card__remove"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(m.id); }}
                >
                  ✕ 取消收藏
                </button>
              }
            />
          ))}
        </div>
      ) : (
        <p className="empty-hint">暂无收藏，去 <Link to="/movies">影视库</Link> 看看吧</p>
      )}
    </div>
  );
}

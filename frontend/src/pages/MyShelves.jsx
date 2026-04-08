import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListBulletsIcon, BookmarkSimpleIcon } from '@phosphor-icons/react';
import { api } from '../api/request';
import MovieCard from '../components/MovieCard';

const TABS = [
  { key: 'playlist', label: '我的片单', Icon: ListBulletsIcon, removeText: '移出片单' },
  { key: 'watchlist', label: '待看片单', Icon: BookmarkSimpleIcon, removeText: '移出待看' },
];

export default function MyShelves() {
  const [tab, setTab] = useState('playlist');
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/shelves/${tab}`)
      .then((r) => {
        if (!cancelled) setList(Array.isArray(r?.data) ? r.data : []);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tab]);

  const remove = async (movieId) => {
    try {
      await api.delete(`/shelves/${tab}/${movieId}`);
      setList((prev) => prev.filter((m) => m.id !== movieId));
    } catch (e) {
      alert(e.message || '移除失败');
    }
  };

  const active = TABS.find((t) => t.key === tab) || TABS[0];
  const ActiveIcon = active.Icon;

  return (
    <div>
      <h1 className="page-title">
        <ActiveIcon size={24} weight="regular" className="page-title__icon" />
        {active.label}
      </h1>
      <div className="taste-chips" style={{ marginBottom: 'var(--space-md)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`taste-chip ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="movie-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card movie-card" style={{ pointerEvents: 'none' }}>
              <div className="skeleton skeleton-cover" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-meta" />
            </div>
          ))}
        </div>
      ) : list.length ? (
        <div className="movie-grid">
          {list.map((m) => (
            <MovieCard
              key={`${tab}-${m.id}`}
              movie={m}
              showRecommendReason={false}
              showBadge={false}
              topRight={(
                <button
                  type="button"
                  className="movie-card__remove"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(m.id); }}
                >
                  ✕ {active.removeText}
                </button>
              )}
            />
          ))}
        </div>
      ) : (
        <p className="empty-hint">暂无内容，去 <Link to="/movies">影视库</Link> 添加吧</p>
      )}
    </div>
  );
}

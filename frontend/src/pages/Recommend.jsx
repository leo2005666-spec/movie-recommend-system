import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SparkleIcon } from '@phosphor-icons/react';
import MovieCard from '../components/MovieCard';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/request';

const SCENE_RECOMMEND = 'home_personalized';

export default function Recommend() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [tastes, setTastes] = useState([]);
  const [tasteType, setTasteType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/recommend/tastes').then((r) => setTastes(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 48 };

    if (tasteType) {
      api.get('/recommend', { ...params, tasteType })
        .then((r) => setList(r.data || []))
        .catch(() => setList([]))
        .finally(() => setLoading(false));
      return;
    }

    // 为你推荐：优先用协同过滤（基于用户评分/收藏/评论），fallback 到原有个性化
    api.get('/recommendations', { scene: SCENE_RECOMMEND, ...params })
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        if (data.length > 0) {
          setList(data);
          if (user) {
            data.slice(0, 48).forEach((m) => {
              api.post('/recommend/events', { scene: SCENE_RECOMMEND, movieId: m.id, eventType: 'exposure' }).catch(() => {});
            });
          }
        } else {
          return api.get('/recommend', params).then((res) => setList(res.data || []));
        }
      })
      .catch(() => api.get('/recommend', params).then((r) => setList(r.data || [])).catch(() => setList([])))
      .finally(() => setLoading(false));
  }, [user, tasteType]);

  return (
    <div>
      <h1 className="page-title">
        <SparkleIcon size={24} weight="regular" className="page-title__icon" />
        个性推荐
      </h1>
      <p className="empty-hint" style={{ marginBottom: 'var(--space-md)' }}>
        {tasteType
          ? `「${tastes.find((t) => t.key === tasteType)?.label || tasteType}」为你精选`
          : user
            ? '根据你的评分和收藏，为你推荐可能喜欢的作品'
            : '登录后可获得更精准的个性化推荐，或选择人群口味快速筛选'}
      </p>
      {tastes.length > 0 && (
        <div className="taste-chips">
          <button
            type="button"
            className={`taste-chip ${!tasteType ? 'active' : ''}`}
            onClick={() => setTasteType('')}
          >
            为你推荐
          </button>
          {tastes.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`taste-chip ${tasteType === t.key ? 'active' : ''}`}
              onClick={() => setTasteType(t.key)}
              title={t.desc}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <div className="movie-grid">
          {Array.from({ length: 24 }).map((_, i) => (
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
              key={m.id}
              movie={m}
              onClick={() => {
                if (!tasteType) {
                  api.post('/recommend/events', { scene: SCENE_RECOMMEND, movieId: m.id, eventType: 'click' }).catch(() => {});
                }
              }}
            />
          ))}
        </div>
      ) : (
        <p className="empty-hint">
          {tasteType
            ? '该人群暂无匹配影片，试试其他口味或'
            : '暂无推荐。先去 '}
          <Link to="/movies">浏览影视</Link>
          {!tasteType && ' 并对喜欢的作品评分、收藏，系统会为你生成个性化推荐'}。
        </p>
      )}
    </div>
  );
}

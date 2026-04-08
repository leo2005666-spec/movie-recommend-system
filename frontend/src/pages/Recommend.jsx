import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SparkleIcon } from '@phosphor-icons/react';
import MovieCard from '../components/MovieCard';
import MovieLoading from '../components/MovieLoading';
import RecommendSpotlight from '../components/RecommendSpotlight';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/request';
import { normalizeMovieListResponse } from '../utils/recommendApi';

const SCENE_RECOMMEND = 'home_personalized';

export default function Recommend() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [list, setList] = useState([]);
  const [tastes, setTastes] = useState([]);
  const [tasteType, setTasteType] = useState('');
  const [loading, setLoading] = useState(true);

  const backfillFromTmdbIfNeeded = async () => {
    const hot = await api.get('/tmdb/lists', { kind: 'popular', region: 'CN' }).catch(() => null);
    const rows = Array.isArray(hot?.data?.list) ? hot.data.list : [];
    const ids = rows.map((x) => Number(x?.tmdb_id)).filter((n) => Number.isFinite(n) && n > 0).slice(0, 10);
    if (!ids.length) return;
    await Promise.all(ids.map((tid) => api.post(`/movies/from-tmdb/${tid}`).catch(() => null)));
  };

  useEffect(() => {
    api.get('/recommend/tastes').then((r) => setTastes(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!tasteType) return;
    const exists = tastes.some((t) => t.key === tasteType);
    if (!exists) setTasteType('');
  }, [tastes, tasteType]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { limit: 48 };

    if (tasteType) {
      api
        .get('/recommend', { ...params, tasteType })
        .then((r) => {
          if (!cancelled) setList(r?.data || []);
        })
        .catch(() => {
          if (!cancelled) setList([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const [popularRes, recRes] = await Promise.all([
          api.get('/recommend', { ...params, prefer: 'popular' }).catch(() => null),
          api.get('/recommendations', { scene: SCENE_RECOMMEND, ...params }).catch(() => null),
        ]);
        if (cancelled) return;
        const recList = normalizeMovieListResponse(recRes);
        const popularList = Array.isArray(popularRes?.data) ? popularRes.data : [];
        let data = recList.length ? recList : popularList;
        if (!data.length) {
          if (userId != null) {
            await backfillFromTmdbIfNeeded().catch(() => null);
          }
          const fb = await api.get('/recommend', params).catch(() => null);
          data = Array.isArray(fb?.data) ? fb.data : [];
        }
        setList(data);
        if (userId != null && data.length > 0) {
          data.slice(0, 48).forEach((m) => {
            api.post('/recommend/events', { scene: SCENE_RECOMMEND, movieId: m.id, eventType: 'exposure' }).catch(() => {});
          });
        }
      } catch {
        if (!cancelled) {
          try {
            const r = await api.get('/recommend', { ...params, prefer: 'popular' });
            setList(Array.isArray(r?.data) ? r.data : []);
          } catch {
            setList([]);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tasteType, userId]);

  return (
    <div className="recommend-page recommend-page--with-spotlight">
      <h1 className="page-title">
        <SparkleIcon size={24} weight="regular" className="page-title__icon" />
        个性推荐
      </h1>
      <p className="empty-hint recommend-page__intro">
        {tasteType
          ? `「${tastes.find((t) => t.key === tasteType)?.label || tasteType}」为你精选`
          : user
            ? '根据你的评分和收藏，为你推荐可能喜欢的作品'
            : '登录后可获得更精准的个性化推荐，或选择人群口味快速筛选'}
      </p>
      {(list.length > 0 || (loading && !list.length)) && (
        <RecommendSpotlight movies={list} loading={loading && !list.length} />
      )}
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
        <div className="movie-grid movie-grid--tmdb-list">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="skeleton-card movie-card" style={{ pointerEvents: 'none' }}>
              <div className="skeleton skeleton-cover" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-meta" />
            </div>
          ))}
        </div>
      ) : list.length ? (
        <div className="movie-grid movie-grid--tmdb-list">
          {list.map((m) => (
            <MovieCard
              key={m.id}
              movie={m}
              showRecommendReason
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

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getProxiedImageUrl } from '../api/request';

export default function MovieCollection() {
  const { tmdbCollectionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [col, setCol] = useState(null);
  const [err, setErr] = useState('');
  const [syncingTmdbId, setSyncingTmdbId] = useState(null);

  useEffect(() => {
    if (!tmdbCollectionId) return;
    let cancelled = false;
    setLoading(true);
    setErr('');
    api
      .get(`/movies/collection/tmdb/${tmdbCollectionId}`)
      .then((res) => {
        if (!cancelled) setCol(res.data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tmdbCollectionId]);

  const openMovieInSite = async (part) => {
    if (!part?.tmdb_id) return;
    if (part.local_id) {
      navigate(`/movies/${part.local_id}`);
      return;
    }
    setSyncingTmdbId(part.tmdb_id);
    try {
      const r = await api.post(`/movies/from-tmdb/${part.tmdb_id}`);
      const localId = r?.data?.id;
      if (!localId) throw new Error('同步后未返回影片 ID');
      setCol((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          parts: (prev.parts || []).map((p) => (
            p.tmdb_id === part.tmdb_id ? { ...p, local_id: localId } : p
          )),
        };
      });
      navigate(`/movies/${localId}`);
    } catch (e) {
      setErr(e.message || '同步影片失败，请稍后重试');
    } finally {
      setSyncingTmdbId(null);
    }
  };

  if (loading) {
    return (
      <div className="movie-collection-page">
        <p className="empty-hint">加载中…</p>
      </div>
    );
  }
  if (err || !col) {
    return (
      <div className="movie-collection-page">
        <p className="error-msg">{err || '无数据'}</p>
        <Link to="/movies">返回影视库</Link>
      </div>
    );
  }

  const rawBg = col.backdrop_path || col.poster_path;
  const bg = rawBg ? getProxiedImageUrl(rawBg) : null;
  const names = (col.parts || []).map((p) => p.title).filter(Boolean);
  const subtitle = names.length ? `包括 ${names.join('，')}` : '';

  return (
    <div className="movie-collection-page">
      {bg && (
        <div className="movie-collection-hero" style={{ backgroundImage: `url(${bg})` }}>
          <div className="movie-collection-hero__scrim" />
          <div className="movie-collection-hero__text">
            <h1>{col.name}</h1>
            {col.overview && <p className="movie-collection-hero__overview">{col.overview}</p>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
      )}
      {!bg && (
        <div className="movie-collection-hero movie-collection-hero--plain">
          <div className="movie-collection-hero__text">
            <h1>{col.name}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
      )}

      <div className="movie-collection-grid-wrap">
        <h2 className="section-title">系列影片</h2>
        <div className="movie-collection-grid">
          {(col.parts || []).map((p) => (
            <div key={p.tmdb_id} className="movie-collection-cell">
              <button
                type="button"
                className="movie-collection-cell__link"
                onClick={() => openMovieInSite(p)}
                disabled={syncingTmdbId === p.tmdb_id}
                title={p.local_id ? '查看本站详情' : '同步到本站并查看详情'}
              >
                {p.poster_path ? (
                  <img src={getProxiedImageUrl(p.poster_path)} alt="" />
                ) : (
                  <div className="movie-collection-poster-ph" />
                )}
                <span>{p.title}</span>
                {!p.local_id && (
                  <span className="movie-collection-cell__hint">
                    {syncingTmdbId === p.tmdb_id ? '同步中…' : '点击同步到本站'}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

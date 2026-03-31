import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getProxiedImageUrl } from '../api/request';

export default function MovieCollection() {
  const { tmdbCollectionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [col, setCol] = useState(null);
  const [err, setErr] = useState('');

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
              {p.local_id ? (
                <Link to={`/movies/${p.local_id}`} className="movie-collection-cell__link">
                  {p.poster_path ? (
                    <img src={getProxiedImageUrl(p.poster_path)} alt="" />
                  ) : (
                    <div className="movie-collection-poster-ph" />
                  )}
                  <span>{p.title}</span>
                </Link>
              ) : (
                <a
                  href={`https://www.themoviedb.org/movie/${p.tmdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="movie-collection-cell__link"
                >
                  {p.poster_path ? (
                    <img src={getProxiedImageUrl(p.poster_path)} alt="" />
                  ) : (
                    <div className="movie-collection-poster-ph" />
                  )}
                  <span>{p.title}</span>
                  <span className="movie-collection-cell__hint">（TMDB）</span>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

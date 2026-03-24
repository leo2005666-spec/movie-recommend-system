/**
 * 通过 TMDB 电影 ID 进入本站详情：先 POST /movies/from-tmdb 同步 TMDB，再 replace 到 /movies/:id
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/request';
import DetailPageLoading from '../components/DetailPageLoading';

export default function TmdbMovieEntry() {
  const { tmdbId } = useParams();
  const navigate = useNavigate();
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setErr('');
    (async () => {
      try {
        const res = await api.post(`/movies/from-tmdb/${tmdbId}`, {});
        const id = res?.data?.id;
        if (!id) throw new Error('未返回作品 ID');
        if (!cancelled) navigate(`/movies/${id}`, { replace: true });
      } catch (e) {
        if (!cancelled) setErr(e.message || '同步失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tmdbId, navigate]);

  if (err) {
    return (
      <div className="page-container" style={{ padding: '2rem', maxWidth: 560, margin: '0 auto' }}>
        <p className="empty-hint" style={{ marginBottom: '1rem' }}>
          {err}
        </p>
        <Link to="/" className="btn btn-outline">
          返回首页
        </Link>
      </div>
    );
  }

  return <DetailPageLoading />;
}

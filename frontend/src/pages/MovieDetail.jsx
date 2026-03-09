import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/request';

const SCENE_SIMILAR = 'similar';

export default function MovieDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = () => {
    api.get(`/movies/${id}`)
      .then((r) => {
        setMovie(r.data);
        if (r.data?.myScore != null) setScore(Number(r.data.myScore));
      })
      .catch(() => setMovie(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (id) api.get(`/comments/movie/${id}`).then((r) => setComments(r.data?.list || [])).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (id) {
      api.get('/recommendations', { scene: SCENE_SIMILAR, movieId: id, limit: 8 })
        .then((r) => {
          const list = Array.isArray(r.data) ? r.data : [];
          setSimilar(list);
          if (list.length > 0 && user) {
            list.forEach((m) => api.post('/recommend/events', { scene: SCENE_SIMILAR, movieId: m.id, eventType: 'exposure' }).catch(() => {}));
          }
        })
        .catch(() => setSimilar([]));
    }
  }, [id, user]);

  const handleRate = async () => {
    if (!user) return;
    const s = Number(score);
    if (!s || s < 0.5 || s > 5) {
      setErr('请先选择 1-5 分');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      await api.post('/ratings', { movieId: parseInt(id, 10), score: s });
      setErr('');
      load();
      setScore(s);
    } catch (e) {
      setErr(e.message || '评分提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) return;
    try {
      if (movie?.isFavorite) {
        await api.delete(`/favorites/${id}`);
      } else {
        await api.post('/favorites', { movieId: parseInt(id) });
      }
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user || !commentContent.trim()) return;
    try {
      await api.post('/comments', { movieId: parseInt(id), content: commentContent.trim() });
      setCommentContent('');
      api.get(`/comments/movie/${id}`).then((r) => setComments(r.data?.list || []));
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading) return <p className="empty-hint">加载中...</p>;
  if (!movie) return <p>作品不存在</p>;

  return (
    <div>
      <div className="detail-layout">
        <img
          src={movie.cover && movie.id ? `/api/movies/${movie.id}/cover` : ''}
          alt=""
          className="detail-poster"
          onError={(e) => e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" fill="%232a2a35"><rect width="240" height="360"/></svg>'}
        />
        <div className="detail-info">
          <h1 style={{ marginBottom: 'var(--space-sm)' }}>{movie.title}</h1>
          <p className="detail-meta">
            {movie.categories?.map((c) => c.name).join(' / ')} {movie.tags?.map((t) => t.name).join(' · ')} {movie.release_year && ` · ${movie.release_year}`}
          </p>
          {movie.director && <p>导演：{movie.director}</p>}
          {movie.actors && <p>主演：{movie.actors}</p>}
          {movie.duration && <p>片长：{movie.duration} 分钟</p>}
          {movie.description && <p style={{ marginTop: 'var(--space-md)' }}>{movie.description}</p>}

          {user && (
            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="score-btns">
                <span style={{ marginRight: 'var(--space-sm)' }}>评分：</span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setScore(s)} className={`score-btn ${score >= s ? 'active' : ''}`}>
                    {s}
                  </button>
                ))}
                <button type="button" onClick={handleRate} className="btn" style={{ marginLeft: 'var(--space-sm)' }} disabled={submitting}>
                  {submitting ? '提交中...' : '提交'}
                </button>
              </div>
              <button className={`btn ${movie.isFavorite ? 'btn-outline' : ''}`} onClick={handleFavorite}>
                {movie.isFavorite ? '已收藏' : '收藏'}
              </button>
            </div>
          )}
          {err && <div className="error-msg" style={{ marginTop: 'var(--space-sm)' }}>{err}</div>}
          {movie?.myScore != null && !err && <p style={{ color: 'var(--accent)', marginTop: 'var(--space-sm)' }}>您已评 {movie.myScore} 分</p>}
        </div>
      </div>

      {similar.length > 0 && (
        <section style={{ marginTop: 'var(--space-xl)' }}>
          <h2 className="section-title">喜欢这部的人也喜欢</h2>
          <div className="movie-grid">
            {similar.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                onClick={() => api.post('/recommend/events', { scene: SCENE_SIMILAR, movieId: m.id, eventType: 'click' }).catch(() => {})}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">评论</h2>
        {user && (
          <form onSubmit={handleComment} style={{ marginBottom: 'var(--space-md)' }}>
            <textarea className="form-textarea form-input" value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="写下你的影评，支持最多 2000 字…" rows={4} maxLength={2000} style={{ marginBottom: 'var(--space-sm)' }} />
            <button type="submit" className="btn">发表评论</button>
          </form>
        )}
        {!user && <p className="empty-hint" style={{ marginBottom: 'var(--space-md)' }}><Link to="/login">登录</Link>后可以评论</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {comments.map((c) => (
            <div key={c.id} className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                <strong>{c.nickname || c.username}</strong>
                <span className="empty-hint" style={{ fontSize: '0.85rem' }}>{c.created_at}</span>
              </div>
              <p>{c.content}</p>
            </div>
          ))}
        </div>
        {comments.length === 0 && <p className="empty-hint">暂无评论</p>}
      </section>
    </div>
  );
}

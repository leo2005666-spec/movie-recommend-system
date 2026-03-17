import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import { useAuth } from '../context/AuthContext';
import { api, getCoverUrl } from '../api/request';

const SCENE_SIMILAR = 'similar';

export default function MovieDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [cast, setCast] = useState([]);
  const [tmdbRecs, setTmdbRecs] = useState([]);
  const [backdropPath, setBackdropPath] = useState(null);
  const [tagline, setTagline] = useState(null);
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
      api.get(`/movies/${id}/credits`).then((r) => {
        setCast(r.data?.cast || []);
        setTmdbRecs(r.data?.recommendations || []);
        setBackdropPath(r.data?.backdrop_path || null);
        setTagline(r.data?.tagline || null);
      }).catch(() => {});
    }
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

  const bgImage = backdropPath || (movie?.id ? getCoverUrl(movie) : null);
  const scorePercent = movie.tmdb_rating != null ? Math.round(movie.tmdb_rating * 10) : (movie.myScore != null ? Math.round(movie.myScore * 20) : null);

  return (
    <div className="detail-page">
      {/* TMDB 风格：顶部背景 + 渐变遮罩 */}
      <div className="detail-hero">
        <div
          className="detail-hero__bg"
          style={{ backgroundImage: bgImage ? `url(${bgImage})` : undefined }}
        />
        <div className="detail-hero__overlay" />
        <div className="detail-hero__content">
          <div className="detail-layout">
            <img
              src={getCoverUrl(movie)}
              alt=""
              className="detail-poster"
              onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" fill="%231a1a2e"><rect width="300" height="450"/></svg>'; }}
            />
            <div className="detail-info">
              <h1 className="detail-title">
                {movie.title}
                {movie.release_year && <span className="detail-year"> ({movie.release_year})</span>}
              </h1>
              <div className="detail-meta">
                {movie.categories?.map((c) => c.name).join(' · ')}
                {movie.tags?.length > 0 && ` · ${movie.tags.map((t) => t.name).join(', ')}`}
                {movie.duration && ` · ${movie.duration} 分钟`}
              </div>

              {/* 用户评分 · 圆形进度 */}
              <div className="detail-score-row">
                <div className="detail-score-circle">
                  <svg viewBox="0 0 36 36">
                    <path
                      className="detail-score-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="detail-score-fill"
                      strokeDasharray={`${scorePercent || 0}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="detail-score-value">{scorePercent != null ? scorePercent : '—'}%</span>
                </div>
                <div className="detail-score-label">
                  <span>用户评分</span>
                  {user && <span className="detail-score-hint">你的感觉如何？</span>}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="detail-actions">
                {user && (
                  <>
                    <div className="score-btns">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} type="button" onClick={() => setScore(s)} className={`score-btn ${score >= s ? 'active' : ''}`}>{s}</button>
                      ))}
                      <button type="button" onClick={handleRate} className="btn" disabled={submitting}>{submitting ? '提交中...' : '提交评分'}</button>
                    </div>
                    <button className={`btn ${movie.isFavorite ? 'btn-outline' : ''}`} onClick={handleFavorite}>
                      {movie.isFavorite ? '已收藏' : '收藏'}
                    </button>
                  </>
                )}
              </div>
              {err && <div className="error-msg">{err}</div>}
              {movie?.myScore != null && !err && <p className="detail-my-score">您已评 {movie.myScore} 分</p>}

              {tagline && <p className="detail-tagline">{tagline}</p>}

              <h3 className="detail-synopsis-title">简介</h3>
              <p className="detail-synopsis">{movie.description || '暂无简介'}</p>

              {movie.director && (
                <div className="detail-crew">
                  <strong>导演</strong> {movie.director}
                  {movie.actors && <><br /><strong>主演</strong> {movie.actors}</>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 演员阵容 */}
      {cast.length > 0 && (
        <section className="detail-section">
          <h2 className="section-title">演员阵容</h2>
          <div className="cast-row">
            {cast.map((c, i) => (
              <div key={i} className="cast-card">
                <div className="cast-photo">
                  {c.profile_path ? (
                    <img src={c.profile_path} alt={c.name} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="cast-placeholder" />
                  )}
                </div>
                <div className="cast-name">{c.name}</div>
                <div className="cast-character">{c.character || '—'}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 推荐观看 */}
      {(tmdbRecs.length > 0 || similar.length > 0) && (
        <section className="detail-section">
          <h2 className="section-title">推荐观看</h2>
          <div className="rec-carousel">
            {tmdbRecs.length > 0
              ? tmdbRecs.map((m) => {
                  const Card = m.id ? Link : 'div';
                  const cardProps = m.id ? { to: `/movies/${m.id}` } : { style: { cursor: 'default' } };
                  return (
                    <Card key={m.tmdb_id} {...cardProps} className="rec-card">
                      <img src={m.poster_path || ''} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                      <div className="rec-info">
                        <span className="rec-title">{m.title}</span>
                        {m.vote_average != null && <span className="rec-score">★ {m.vote_average}</span>}
                      </div>
                    </Card>
                  );
                })
              : similar.map((m) => (
                  <MovieCard key={m.id} movie={m} onClick={() => api.post('/recommend/events', { scene: SCENE_SIMILAR, movieId: m.id, eventType: 'click' }).catch(() => {})} />
                ))}
          </div>
        </section>
      )}

      {/* 评论 */}
      <section className="detail-section">
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

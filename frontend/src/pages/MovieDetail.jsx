import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MovieCard, { getScoreColor } from '../components/MovieCard';
import { useAuth } from '../context/AuthContext';
import { api, getCoverUrl } from '../api/request';
import DetailPageLoading from '../components/DetailPageLoading';

const SCENE_SIMILAR = 'similar';

/** 片长格式：108 → "1h 48m" */
function formatRuntime(mins) {
  if (!mins || mins < 1) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MovieDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [cast, setCast] = useState([]);
  const [tmdbRecs, setTmdbRecs] = useState([]);
  const [backdropPath, setBackdropPath] = useState(null);
  const [tagline, setTagline] = useState(null);
  const [tmdbDetails, setTmdbDetails] = useState(null);
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

  useEffect(() => {
    setLoading(true);
    load();
  }, [id]);

  /** 详情页次要数据并行请求，减少串行等待；相似推荐曝光异步不打断首屏 */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      api.get(`/comments/movie/${id}`).catch(() => ({ data: { list: [] } })),
      api.get(`/movies/${id}/credits`).catch(() => ({ data: {} })),
      api.get('/recommendations', { scene: SCENE_SIMILAR, movieId: id, limit: 8 }).catch(() => ({ data: [] })),
    ]).then(([commentsRes, creditsRes, recRes]) => {
      if (cancelled) return;
      setComments(commentsRes.data?.list || []);
      const cd = creditsRes.data || {};
      setCast(cd.cast || []);
      setTmdbRecs(cd.recommendations || []);
      setBackdropPath(cd.backdrop_path || null);
      setTagline(cd.tagline || null);
      setTmdbDetails(cd.tmdb_details || null);
      const list = Array.isArray(recRes.data) ? recRes.data : [];
      setSimilar(list);
      if (list.length > 0 && user) {
        queueMicrotask(() => {
          list.forEach((m) =>
            api.post('/recommend/events', { scene: SCENE_SIMILAR, movieId: m.id, eventType: 'exposure' }).catch(() => {})
          );
        });
      }
    });
    return () => {
      cancelled = true;
    };
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

  /** 删除本人发表的评论（后端校验 user_id） */
  const handleDeleteComment = async (commentId) => {
    if (!user || !window.confirm('确定删除这条评论？删除后无法恢复。')) return;
    setErr('');
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      setErr(e.message || '删除失败');
    }
  };

  if (loading) {
    return <DetailPageLoading />;
  }
  if (!movie) return <p>作品不存在</p>;

  /** 有 TMDB 横版剧照时优先用（高清）；否则才用封面代理作弱背景，避免竖图硬拉全屏发糊、重影 */
  const hasBackdrop = Boolean(backdropPath);
  const bgImage = backdropPath || (movie?.id ? getCoverUrl(movie) : null);
  const scorePercent = movie.tmdb_rating != null ? Math.round(movie.tmdb_rating * 10) : (movie.myScore != null ? Math.round(movie.myScore * 20) : null);
  /** TMDB 风格：完整货币格式，如 $44,559,195.00 */
  const formatMoney = (n) => (n != null && n > 0 ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null);
  const hasSocial = tmdbDetails && (tmdbDetails.facebook_id || tmdbDetails.instagram_id || tmdbDetails.twitter_id || tmdbDetails.homepage);
  const hasSidebar = tmdbDetails && (hasSocial || tmdbDetails.original_title || tmdbDetails.status || tmdbDetails.original_language || tmdbDetails.budget || tmdbDetails.revenue || (tmdbDetails.keywords?.length > 0));

  return (
    <div className="detail-page detail-page--tmdb-light">
      {/* TMDB 深色条：左侧实色 + 右侧半透明剧照（backdrop/封面随影片变化） */}
      <div
        className={`detail-hero detail-hero--cinematic${hasBackdrop ? '' : ' detail-hero--poster-fallback'}`}
      >
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
                {tmdbDetails?.certification && <span className="detail-cert">{tmdbDetails.certification}</span>}
                {(tmdbDetails?.release_date || movie.release_year) && (
                  <span>{tmdbDetails?.release_date || `${movie.release_year}-01-01`}</span>
                )}
                {movie.categories?.length > 0 && <span> · {movie.categories.map((c) => c.name).join(', ')}</span>}
                {movie.tags?.length > 0 && <span> 和 {movie.tags.map((t) => t.name).join(', ')}</span>}
                {movie.duration && <span> · {formatRuntime(movie.duration)}</span>}
              </div>

              {/* 用户评分 · 圆形进度（颜色编码：绿/黄/红） */}
              <div className="detail-score-row">
                <div className="detail-score-circle" data-color={scorePercent != null ? (scorePercent >= 70 ? 'green' : scorePercent >= 40 ? 'yellow' : 'red') : ''}>
                  <svg viewBox="0 0 36 36">
                    <path className="detail-score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path
                      className="detail-score-fill"
                      stroke={scorePercent != null ? getScoreColor(scorePercent) : 'rgba(255,255,255,0.3)'}
                      strokeDasharray={`${scorePercent || 0}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="detail-score-value">{scorePercent != null ? scorePercent : '—'}%</span>
                </div>
                <div className="detail-score-label">
                  <span>用户评分</span>
                  {user && (
                    <div className="detail-feel-row">
                      <span className="detail-emojis detail-emojis--static" aria-hidden="true">😊 🥱</span>
                      <button type="button" className="detail-feel-btn" onClick={() => document.querySelector('.score-btns')?.scrollIntoView({ behavior: 'smooth' })}>
                        你的感觉如何? <span aria-label="信息">ℹ️</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* TMDB 风格 · 列表/收藏/书签 + 播放预告片 */}
              <div className="detail-actions detail-actions--icons">
                {user && (
                  <>
                    <button type="button" className="detail-action-icon" title="添加到片单" aria-label="片单">
                      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M4 6h2v12H4V6zm4 0h2v12H8V6zm4 0h2v12h-2V6zm4 0h2v12h-2V6z" /></svg>
                    </button>
                    <button type="button" className={`detail-action-icon ${movie.isFavorite ? 'active' : ''}`} title="收藏" onClick={handleFavorite} aria-label="收藏">
                      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                    </button>
                    <button type="button" className="detail-action-icon" title="待看" aria-label="待看">
                      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
                    </button>
                    {tmdbDetails?.trailer_url && (
                      <a href={tmdbDetails.trailer_url} target="_blank" rel="noopener noreferrer" className="detail-trailer">
                        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M8 5v14l11-7z" /></svg>
                        播放预告片
                      </a>
                    )}
                  </>
                )}
              </div>

              {user && (
                <div className="detail-actions detail-actions--score">
                  <div className="score-btns">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setScore(s)} className={`score-btn ${score >= s ? 'active' : ''}`}>{s}</button>
                    ))}
                    <button type="button" onClick={handleRate} className="btn" disabled={submitting}>{submitting ? '提交中...' : '提交评分'}</button>
                  </div>
                </div>
              )}
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

      {/* 两栏布局：主内容 + 右侧栏 */}
      <div className={`detail-body ${hasSidebar ? '' : 'detail-body--no-sidebar'}`}>
        <div className="detail-main">
          {/* 演员阵容 · 横向剧照卡（上照下文、白底圆角，参考第四张参考图） */}
          {cast.length > 0 && (
            <section className="detail-section detail-section--cast">
              <h2 className="section-title section-title--cast">演员阵容</h2>
              <div className="cast-row cast-row--filmstrip">
                {cast.map((c, i) => (
                  <div key={i} className="cast-card cast-card--filmstrip">
                    <div className="cast-photo cast-photo--filmstrip">
                      {c.profile_path ? (
                        <img src={c.profile_path} alt={c.name} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="cast-placeholder cast-placeholder--filmstrip" />
                      )}
                    </div>
                    <div className="cast-info cast-info--filmstrip">
                      <div className="cast-name cast-name--filmstrip">{c.name}</div>
                      <div className="cast-character cast-character--filmstrip">{c.character || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
              {tmdbDetails?.tmdb_id && (
                <a href={`https://www.themoviedb.org/movie/${tmdbDetails.tmdb_id}/cast`} target="_blank" rel="noopener noreferrer" className="link-more" style={{ display: 'inline-block', marginTop: 'var(--space-sm)' }}>
                  完整演职员表
                </a>
              )}
            </section>
          )}

          {/* 用户评论（原「评价/讨论」为同一列表，合并为一栏） */}
          <section className="detail-section">
            <h2 className="section-title">评论 {comments.length > 0 ? `(${comments.length})` : ''}</h2>
            {user && (
              <form onSubmit={handleComment} className="social-form">
                <textarea className="form-textarea form-input" value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="写下你的影评…" rows={3} maxLength={2000} />
                <button type="submit" className="btn">发表</button>
              </form>
            )}
            {!user && <p className="empty-hint" style={{ marginBottom: 'var(--space-md)' }}><Link to="/login">登录</Link>后可以评论</p>}
            <div className="social-discuss-list">
              {comments.map((c) => (
                <div key={c.id} className="social-discuss-item">
                  <div className="social-discuss-avatar">{(c.nickname || c.username || '?')[0]}</div>
                  <div className="social-discuss-content">
                    <div className="social-discuss-title-row">
                      <div className="social-discuss-title">{c.content.length > 80 ? c.content.slice(0, 80) + '…' : c.content}</div>
                      {user && Number(c.user_id) === Number(user.id) && (
                        <button
                          type="button"
                          className="btn btn-outline comment-delete-btn"
                          onClick={() => handleDeleteComment(c.id)}
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="social-discuss-meta">
                      <span>开放</span>
                      <span>·</span>
                      <span>{c.nickname || c.username}</span>
                      <span>·</span>
                      <span>{c.created_at}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {comments.length === 0 && <p className="empty-hint">暂无评论</p>}
          </section>

          {/* 推荐观看：TMDB 推荐仅展示已入库（有本地 id）的项；其余用相似推荐补足，避免「有海报但点不进去」 */}
          {(() => {
            const tmdbLinked = (tmdbRecs || []).filter((m) => m.id != null);
            const tmdbIdSet = new Set(tmdbLinked.map((m) => m.id));
            const similarExtra = similar.filter((m) => !tmdbIdSet.has(m.id));
            if (tmdbLinked.length === 0 && similarExtra.length === 0) return null;
            return (
              <section className="detail-section">
                <h2 className="section-title">推荐观看</h2>
                <div className="rec-carousel">
                  {tmdbLinked.map((m) => (
                    <Link key={`tmdb-${m.tmdb_id}`} to={`/movies/${m.id}`} className="rec-card">
                      <img src={m.poster_path || ''} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                      <div className="rec-info">
                        <span className="rec-title">{m.title}</span>
                        {m.vote_average != null && <span className="rec-score">★ {m.vote_average}</span>}
                      </div>
                    </Link>
                  ))}
                  {similarExtra.map((m) => (
                    <MovieCard
                      key={`sim-${m.id}`}
                      movie={m}
                      onClick={() => api.post('/recommend/events', { scene: SCENE_SIMILAR, movieId: m.id, eventType: 'click' }).catch(() => {})}
                    />
                  ))}
                </div>
              </section>
            );
          })()}
        </div>

        {/* 右侧信息栏 · TMDB 风格：社交图标 + 元数据 + 关键词 */}
        {hasSidebar && (
          <aside className="detail-sidebar">
            {/* 社交链接：Facebook / Twitter / Instagram / 官网链接 */}
            {hasSocial && (
              <div className="detail-sidebar-social">
                {tmdbDetails.facebook_id && (
                  <a href={`https://www.facebook.com/${tmdbDetails.facebook_id}`} target="_blank" rel="noopener noreferrer" className="detail-social-icon" aria-label="Facebook">
                    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </a>
                )}
                {tmdbDetails.twitter_id && (
                  <a href={`https://twitter.com/${tmdbDetails.twitter_id}`} target="_blank" rel="noopener noreferrer" className="detail-social-icon" aria-label="Twitter">
                    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </a>
                )}
                {tmdbDetails.instagram_id && (
                  <a href={`https://www.instagram.com/${tmdbDetails.instagram_id}`} target="_blank" rel="noopener noreferrer" className="detail-social-icon" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                  </a>
                )}
                {(tmdbDetails.facebook_id || tmdbDetails.instagram_id || tmdbDetails.twitter_id) && tmdbDetails.homepage && <span className="detail-social-sep" />}
                {tmdbDetails.homepage && (
                  <a href={tmdbDetails.homepage} target="_blank" rel="noopener noreferrer" className="detail-social-icon" aria-label="官网">
                    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" /></svg>
                  </a>
                )}
              </div>
            )}
            {/* 元数据：原名、状态、默认语言、预算、票房 */}
            {tmdbDetails.original_title && (
              <div className="detail-sidebar-row">
                <span className="detail-sidebar-label">原名</span>
                <span className="detail-sidebar-value">{tmdbDetails.original_title}</span>
              </div>
            )}
            {tmdbDetails.status && (
              <div className="detail-sidebar-row">
                <span className="detail-sidebar-label">状态</span>
                <span className="detail-sidebar-value">{tmdbDetails.status}</span>
              </div>
            )}
            {tmdbDetails.original_language && (
              <div className="detail-sidebar-row">
                <span className="detail-sidebar-label">默认语言</span>
                <span className="detail-sidebar-value">{tmdbDetails.original_language}</span>
              </div>
            )}
            {tmdbDetails.budget != null && tmdbDetails.budget > 0 && (
              <div className="detail-sidebar-row">
                <span className="detail-sidebar-label">预算</span>
                <span className="detail-sidebar-value">{formatMoney(tmdbDetails.budget)}</span>
              </div>
            )}
            {tmdbDetails.revenue != null && tmdbDetails.revenue > 0 && (
              <div className="detail-sidebar-row">
                <span className="detail-sidebar-label">票房</span>
                <span className="detail-sidebar-value">{formatMoney(tmdbDetails.revenue)}</span>
              </div>
            )}
            {tmdbDetails.keywords?.length > 0 && (
              <div className="detail-sidebar-section">
                <span className="detail-sidebar-label">关键词</span>
                <div className="detail-keywords">
                  {tmdbDetails.keywords.map((kw, i) => (
                    <span key={i} className="detail-keyword-tag">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

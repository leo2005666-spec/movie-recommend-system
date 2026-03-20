import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, getCoverUrl } from '../api/request';
import MovieBanner from '../components/MovieBanner';
import MovieCard from '../components/MovieCard';
import MovieLoading from '../components/MovieLoading';

const SCENE_HOME = 'home_personalized';

export default function Home() {
  const { user } = useAuth();
  const [recommend, setRecommend] = useState([]);
  const [tastes, setTastes] = useState([]);
  const [tasteType, setTasteType] = useState('');
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [hotComments, setHotComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/recommend/tastes').then((r) => setTastes(r.data || [])).catch(() => {});
  }, []);
  useEffect(() => {
    api.get('/charts', { type: 'weekly', limit: 8 }).then((r) => setWeeklyChart(r.data?.list || [])).catch(() => {});
  }, []);
  useEffect(() => {
    api.get('/comments/hot', { limit: 6 }).then((r) => setHotComments(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = { limit: 12 };

    const finish = (list) => {
      if (!cancelled) {
        setRecommend(list);
        setLoading(false);
      }
    };

    const loadRecommend = async () => {
      setLoading(true);
      try {
        if (tasteType) {
          const r = await api.get('/recommend', { ...params, tasteType });
          finish(r.data || []);
          return;
        }

        const r = await api.get('/recommendations', { scene: SCENE_HOME, ...params });
        let list = Array.isArray(r.data) ? r.data : [];
        if (list.length === 0) {
          const fb = await api.get('/recommend', params);
          list = fb.data || [];
        }
        finish(list);

        if (!cancelled && user && list.length > 0) {
          list.slice(0, 12).forEach((m) => {
            api.post('/recommend/events', { scene: SCENE_HOME, movieId: m.id, eventType: 'exposure' }).catch(() => {});
          });
        }
      } catch {
        if (cancelled) return;
        try {
          const r = await api.get('/recommend', params);
          finish(r.data || []);
        } catch {
          finish([]);
        }
      }
    };

    loadRecommend();
    return () => { cancelled = true; };
  }, [tasteType, user]);

  return (
    <div>
      <MovieBanner />
      <section className="hero">
        <h1 className="hero__title">发现你喜欢的影视</h1>
        <p className="hero__subtitle">基于你的偏好，为你推荐个性化作品；选择人群口味，一键获取精选片单</p>
        <div className="hero__actions">
          <Link to="/recommend" className="btn">去看看推荐</Link>
          <Link to="/movies" className="btn btn-outline">浏览全部</Link>
        </div>
      </section>

      {tastes.length > 0 && (
        <div className="taste-chips" style={{ marginBottom: 'var(--space-lg)' }}>
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

      <section>
        <h2 className="section-title">
          {tasteType ? tastes.find((t) => t.key === tasteType)?.label + '精选' : '为你推荐'}
        </h2>
        {loading ? (
          <MovieLoading count={12} />
        ) : recommend.length ? (
          <div className="movie-grid movie-grid--home">
            {recommend.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                onClick={() => {
                  if (!tasteType) {
                    api.post('/recommend/events', { scene: SCENE_HOME, movieId: m.id, eventType: 'click' }).catch(() => {});
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <p className="empty-hint">
            {tasteType ? '该人群暂无匹配影片，试试其他口味或' : '暂无推荐，先去 '}
            <Link to="/movies">浏览影视</Link>
            {!tasteType && ' 或 '}
            {!tasteType && <Link to="/login">登录</Link>}
            {!tasteType && ' 获取个性化推荐'}。
          </p>
        )}
      </section>

      {weeklyChart.length > 0 && (
        <section style={{ marginTop: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>一周口碑榜</h2>
            <Link to="/charts" className="link-more">更多榜单 »</Link>
          </div>
          <div className="chart-table">
            <table>
              <tbody>
                {weeklyChart.slice(0, 8).map((m) => (
                  <tr key={m.id}>
                    <td style={{ width: 48, padding: 'var(--space-sm) var(--space-md)' }}>
                      <span className={`chart-rank ${m.rank <= 3 ? 'top3' : ''}`}>{m.rank}</span>
                    </td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                      <Link to={`/movies/${m.id}`} className="chart-movie">
                        <img src={getCoverUrl(m)} alt="" className="chart-poster" onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }} />
                        <div>
                          <span className="chart-title">{m.title}</span>
                          {m.release_year && <span className="chart-year">{m.release_year}</span>}
                        </div>
                      </Link>
                    </td>
                    <td style={{ width: 70, padding: 'var(--space-sm) var(--space-md)' }}>
                      <span className="chart-score">{m.avg_score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {hotComments.length > 0 && (
        <section style={{ marginTop: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>热门影评</h2>
          </div>
          <div className="hot-reviews">
            {hotComments.map((c) => (
              <div key={c.id} className="hot-review-card">
                <div className="hot-review-header">
                  <Link to={`/movies/${c.movie_id}`} className="hot-review-movie">{c.movie_title}</Link>
                  <span className="empty-hint" style={{ fontSize: '0.82rem' }}>{c.created_at}</span>
                </div>
                <p className="hot-review-content">{c.content.length > 120 ? c.content.slice(0, 120) + '…' : c.content}</p>
                <div className="hot-review-author">
                  — {c.nickname || c.username}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

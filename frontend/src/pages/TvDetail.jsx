/**
 * 剧集详情：数据来自 GET /api/tmdb/tv/:tmdbId（实时 TMDB + 短缓存），与 TMDB 展示一致
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getProxiedImageUrl } from '../api/request';
import { getScoreColor } from '../components/MovieCard';
import DetailPageLoading from '../components/DetailPageLoading';
import { castNameInitial, castPlaceholderGradient } from '../utils/castCard';

function formatEpRuntime(minsArr) {
  if (!Array.isArray(minsArr) || !minsArr.length) return null;
  const m = minsArr[0];
  if (!m || m < 1) return null;
  return `${m} 分钟/集`;
}

export default function TvDetail() {
  const { tmdbId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr('');
    api
      .get(`/tmdb/tv/${tmdbId}`)
      .then((r) => {
        if (!cancelled) setData(r.data || null);
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e.message || '加载失败');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tmdbId]);

  if (loading) return <DetailPageLoading />;
  if (err || !data) {
    return (
      <div className="page-container" style={{ padding: '2rem', maxWidth: 560, margin: '0 auto' }}>
        <p className="empty-hint" style={{ marginBottom: '1rem' }}>
          {err || '未找到该剧集'}
        </p>
        <Link to="/" className="btn btn-outline">
          返回首页
        </Link>
      </div>
    );
  }

  const poster = data.poster_path ? getProxiedImageUrl(data.poster_path) : '';
  const backdrop = data.backdrop_path ? getProxiedImageUrl(data.backdrop_path) : poster;
  const scorePercent =
    data.vote_average != null && !Number.isNaN(Number(data.vote_average))
      ? Math.round(Number(data.vote_average) * 10)
      : null;
  const year = data.first_air_date ? String(data.first_air_date).slice(0, 4) : null;
  const epRt = formatEpRuntime(data.episode_run_time);

  return (
    <div className="detail-page detail-page--tmdb-light">
      <div
        className={`detail-hero detail-hero--cinematic${data.backdrop_path ? '' : ' detail-hero--poster-fallback'}`}
      >
        <div
          className="detail-hero__bg"
          style={{ backgroundImage: backdrop ? `url(${backdrop})` : undefined }}
        />
        <div className="detail-hero__overlay" />
        <div className="detail-hero__content">
          <div className="detail-layout">
            <img
              src={poster || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" fill="%231a1a2e"><rect width="300" height="450"/></svg>'}
              alt=""
              className="detail-poster"
              onError={(e) => {
                e.target.src =
                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" fill="%231a1a2e"><rect width="300" height="450"/></svg>';
              }}
            />
            <div className="detail-info">
              <h1 className="detail-title">
                {data.name}
                {year ? <span className="detail-year"> ({year})</span> : null}
              </h1>
              <p className="detail-meta" style={{ marginTop: '0.35rem' }}>
                <span>电视剧</span>
                {data.status ? <span> · {data.status}</span> : null}
                {data.first_air_date ? <span> · 首播 {data.first_air_date}</span> : null}
                {data.number_of_seasons != null ? <span> · 共 {data.number_of_seasons} 季</span> : null}
                {data.number_of_episodes != null ? <span> · {data.number_of_episodes} 集</span> : null}
                {epRt ? <span> · {epRt}</span> : null}
                {data.genres?.length ? <span> · {data.genres.map((g) => g.name).join(', ')}</span> : null}
              </p>

              <div className="detail-score-row" style={{ marginTop: '1rem' }}>
                <div
                  className="detail-score-circle"
                  data-color={scorePercent != null ? (scorePercent >= 70 ? 'green' : scorePercent >= 40 ? 'yellow' : 'red') : ''}
                >
                  <svg viewBox="0 0 36 36">
                    <path
                      className="detail-score-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
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
                  <span>TMDB 用户评分</span>
                </div>
              </div>

              <div className="detail-actions detail-actions--icons" style={{ marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                {data.trailer_url && (
                  <a
                    href={data.trailer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-trailer"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M8 5v14l11-7z" />
                    </svg>
                    播放预告片
                  </a>
                )}
                {data.tmdb_url && (
                  <a
                    href={data.tmdb_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-more"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    在 TMDB 打开
                  </a>
                )}
                {data.homepage && (
                  <a href={data.homepage} target="_blank" rel="noopener noreferrer" className="link-more">
                    官网
                  </a>
                )}
              </div>

              {data.creators?.length > 0 && (
                <p className="detail-crew" style={{ marginTop: '1rem' }}>
                  <strong>创作</strong>{' '}
                  {data.creators.map((c) => c.name).filter(Boolean).join('、')}
                </p>
              )}

              <h3 className="detail-synopsis-title" style={{ marginTop: '1.25rem' }}>
                简介
              </h3>
              <p className="detail-synopsis">{data.overview || '暂无简介'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-body detail-body--no-sidebar">
        <div className="detail-main">
          {data.cast?.length > 0 && (
            <section className="detail-section detail-section--cast">
              <h2 className="section-title section-title--cast">演员阵容</h2>
              <div className="cast-row cast-row--filmstrip">
                {data.cast.map((c, i) => (
                  <div key={c.id || i} className="cast-card cast-card--filmstrip">
                    {c.id ? (
                      <Link to={`/actors/${c.id}`} className="cast-card__link">
                        <div className="cast-photo cast-photo--filmstrip">
                          {c.profile_path ? (
                            <img src={c.profile_path} alt={c.name} onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div
                              className="cast-placeholder cast-placeholder--filmstrip"
                              style={{ background: castPlaceholderGradient(c.id || i) }}
                              aria-hidden
                            >
                              {castNameInitial(c.name)}
                            </div>
                          )}
                        </div>
                        <div className="cast-info cast-info--filmstrip">
                          <div className="cast-name cast-name--filmstrip">{c.name}</div>
                          <div className="cast-character cast-character--filmstrip">{c.character || '—'}</div>
                        </div>
                      </Link>
                    ) : (
                      <div className="cast-card__link">
                        <div className="cast-info cast-info--filmstrip">
                          <div className="cast-name cast-name--filmstrip">{c.name}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.recommendations?.length > 0 && (
            <section className="detail-section" style={{ marginTop: 'var(--space-xl)' }}>
              <h2 className="section-title">相似剧集</h2>
              <div className="movie-grid movie-grid--tmdb-list" style={{ marginTop: 'var(--space-md)' }}>
                {data.recommendations.map((t) => {
                  const fallbackSvg =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" fill="%232a2a35"><rect width="100" height="150"/></svg>';
                  return (
                    <Link key={t.tmdb_id} to={`/tv/tmdb/${t.tmdb_id}`} className="movie-card">
                      <div className="movie-card__cover-wrap">
                        {t.poster_path ? (
                          <img
                            src={getProxiedImageUrl(t.poster_path)}
                            alt=""
                            className="cover"
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = fallbackSvg;
                            }}
                          />
                        ) : (
                          <img src={fallbackSvg} alt="" className="cover" />
                        )}
                      </div>
                      <div className="info">
                        <div className="title">{t.title}</div>
                        <div className="meta movie-card__meta-col">
                          <span className="movie-card__date-line">
                            {t.first_air_date ? t.first_air_date.slice(0, 4) : ''}
                            {t.vote_average != null ? ` · TMDB ${Number(t.vote_average).toFixed(1)}` : ''}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

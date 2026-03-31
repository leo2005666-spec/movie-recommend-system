import { Link } from 'react-router-dom';
import { getProxiedImageUrl } from '../api/request';

function posterSrc(url) {
  if (!url) return '';
  return getProxiedImageUrl(url);
}

/**
 * TMDB 式奖项分组列表（人物页 / 影片页共用，样式与官网一致）
 * @param {{ groups: array, nomination_count?: number|null, win_count?: number|null, summary_text?: string }} data
 * @param {string} panelId 锚点 id，用于顶部横条跳转
 * @param {string} [wrapClassName] 白底卡片额外 class（如演员页 actor-page__card）
 * @param {boolean} [showStrip=true] 是否显示深色 AWARDS 横条（独立奖项页可关闭）
 */
export default function TmdbAwardsListing({ data, panelId = 'tmdb-awards-panel', wrapClassName = '', showStrip = true }) {
  if (!data?.groups?.length) return null;

  const n = data.nomination_count;
  const w = data.win_count;
  const summaryRight =
    n != null && w != null ? (
      <>
        共 {n} 项提名，共 {w} 个奖项
      </>
    ) : (
      data.summary_text || ''
    );

  const panelClass = ['actor-awards-tmdb', 'card', wrapClassName].filter(Boolean).join(' ');

  return (
    <div className="actor-awards-wrap-inner">
      {showStrip && (
        <a href={`#${panelId}`} className="actor-awards-strip">
          <span className="actor-awards-strip__text">
            <span className="actor-awards-strip__title">
              <span className="actor-awards-strip__star" aria-hidden>
                ✦
              </span>{' '}
              AWARDS
            </span>
            <span className="actor-awards-strip__sub">
              {n != null ? `共 ${n} 项提名` : '奖项与提名'}
              <span className="actor-awards-strip__arrow" aria-hidden>
                →
              </span>
            </span>
          </span>
          <span className="actor-awards-strip__sparkles" aria-hidden>
            <span className="actor-awards-strip__spark actor-awards-strip__spark--lg" />
            <span className="actor-awards-strip__spark" />
            <span className="actor-awards-strip__spark actor-awards-strip__spark--sm" />
          </span>
        </a>
      )}

      <div id={panelId} className={panelClass}>
        <header className="actor-awards-tmdb__head">
          <h3 className="actor-awards-tmdb__h-serif">AWARDS</h3>
          <p className="actor-awards-tmdb__summary">{summaryRight}</p>
        </header>
        <div className="actor-awards-tmdb__rule" />

        <div className="actor-awards-tmdb__groups">
          {data.groups.map((g) => (
            <div key={`${g.organization_name}-${g.organization_path}`} className="actor-awards-group">
              <div className="actor-awards-group__title-row">
                <div className="actor-awards-group__mob-logo">
                  {g.organization_logo_url ? (
                    <a href={g.organization_url} target="_blank" rel="noopener noreferrer" className="actor-awards-group__logo-link">
                      <img src={posterSrc(g.organization_logo_url)} alt="" className="actor-awards-group__logo-sm" />
                    </a>
                  ) : null}
                </div>
                <a href={g.organization_url} target="_blank" rel="noopener noreferrer" className="actor-awards-group__org-link">
                  {g.organization_name}
                </a>
              </div>

              <div className="actor-awards-group__body">
                <div className="actor-awards-group__logo-col">
                  {g.organization_logo_url ? (
                    <a href={g.organization_url} target="_blank" rel="noopener noreferrer" className="actor-awards-group__logo-box">
                      <img src={posterSrc(g.organization_logo_url)} alt="" />
                    </a>
                  ) : (
                    <div className="actor-awards-group__logo-ph" />
                  )}
                </div>

                <div className="actor-awards-group__cards">
                  {g.entries.map((e, idx) => (
                    <div key={`${e.ceremony_label}-${e.category_name}-${idx}`} className="actor-awards-card">
                      <div className="actor-awards-card__poster">
                        {e.poster_url ? (
                          e.movie_local_id ? (
                            <Link to={`/movies/${e.movie_local_id}`}>
                              <img src={posterSrc(e.poster_url)} alt="" />
                            </Link>
                          ) : (
                            <a
                              href={e.movie_tmdb_id ? `https://www.themoviedb.org/movie/${e.movie_tmdb_id}` : e.ceremony_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img src={posterSrc(e.poster_url)} alt="" />
                            </a>
                          )
                        ) : (
                          <div className="actor-awards-card__poster-ph" />
                        )}
                      </div>
                      <div className="actor-awards-card__main">
                        <p className="actor-awards-card__ceremony">
                          <a href={e.ceremony_url} target="_blank" rel="noopener noreferrer">
                            {e.ceremony_label}
                          </a>
                        </p>
                        <p className="actor-awards-card__category-line">
                          <span className={e.is_winner ? 'actor-awards-badge actor-awards-badge--win' : 'actor-awards-badge actor-awards-badge--nom'}>
                            {e.is_winner ? '获奖' : '提名'}
                          </span>{' '}
                          <a href={e.category_url} target="_blank" rel="noopener noreferrer" className="actor-awards-card__cat-name">
                            {e.category_name}
                          </a>
                        </p>
                        {e.shared_with?.length > 0 && (
                          <div className="actor-awards-card__shared">
                            <p className="actor-awards-card__shared-label">Shared with...</p>
                            <ul className="actor-awards-card__shared-list">
                              {e.shared_with.map((p) => (
                                <li key={`${p.tmdb_id ?? 'x'}-${p.name}`} className="actor-awards-card__shared-item">
                                  {p.profile_thumb ? (
                                    p.tmdb_id ? (
                                      <Link to={`/actors/${p.tmdb_id}`} className="actor-awards-card__shared-av">
                                        <img src={posterSrc(p.profile_thumb)} alt="" />
                                      </Link>
                                    ) : (
                                      <span className="actor-awards-card__shared-av">
                                        <img src={posterSrc(p.profile_thumb)} alt="" />
                                      </span>
                                    )
                                  ) : (
                                    <div className="actor-awards-card__shared-av actor-awards-card__shared-av--ph" />
                                  )}
                                  {p.tmdb_id ? (
                                    <Link to={`/actors/${p.tmdb_id}`} className="actor-awards-card__shared-name">
                                      {p.name}
                                    </Link>
                                  ) : (
                                    <span className="actor-awards-card__shared-name">{p.name}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="actor-awards-card__year">{e.year_label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

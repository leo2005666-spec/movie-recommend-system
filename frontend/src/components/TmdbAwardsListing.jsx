import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getProxiedImageUrl, upgradeTmdbImageUrl } from '../api/request';

function awardImgSrc(url, { highRes = false, kind = 'default' } = {}) {
  if (!url) return '';
  let u = url;
  if (highRes) {
    if (kind === 'poster') u = upgradeTmdbImageUrl(u, 'w780');
    else if (kind === 'profile') u = upgradeTmdbImageUrl(u, 'h632');
    else u = upgradeTmdbImageUrl(u, 'w500');
  }
  return getProxiedImageUrl(u);
}

/**
 * TMDB 式奖项分组列表（人物页 / 影片页共用，样式与官网一致）
 * @param {{ groups: array, nomination_count?: number|null, win_count?: number|null, summary_text?: string }} data
 * @param {string} panelId 锚点 id，用于顶部横条跳转
 * @param {string} [wrapClassName] 白底卡片额外 class（如演员页 actor-page__card）
 * @param {boolean} [showStrip=true] 是否显示深色 AWARDS 横条（独立奖项页可关闭）
 * @param {boolean} [highResImages=false] 是否使用更大尺寸 TMDB 图源（演员奖项独立页）
 */
export default function TmdbAwardsListing({
  data,
  panelId = 'tmdb-awards-panel',
  wrapClassName = '',
  showStrip = true,
  highResImages = false,
}) {
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
                    <span className="actor-awards-group__logo-link">
                      <img src={awardImgSrc(g.organization_logo_url, { highRes: highResImages, kind: 'logo' })} alt="" className="actor-awards-group__logo-sm" />
                    </span>
                  ) : null}
                </div>
                <span className="actor-awards-group__org-link">{g.organization_name}</span>
              </div>

              <div className="actor-awards-group__body">
                <div className="actor-awards-group__logo-col">
                  {g.organization_logo_url ? (
                    <span className="actor-awards-group__logo-box">
                      <img src={awardImgSrc(g.organization_logo_url, { highRes: highResImages, kind: 'logo' })} alt="" />
                    </span>
                  ) : (
                    <div className="actor-awards-group__logo-ph" />
                  )}
                </div>

                <div className="actor-awards-group__cards">
                  {(g.entries || []).map((e, idx) => (
                    <div key={`${e.ceremony_label}-${e.category_name}-${idx}`} className="actor-awards-card">
                      <div className="actor-awards-card__poster">
                        {e.poster_url ? (
                          e.movie_local_id ? (
                            <Link to={`/movies/${e.movie_local_id}`}>
                              <img src={awardImgSrc(e.poster_url, { highRes: highResImages, kind: 'poster' })} alt="" loading="lazy" decoding="async" />
                            </Link>
                          ) : (
                            <span>
                              <img src={awardImgSrc(e.poster_url, { highRes: highResImages, kind: 'poster' })} alt="" loading="lazy" decoding="async" />
                            </span>
                          )
                        ) : (
                          <div className="actor-awards-card__poster-ph" />
                        )}
                      </div>
                      <div className="actor-awards-card__main">
                        <p className="actor-awards-card__ceremony">{e.ceremony_label}</p>
                        <p className="actor-awards-card__category-line">
                          <span className={e.is_winner ? 'actor-awards-badge actor-awards-badge--win' : 'actor-awards-badge actor-awards-badge--nom'}>
                            {e.is_winner ? '获奖' : '提名'}
                          </span>{' '}
                          <span className="actor-awards-card__cat-name">{e.category_name}</span>
                        </p>
                        {e.shared_with?.length > 0 && (
                          <SharedWithList people={e.shared_with} highResImages={highResImages} />
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

function SharedWithList({ people = [], highResImages = false }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="actor-awards-card__shared">
      <p className="actor-awards-card__shared-label">Shared with...</p>
      {!expanded && (
        <button
          type="button"
          className="actor-awards-card__shared-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          展开名单（{people.length}人）
        </button>
      )}
      {expanded && (
        <>
          <ul className="actor-awards-card__shared-list">
            {people.map((p) => (
              <li key={`${p.tmdb_id ?? 'x'}-${p.name}`} className="actor-awards-card__shared-item">
                {p.profile_thumb ? (
                  p.tmdb_id ? (
                    <Link to={`/actors/${p.tmdb_id}`} className="actor-awards-card__shared-av">
                      <img
                        src={awardImgSrc(p.profile_thumb, { highRes: highResImages, kind: 'profile' })}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </Link>
                  ) : (
                    <span className="actor-awards-card__shared-av">
                      <img
                        src={awardImgSrc(p.profile_thumb, { highRes: highResImages, kind: 'profile' })}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
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
          <button
            type="button"
            className="actor-awards-card__shared-toggle"
            onClick={() => setExpanded(false)}
          >
            收起名单
          </button>
        </>
      )}
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  UserIcon,
  CaretDown,
  CaretUp,
  ArrowSquareOutIcon,
  ListBulletsIcon,
} from '@phosphor-icons/react';
import { api } from '../api/request';
import DetailPageLoading from '../components/DetailPageLoading';
import ActorAwardsSection from '../components/ActorAwardsSection';

/** TMDB w92 海报条用更清晰尺寸 */
function railPosterUrl(thumb) {
  if (!thumb || typeof thumb !== 'string') return '';
  return thumb.includes('/w92/') ? thumb.replace('/w92/', '/w185/') : thumb;
}

export default function ActorDetail() {
  const { tmdbId } = useParams();
  const [payload, setPayload] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [bioOpen, setBioOpen] = useState(false);
  const [filterMode, setFilterMode] = useState('all');
  const [sortMode, setSortMode] = useState('date-desc');

  useEffect(() => {
    setLoading(true);
    setErr('');
    api
      .get(`/actors/${tmdbId}`)
      .then((r) => setPayload(r.data))
      .catch((e) => setErr(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [tmdbId]);

  const filmography = payload?.filmography;
  const displayRows = useMemo(() => {
    if (!filmography?.length) return [];
    let rows = [...filmography];
    if (filterMode === 'library_only') rows = rows.filter((r) => r.in_library);
    rows.sort((a, b) => {
      if (sortMode === 'title') {
        return (a.title || '').localeCompare(b.title || '', 'zh-CN');
      }
      const da = a.release_date || '0000-01-01';
      const db = b.release_date || '0000-01-01';
      if (sortMode === 'date-asc') return da.localeCompare(db);
      return db.localeCompare(da);
    });
    return rows;
  }, [filmography, filterMode, sortMode]);

  /** 横向「知名作品」：与当前筛选/排序一致，取前若干条 */
  const knownRailRows = useMemo(() => displayRows.slice(0, 16), [displayRows]);

  if (loading) {
    return <DetailPageLoading />;
  }
  if (err || !payload?.person) {
    return (
      <div className="actor-page actor-page--fullbleed">
        <p className="error-msg">{err || '暂无数据'}</p>
        <Link to="/movies">返回影视库</Link>
      </div>
    );
  }

  const { person, movies, tmdb_movie_credits_count, tmdb_person_url } = payload;
  const bio = person.biography || '';
  const bioShort = bio.length > 360 ? `${bio.slice(0, 360)}…` : bio;
  const aliases = (person.also_known_as || []).slice(0, 8);
  const imdbUrl = person.imdb_id ? `https://www.imdb.com/name/${person.imdb_id}` : null;

  /** 资料完整度（用于侧栏展示，与 TMDB 参考页类似） */
  const profileFields = [person.name, person.birthday, person.place_of_birth, person.gender, bio].filter(Boolean);
  const profilePct = Math.min(100, Math.round((profileFields.length / 5) * 100));

  return (
    <div className="actor-page actor-page--fullbleed detail-page detail-page--tmdb-light">
      <nav className="actor-page__subnav" aria-label="页面分区">
        <span className="actor-page__subnav-item actor-page__subnav-item--active">概览</span>
        <span className="actor-page__subnav-item">媒体</span>
        <span className="actor-page__subnav-item">影迷圈</span>
        <span className="actor-page__subnav-item">分享</span>
      </nav>

      <div className="actor-page__shell">
        <aside className="actor-page__sidebar card actor-page__card">
          <h2 className="actor-page__sidebar-name">{person.name}</h2>
          <div className="actor-page__photo-wrap">
            {person.profile_path ? (
              <img src={person.profile_path} alt="" className="actor-page__photo" />
            ) : (
              <div className="actor-page__photo actor-page__photo--placeholder">
                <UserIcon size={64} weight="regular" />
              </div>
            )}
          </div>

          <dl className="actor-page__dl actor-page__dl--sidebar">
            <dt>知名领域</dt>
            <dd>{person.known_for_department || '表演'}</dd>
            <dt>参与作品数</dt>
            <dd>{typeof tmdb_movie_credits_count === 'number' ? tmdb_movie_credits_count : '—'}</dd>
            {person.gender && (
              <>
                <dt>性别</dt>
                <dd>{person.gender}</dd>
              </>
            )}
            {person.birthday && (
              <>
                <dt>生日</dt>
                <dd>{person.birthday}</dd>
              </>
            )}
            {person.place_of_birth && (
              <>
                <dt>出生地</dt>
                <dd>{person.place_of_birth}</dd>
              </>
            )}
            {aliases.length > 0 && (
              <>
                <dt>又名</dt>
                <dd className="actor-page__aliases">{aliases.join('、')}</dd>
              </>
            )}
          </dl>

          <div className="actor-page__profile-meter" aria-label="资料完整度">
            <div className="actor-page__profile-meter-bar">
              <span style={{ width: `${profilePct}%` }} />
            </div>
            <p className="actor-page__profile-meter-text">{profilePct}% · 资料已同步 TMDB</p>
          </div>

          <div className="actor-page__actions">
            {tmdb_person_url && (
              <a
                href={tmdb_person_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn actor-page__btn-tmdb"
              >
                在 TMDB 打开
                <ArrowSquareOutIcon size={16} weight="bold" />
              </a>
            )}
            {imdbUrl && (
              <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="actor-page__link-sub">
                IMDb 主页
              </a>
            )}
            {person.homepage && (
              <a href={person.homepage} target="_blank" rel="noopener noreferrer" className="actor-page__link-sub">
                个人官网
              </a>
            )}
          </div>

          <p className="actor-page__sidebar-foot">
            本站已收录该演员参演影片 <strong>{movies?.length ?? 0}</strong> 部，可点击下方片单跳转详情。
          </p>
        </aside>

        <div className="actor-page__main">
          <h1 className="actor-page__name">{person.name}</h1>

          {bio ? (
            <section className="actor-page__section actor-page__card card">
              <h2 className="actor-page__h2">生平简介</h2>
              <div className="actor-page__bio">
                <p>{bioOpen ? bio : bioShort}</p>
                {bio.length > 360 && (
                  <button type="button" className="actor-page__bio-toggle" onClick={() => setBioOpen(!bioOpen)}>
                    {bioOpen ? (
                      <>
                        收起 <CaretUp size={16} weight="bold" />
                      </>
                    ) : (
                      <>
                        展开 <CaretDown size={16} weight="bold" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </section>
          ) : null}

          {knownRailRows.length > 0 && (
            <section className="actor-page__section actor-page__card card" aria-labelledby="actor-known-heading">
              <h2 id="actor-known-heading" className="actor-page__h2">
                知名作品
              </h2>
              <div className="actor-page__known-scroll" role="list">
                {knownRailRows.map((row) => (
                  <div key={row.tmdb_id} className="actor-page__known-cell" role="listitem">
                    {row.in_library && row.local_id ? (
                      <Link to={`/movies/${row.local_id}`} className="actor-page__known-link">
                        <div className="actor-page__known-poster-wrap">
                          {row.poster_thumb ? (
                            <img src={railPosterUrl(row.poster_thumb)} alt="" className="actor-page__known-poster" loading="lazy" decoding="async" />
                          ) : (
                            <div className="actor-page__known-poster actor-page__known-poster--placeholder" aria-hidden />
                          )}
                        </div>
                        <span className="actor-page__known-title">{row.title}</span>
                      </Link>
                    ) : (
                      <a
                        href={`https://www.themoviedb.org/movie/${row.tmdb_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="actor-page__known-link actor-page__known-link--external"
                      >
                        <div className="actor-page__known-poster-wrap">
                          {row.poster_thumb ? (
                            <img src={railPosterUrl(row.poster_thumb)} alt="" className="actor-page__known-poster" loading="lazy" decoding="async" />
                          ) : (
                            <div className="actor-page__known-poster actor-page__known-poster--placeholder" aria-hidden />
                          )}
                        </div>
                        <span className="actor-page__known-title">{row.title}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <ActorAwardsSection tmdbId={tmdbId} />

          <section className="actor-page__section actor-page__card card">
            <div className="actor-page__film-head">
              <h2 className="actor-page__h2">
                <ListBulletsIcon size={22} weight="duotone" className="actor-page__h2-icon" />
                全部作品
              </h2>
              <div className="actor-page__film-filters">
                <label className="actor-page__filter">
                  <span className="sr-only">范围</span>
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value)}
                    className="actor-page__select"
                  >
                    <option value="all">全部</option>
                    <option value="library_only">仅本站已收录</option>
                  </select>
                </label>
                <label className="actor-page__filter">
                  <span className="sr-only">排序</span>
                  <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="actor-page__select">
                    <option value="date-desc">时间 · 新到旧</option>
                    <option value="date-asc">时间 · 旧到新</option>
                    <option value="title">标题 A-Z</option>
                  </select>
                </label>
              </div>
            </div>

            {displayRows.length === 0 ? (
              <p className="empty-hint actor-page__empty">
                {filterMode === 'library_only'
                  ? '没有已入库作品，请切换为「全部」查看 TMDB 片单，或等待站内核销影片。'
                  : '暂无参演电影数据。'}
              </p>
            ) : (
              <ul className="actor-page__film-list" role="list">
                {displayRows.map((row) => (
                  <li key={row.tmdb_id} className="actor-page__film-row">
                    <span className="actor-page__film-year">{row.release_year_label}</span>
                    <span className="actor-page__film-dot" aria-hidden />
                    <div className="actor-page__film-body">
                      {row.in_library && row.local_id ? (
                        <Link to={`/movies/${row.local_id}`} className="actor-page__film-title">
                          {row.title}
                        </Link>
                      ) : (
                        <a
                          href={`https://www.themoviedb.org/movie/${row.tmdb_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="actor-page__film-title actor-page__film-title--external"
                        >
                          {row.title}
                          <ArrowSquareOutIcon size={14} weight="bold" className="actor-page__ext-ico" />
                        </a>
                      )}
                      {row.character ? (
                        <div className="actor-page__film-role">饰演 {row.character}</div>
                      ) : (
                        <div className="actor-page__film-role actor-page__film-role--muted">—</div>
                      )}
                      {row.in_library && (
                        <span className="actor-page__film-badge">本站片库</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

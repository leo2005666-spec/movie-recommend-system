import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserIcon, FilmStripIcon, CaretDown, CaretUp } from '@phosphor-icons/react';
import MovieCard from '../components/MovieCard';
import { api } from '../api/request';
import DetailPageLoading from '../components/DetailPageLoading';

export default function ActorDetail() {
  const { tmdbId } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [bioOpen, setBioOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setErr('');
    api
      .get(`/actors/${tmdbId}`)
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [tmdbId]);

  if (loading) {
    return <DetailPageLoading />;
  }
  if (err || !data?.person) {
    return (
      <div className="form-page actor-page">
        <p className="error-msg">{err || '暂无数据'}</p>
        <Link to="/movies">返回影视库</Link>
      </div>
    );
  }

  const { person, movies, tmdb_movie_credits_count } = data;
  const bio = person.biography || '';
  const bioShort = bio.length > 320 ? `${bio.slice(0, 320)}…` : bio;

  return (
    <div className="actor-page detail-page detail-page--tmdb-light">
      <nav className="actor-page__subnav" aria-label="页面分区">
        <span className="actor-page__subnav-item actor-page__subnav-item--active">概览</span>
        <span className="actor-page__subnav-item">媒体</span>
        <span className="actor-page__subnav-item">影迷圈</span>
        <span className="actor-page__subnav-item">分享</span>
      </nav>

      <div className="actor-page__layout card">
        <aside className="actor-page__sidebar">
          <div className="actor-page__photo-wrap">
            {person.profile_path ? (
              <img src={person.profile_path} alt="" className="actor-page__photo" />
            ) : (
              <div className="actor-page__photo actor-page__photo--placeholder">
                <UserIcon size={64} weight="regular" />
              </div>
            )}
          </div>
          <section className="actor-page__meta-block">
            <h3 className="actor-page__meta-title">个人信息</h3>
            <dl className="actor-page__dl">
              <dt>艺名</dt>
              <dd>{person.name}</dd>
              {person.birthday && (
                <>
                  <dt>出生日期</dt>
                  <dd>{person.birthday}</dd>
                </>
              )}
              {person.place_of_birth && (
                <>
                  <dt>出生地</dt>
                  <dd>{person.place_of_birth}</dd>
                </>
              )}
              <dt>知名领域</dt>
              <dd>{person.known_for_department || '表演'}</dd>
            </dl>
          </section>
        </aside>

        <div className="actor-page__main">
          <h1 className="actor-page__name">{person.name}</h1>

          {bio && (
            <section className="actor-page__section">
              <h2 className="section-title">生平简介</h2>
              <div className="actor-page__bio">
                <p>{bioOpen ? bio : bioShort || '暂无简介'}</p>
                {bio.length > 320 && (
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
          )}

          <section className="actor-page__section">
            <h2 className="section-title">
              <FilmStripIcon size={22} weight="duotone" className="page-title__icon" />
              本站收录作品
              {typeof tmdb_movie_credits_count === 'number' && (
                <span className="actor-page__section-hint">
                  （片库共 {movies.length} 部，TMDB 参演电影约 {tmdb_movie_credits_count} 部）
                </span>
              )}
            </h2>
            {movies.length === 0 ? (
              <p className="empty-hint">当前片库中暂无该演员的参演影片，请从影视库浏览其他内容。</p>
            ) : (
              <div className="actor-page__filmstrip">
                {movies.map((m) => (
                  <div key={m.id} className="actor-page__film-item">
                    <MovieCard movie={m} />
                    {m.character ? (
                      <div className="actor-page__character">饰 {m.character}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

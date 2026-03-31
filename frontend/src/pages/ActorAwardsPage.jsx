import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getProxiedImageUrl, upgradeTmdbImageUrl } from '../api/request';
import DetailPageLoading from '../components/DetailPageLoading';
import TmdbAwardsListing from '../components/TmdbAwardsListing';

/**
 * 演员奖项与提名独立页（顶栏 + 列表与 TMDB /person/.../awards 一致）
 */
export default function ActorAwardsPage() {
  const { tmdbId } = useParams();
  const [person, setPerson] = useState(null);
  const [awards, setAwards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!tmdbId) return;
    let cancelled = false;
    setLoading(true);
    setErr('');
    Promise.all([
      api.get(`/actors/${tmdbId}`).catch(() => ({ data: null })),
      api.get(`/actors/${tmdbId}/awards`).catch(() => ({ data: null })),
    ])
      .then(([pr, ar]) => {
        if (cancelled) return;
        setPerson(pr.data?.person || null);
        setAwards(ar.data || null);
        if (!pr.data?.person) setErr('未找到该演员');
      })
      .catch(() => {
        if (!cancelled) setErr('加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tmdbId]);

  if (loading) {
    return <DetailPageLoading />;
  }

  if (err || !person) {
    return (
      <div className="movie-awards-page">
        <p className="error-msg">{err || '暂无数据'}</p>
        <Link to={tmdbId ? `/actors/${tmdbId}` : '/movies'}>返回</Link>
      </div>
    );
  }

  const poster = person.profile_path
    ? getProxiedImageUrl(upgradeTmdbImageUrl(person.profile_path, 'h632'))
    : '';

  return (
    <div className="movie-awards-page actor-awards-page actor-awards-page--wide">
      <header className="movie-awards-header">
        <div className="movie-awards-header__inner actor-awards-page__header-inner">
          {poster ? (
            <img
              src={poster}
              alt=""
              className="movie-awards-header__poster"
              width={120}
              height={180}
              decoding="async"
            />
          ) : (
            <div className="movie-awards-header__poster movie-awards-header__poster--ph" aria-hidden />
          )}
          <div>
            <h1 className="movie-awards-header__title">{person.name}</h1>
            <Link to={`/actors/${tmdbId}`} className="movie-awards-back">
              ← 返回主页面
            </Link>
          </div>
        </div>
      </header>

      <main className="movie-awards-main">
        {awards?.groups?.length > 0 ? (
          <TmdbAwardsListing
            data={awards}
            panelId="actor-awards-page-panel"
            showStrip={false}
            highResImages
            wrapClassName="actor-awards-page__listing-card"
          />
        ) : (
          <p className="empty-hint">暂无奖项数据，或暂时无法从 TMDB 拉取奖项页。</p>
        )}
      </main>
    </div>
  );
}

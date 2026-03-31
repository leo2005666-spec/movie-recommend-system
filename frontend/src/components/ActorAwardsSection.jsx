import { useEffect, useState } from 'react';
import { api } from '../api/request';
import TmdbAwardsListing from './TmdbAwardsListing';

/**
 * 演员页 · 奖项与提名（数据来自后端解析 TMDB 官网）
 */
export default function ActorAwardsSection({ tmdbId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!tmdbId) return;
    let cancelled = false;
    setLoading(true);
    setErr('');
    api
      .get(`/actors/${tmdbId}/awards`)
      .then((r) => {
        if (!cancelled) setData(r.data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tmdbId]);

  if (loading) {
    return (
      <section className="actor-awards-wrap" aria-labelledby="actor-awards-heading">
        <h2 id="actor-awards-heading" className="sr-only">
          奖项与提名
        </h2>
        <p className="empty-hint actor-awards-wrap__loading">正在加载奖项与提名…</p>
      </section>
    );
  }

  if (err) {
    return (
      <section className="actor-awards-wrap" aria-labelledby="actor-awards-heading">
        <h2 id="actor-awards-heading" className="sr-only">
          奖项与提名
        </h2>
        <p className="error-msg">{err}</p>
      </section>
    );
  }

  if (!data?.groups?.length) {
    return null;
  }

  return (
    <section className="actor-awards-wrap" aria-labelledby="actor-awards-heading">
      <h2 id="actor-awards-heading" className="sr-only">
        奖项与提名
      </h2>
      <TmdbAwardsListing data={data} panelId="actor-awards-tmdb-panel" wrapClassName="actor-page__card" />
    </section>
  );
}

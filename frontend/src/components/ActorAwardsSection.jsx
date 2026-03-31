import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/request';

/**
 * 演员页 · 奖项入口横条（点击进入 /actors/:tmdbId/awards 完整 TMDB 式奖项页）
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

  const n = data.nomination_count;

  return (
    <section className="actor-awards-wrap" aria-labelledby="actor-awards-heading">
      <h2 id="actor-awards-heading" className="sr-only">
        奖项与提名
      </h2>
      <Link to={`/actors/${tmdbId}/awards`} className="actor-awards-strip">
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
      </Link>
    </section>
  );
}

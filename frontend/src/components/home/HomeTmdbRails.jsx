/**
 * 首页 TMDB 同步：「热门」四 Tab（与 TMDB 热门横条一致）
 */
import { useEffect, useState } from 'react';
import { api } from '../../api/request';
import TmdbRailCard from './TmdbRailCard';
import HomePosterSkeletonRow from './HomePosterSkeletonRow';

const REGION = import.meta.env.VITE_TMDB_REGION || 'CN';

const TREND_TABS = [
  { key: 'streaming', label: '流媒体' },
  { key: 'tv', label: '电视播出' },
  { key: 'rent', label: '可供租借' },
  { key: 'theaters', label: '影院上映中' },
];

function itemKey(it) {
  if (it?.id != null) return `id-${it.id}`;
  if (it?.tmdb_id != null && it?.media_type) return `${it.media_type}-${it.tmdb_id}`;
  return `k-${it?.title}-${it?.tmdb_id}`;
}

export default function HomeTmdbRails() {
  const [trendTab, setTrendTab] = useState('streaming');
  const [trendList, setTrendList] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setTrendLoading(true);
    api
      .get('/tmdb/rail', { type: 'trending', tab: trendTab, region: REGION })
      .then((r) => {
        if (!cancelled) setTrendList(r?.data?.list || []);
      })
      .catch(() => {
        if (!cancelled) setTrendList([]);
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trendTab]);

  return (
    <section className="home-tmdb-rail-section">
      <div className="home-tmdb-section__inner home-tmdb-rail-section__inner">
        <div className="home-tmdb-rail-head home-tmdb-rail-head--tmdb-popular">
          <h2 className="home-tmdb-rail-title">热门</h2>
          <div className="home-tmdb-rail-pill-row" role="tablist" aria-label="热门分类">
            {TREND_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={trendTab === t.key}
                className={`home-tmdb-rail-pill ${trendTab === t.key ? 'home-tmdb-rail-pill--active' : ''}`}
                onClick={() => setTrendTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="home-tmdb-carousel home-tmdb-carousel--rail">
          {trendLoading ? (
            <div className="home-tmdb-carousel__track home-tmdb-carousel__track--smooth home-tmdb-carousel__track--rail">
              <HomePosterSkeletonRow count={10} variant="rail" />
            </div>
          ) : trendList.length ? (
            <div className="home-tmdb-carousel__track home-tmdb-carousel__track--smooth home-tmdb-carousel__track--rail">
              {trendList.map((it, idx) => (
                <div key={itemKey(it)} className="home-tmdb-carousel__cell home-tmdb-carousel__cell--rail">
                  <TmdbRailCard item={it} imagePriority={idx < 5} />
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-hint">暂无数据，请检查 TMDB_API_KEY 与网络</p>
          )}
        </div>
      </div>
    </section>
  );
}

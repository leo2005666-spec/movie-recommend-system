/**
 * 首页 TMDB 同步双区块：「热门」四 Tab + 「可免费观看」两 Tab（与 TMDB 中文站一致）
 */
import { useEffect, useState } from 'react';
import { api } from '../../api/request';
import TmdbRailCard from './TmdbRailCard';

const REGION = import.meta.env.VITE_TMDB_REGION || 'CN';

const TREND_TABS = [
  { key: 'streaming', label: '流媒体' },
  { key: 'tv', label: '电视播出' },
  { key: 'rent', label: '可供租借' },
  { key: 'theaters', label: '影院上映中' },
];

const FREE_TABS = [
  { key: 'movie', label: '电影' },
  { key: 'tv', label: '电视' },
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

  const [freeTab, setFreeTab] = useState('movie');
  const [freeList, setFreeList] = useState([]);
  const [freeLoading, setFreeLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    setFreeLoading(true);
    api
      .get('/tmdb/rail', { type: 'free', tab: freeTab, region: REGION })
      .then((r) => {
        if (!cancelled) setFreeList(r?.data?.list || []);
      })
      .catch(() => {
        if (!cancelled) setFreeList([]);
      })
      .finally(() => {
        if (!cancelled) setFreeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [freeTab]);

  return (
    <>
      <section className="home-tmdb-rail-section">
        <div className="home-tmdb-section__inner home-tmdb-rail-section__inner">
          <div className="home-tmdb-rail-head">
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
              <div className="home-tmdb-carousel__loading">加载中…</div>
            ) : trendList.length ? (
              <div className="home-tmdb-carousel__track home-tmdb-carousel__track--smooth home-tmdb-carousel__track--rail">
                {trendList.map((it) => (
                  <div key={itemKey(it)} className="home-tmdb-carousel__cell home-tmdb-carousel__cell--rail">
                    <TmdbRailCard item={it} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-hint">暂无数据，请检查 TMDB_API_KEY 与网络</p>
            )}
          </div>
        </div>
      </section>

      <section className="home-tmdb-rail-section home-tmdb-rail-section--free">
        <div className="home-tmdb-section__inner home-tmdb-rail-section__inner">
          <div className="home-tmdb-rail-head">
            <h2 className="home-tmdb-rail-title">可免费观看</h2>
            <div className="home-tmdb-rail-pill-row home-tmdb-rail-pill-row--free" role="tablist" aria-label="可免费观看分类">
              {FREE_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={freeTab === t.key}
                  className={`home-tmdb-rail-pill ${freeTab === t.key ? 'home-tmdb-rail-pill--active' : ''}`}
                  onClick={() => setFreeTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="home-tmdb-carousel home-tmdb-carousel--rail">
            {freeLoading ? (
              <div className="home-tmdb-carousel__loading">加载中…</div>
            ) : freeList.length ? (
              <div className="home-tmdb-carousel__track home-tmdb-carousel__track--smooth home-tmdb-carousel__track--rail">
                {freeList.map((it) => (
                  <div key={itemKey(it)} className="home-tmdb-carousel__cell home-tmdb-carousel__cell--rail">
                    <TmdbRailCard item={it} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-hint">暂无数据（该地区可能没有「免费」片源标记）</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

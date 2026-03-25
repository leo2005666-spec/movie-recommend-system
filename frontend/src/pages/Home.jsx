import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, getCoverUrl, getProxiedImageUrl, getPosterOrCoverUrl } from '../api/request';
import { normalizeMovieListResponse } from '../utils/recommendApi';
import MovieCard from '../components/MovieCard';
import TrailerStripCard from '../components/home/TrailerStripCard';
import HomeTmdbRails from '../components/home/HomeTmdbRails';
import HomePosterSkeletonRow from '../components/home/HomePosterSkeletonRow';
import HomeReviewsBoard from '../components/home/HomeReviewsBoard';
import HomeWelcomeHero from '../components/home/HomeWelcomeHero';
import { MOCK_HOME_REVIEWS } from '../constants/mockHomeReviews';

const SCENE_HOME = 'home_personalized';

/** TMDB 区域（与 tmdb.org 地区片单一致，可 VITE_TMDB_REGION=US 等） */
const TMDB_REGION = import.meta.env.VITE_TMDB_REGION || 'CN';

/** 最新预告片 · 与 TMDB 各 Tab 同源（GET /api/tmdb/trailer-row） */
/** 与 TMDB「即将上映」片单一致（均为未上映）；最后一项为 upcoming 第 4 页，非在映榜 */
const TRAILER_TABS = [
  { key: 'hot', label: '热门', trailerTab: 'hot' },
  { key: 'streaming', label: '流媒体', trailerTab: 'streaming' },
  { key: 'tv', label: '电视播出', trailerTab: 'tv' },
  { key: 'rent', label: '可供租借', trailerTab: 'rent' },
  { key: 'theaters', label: '即将上映', trailerTab: 'theaters' },
];

function movieRowKey(m) {
  if (m?.id != null) return `id-${m.id}`;
  if (m?.tmdb_id != null) return `tmdb-${m.tmdb_id}`;
  return `k-${String(m?.title || '')}`;
}

function chartItemsToMovies(chartList) {
  if (!Array.isArray(chartList)) return [];
  return chartList.map((m) => ({ ...m }));
}

export default function Home() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [trendTab, setTrendTab] = useState('today');
  const [charts, setCharts] = useState({ weekly: [], hot: [], top: [] });
  const [chartsLoaded, setChartsLoaded] = useState(false);

  const [trailerTab, setTrailerTab] = useState('hot');
  const [trailerList, setTrailerList] = useState([]);
  const [trailerLoading, setTrailerLoading] = useState(true);
  /** 悬停某部时切换背景；null 表示用列表第一项 */
  const [trailerHoverKey, setTrailerHoverKey] = useState(null);

  const [hotComments, setHotComments] = useState([]);
  const [linkMovie, setLinkMovie] = useState(null);

  const [recoLoading, setRecoLoading] = useState(true);
  const [recoList, setRecoList] = useState([]);

  /** 榜单：今日=热门榜，本周=一周口碑 */
  useEffect(() => {
    api
      .get('/charts/all', { limit: 20 })
      .then((r) => {
        const d = r?.data || {};
        setCharts({
          weekly: d.weekly || [],
          hot: d.hot || [],
          top: d.top || [],
        });
      })
      .catch(() => setCharts({ weekly: [], hot: [], top: [] }))
      .finally(() => setChartsLoaded(true));
  }, []);

  const trendMovies = useMemo(() => {
    const week = chartItemsToMovies(charts.weekly);
    const hot = chartItemsToMovies(charts.hot);
    if (trendTab === 'week') {
      return week.length ? week : hot;
    }
    return hot;
  }, [trendTab, charts]);

  const loadTrailerTab = useCallback(async (key) => {
    setTrailerLoading(true);
    setTrailerHoverKey(null);
    const tab = TRAILER_TABS.find((t) => t.key === key) || TRAILER_TABS[0];
    try {
      try {
        const r = await api.get('/tmdb/trailer-row', {
          tab: tab.trailerTab || 'hot',
          region: TMDB_REGION,
        });
        const list = r?.data?.list || [];
        if (list.length) {
          setTrailerList(list);
          return;
        }
      } catch {
        /* 走本地兜底 */
      }
      const fallback =
        tab.trailerTab === 'theaters'
          ? { releaseStatus: 'now_playing', limit: 20, page: 1 }
          : { releaseStatus: 'upcoming', orderBy: 'release_asc', limit: 20, page: 1 };
      const r = await api.get('/movies', fallback);
      setTrailerList(r?.data?.list || []);
    } catch {
      setTrailerList([]);
    } finally {
      setTrailerLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrailerTab(trailerTab);
  }, [trailerTab, loadTrailerTab]);

  useEffect(() => {
    api.get('/comments/hot', { limit: 8 }).then((r) => setHotComments(r.data || [])).catch(() => {});
  }, []);

  /** 轻量个性化条带：并行热门 + 协同，用于底部关联影片与埋点 */
  useEffect(() => {
    let cancelled = false;
    const params = { limit: 12 };
    (async () => {
      setRecoLoading(true);
      try {
        const [popularRes, recRes] = await Promise.all([
          api.get('/recommend', { ...params, prefer: 'popular' }).catch(() => null),
          api.get('/recommendations', { scene: SCENE_HOME, ...params }).catch(() => null),
        ]);
        if (cancelled) return;
        const popularList = Array.isArray(popularRes?.data) ? popularRes.data : [];
        const recList = normalizeMovieListResponse(recRes);
        const list = recList.length ? recList : popularList;
        setRecoList(list);
        if (list[0]) setLinkMovie(list[0]);
        else if (popularList[0]) setLinkMovie(popularList[0]);

        if (userId != null && list.length > 0) {
          const payload = list.slice(0, 8).map((m) => ({ scene: SCENE_HOME, movieId: m.id, eventType: 'exposure' }));
          const fire = () => {
            payload.forEach((body) => api.post('/recommend/events', body).catch(() => {}));
          };
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(fire, { timeout: 2500 });
          } else {
            window.setTimeout(fire, 400);
          }
        }
      } catch {
        if (!cancelled) {
          try {
            const r = await api.get('/recommend', { ...params, prefer: 'popular' });
            const list = Array.isArray(r?.data) ? r.data : [];
            setRecoList(list);
            if (list[0]) setLinkMovie(list[0]);
          } catch {
            setRecoList([]);
          }
        }
      } finally {
        if (!cancelled) setRecoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const trailerBgMovie = useMemo(() => {
    if (!trailerList.length) return null;
    if (trailerHoverKey == null) return trailerList[0];
    return trailerList.find((m) => movieRowKey(m) === trailerHoverKey) || trailerList[0];
  }, [trailerList, trailerHoverKey]);

  const trailerBackdropUrl = useMemo(() => {
    const m = trailerBgMovie;
    if (!m) return '';
    if (m.backdropUrl) return getProxiedImageUrl(m.backdropUrl);
    if (m.id) return getCoverUrl(m, { w: 1280 });
    return getPosterOrCoverUrl(m, { w: 1280 });
  }, [trailerBgMovie]);

  return (
    <div className="home-page home-page--tmdb-wide">
      <HomeWelcomeHero />

      {/* 趋势 */}
      <section className="home-tmdb-section home-tmdb-section--trend">
        <div className="home-tmdb-section__inner">
          <div className="home-tmdb-row__head">
            <h2 className="home-tmdb-row__title">趋势</h2>
            <div className="home-tmdb-pill-toggle" role="tablist" aria-label="趋势周期">
              <button
                type="button"
                role="tab"
                aria-selected={trendTab === 'today'}
                className={`home-tmdb-pill-toggle__btn ${trendTab === 'today' ? 'active' : ''}`}
                onClick={() => setTrendTab('today')}
              >
                今日
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={trendTab === 'week'}
                className={`home-tmdb-pill-toggle__btn ${trendTab === 'week' ? 'active' : ''}`}
                onClick={() => setTrendTab('week')}
              >
                本周
              </button>
            </div>
            <Link to="/charts" className="home-tmdb-row__more">
              更多 »
            </Link>
          </div>
          <div className="home-tmdb-wave" aria-hidden />
          <div className="home-tmdb-carousel">
            {!chartsLoaded ? (
              <div className="home-tmdb-carousel__track home-tmdb-carousel__track--smooth">
                <HomePosterSkeletonRow count={10} variant="carousel" />
              </div>
            ) : trendMovies.length ? (
              <div className="home-tmdb-carousel__track">
                {trendMovies.slice(0, 18).map((m, idx) => (
                  <div key={m.id} className="home-tmdb-carousel__cell">
                    <MovieCard
                      movie={m}
                      showRecommendReason={false}
                      showPlayOverlay={false}
                      imagePriority={idx < 5}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-hint home-tmdb-carousel__empty">暂无榜单数据，请先去影视库浏览或稍后再试。</p>
            )}
          </div>
        </div>
      </section>

      {/* 最新预告片（横版 16:9 + Tab）· 背景随悬停切换，数据来自 TMDB 实时接口 */}
      <section className="home-tmdb-section home-tmdb-section--trailers">
        <div className="home-tmdb-trailer-bg-slot" aria-hidden>
          {trailerBackdropUrl ? (
            <img
              key={trailerBackdropUrl}
              src={trailerBackdropUrl}
              alt=""
              className="home-tmdb-trailer-bg-img"
              decoding="async"
            />
          ) : null}
          <div className="home-tmdb-trailer-bg-gradient" />
        </div>
        <div className="home-tmdb-section__inner home-tmdb-section__inner--trailers">
          <div className="home-tmdb-row__head home-tmdb-row__head--on-dark">
            <h2 className="home-tmdb-row__title">最新预告片</h2>
            <div className="home-tmdb-tab-row" role="tablist" aria-label="预告片分类">
              {TRAILER_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={trailerTab === t.key}
                  className={`home-tmdb-tab ${trailerTab === t.key ? 'home-tmdb-tab--active' : ''}`}
                  onClick={() => setTrailerTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="home-tmdb-carousel home-tmdb-carousel--trailers">
            {trailerLoading ? (
              <div className="home-tmdb-carousel__track home-tmdb-carousel__track--trailers home-tmdb-carousel__track--smooth">
                <HomePosterSkeletonRow count={6} variant="trailer" onDark />
              </div>
            ) : trailerList.length ? (
              <div className="home-tmdb-carousel__track home-tmdb-carousel__track--trailers home-tmdb-carousel__track--smooth">
                {trailerList.slice(0, 16).map((m, idx) => (
                  <div key={movieRowKey(m)} className="home-tmdb-carousel__cell home-tmdb-carousel__cell--trailer">
                    <TrailerStripCard
                      movie={m}
                      imagePriority={idx < 3}
                      onHoverStart={() => setTrailerHoverKey(movieRowKey(m))}
                      onHoverEnd={() => setTrailerHoverKey(null)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="home-tmdb-carousel__empty home-tmdb-carousel__empty--light">暂无内容</p>
            )}
          </div>
        </div>
      </section>

      {/* TMDB：热门（四 Tab）+ 可免费观看（与 tmdb.org 同步） */}
      <HomeTmdbRails />

      {/* 快捷入口 + 轻量推荐 */}
      <section className="home-tmdb-section home-tmdb-section--compact">
        <div className="home-tmdb-section__inner">
          <div className="home-tmdb-inline-actions">
            <Link to="/recommend" className="btn">
              个性推荐
            </Link>
            <Link to="/movies" className="btn btn-outline">
              影视库
            </Link>
          </div>
          <h3 className="home-tmdb-subtitle">猜你喜欢</h3>
          {recoLoading ? (
            <div className="home-tmdb-carousel">
              <div className="home-tmdb-carousel__track home-tmdb-carousel__track--smooth">
                <HomePosterSkeletonRow count={8} variant="carousel" />
              </div>
            </div>
          ) : recoList.length ? (
            <div className="home-tmdb-carousel">
              <div className="home-tmdb-carousel__track">
                {recoList.slice(0, 12).map((m, idx) => (
                  <div key={m.id} className="home-tmdb-carousel__cell">
                    <MovieCard
                      movie={m}
                      showRecommendReason
                      showPlayOverlay={false}
                      imagePriority={idx < 4}
                      onClick={() => {
                        api.post('/recommend/events', { scene: SCENE_HOME, movieId: m.id, eventType: 'click' }).catch(() => {});
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="empty-hint">暂无推荐，去 <Link to="/movies">影视库</Link> 看看</p>
          )}
        </div>
      </section>

      <HomeReviewsBoard realComments={hotComments} mockReviews={MOCK_HOME_REVIEWS} linkMovie={linkMovie} />
    </div>
  );
}

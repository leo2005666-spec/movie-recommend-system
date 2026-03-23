import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, getCoverUrl } from '../api/request';
import { normalizeMovieListResponse } from '../utils/recommendApi';
import MovieCard from '../components/MovieCard';
import TrailerStripCard from '../components/home/TrailerStripCard';
import HomeReviewsBoard from '../components/home/HomeReviewsBoard';
import HomeWelcomeHero from '../components/home/HomeWelcomeHero';
import { MOCK_HOME_REVIEWS } from '../constants/mockHomeReviews';

const SCENE_HOME = 'home_personalized';

/** 最新预告片 · 筛选 Tab（对齐 TMDB 文案风格） */
const TRAILER_TABS = [
  { key: 'hot', label: '热门', mode: 'popular' },
  { key: 'worker', label: '流媒体', mode: 'taste', tasteType: 'worker' },
  { key: 'family', label: '电视播出', mode: 'taste', tasteType: 'family' },
  { key: 'couple', label: '可供租借', mode: 'taste', tasteType: 'couple' },
  { key: 'soon', label: '影院上映中', mode: 'soon' },
];

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
    const tab = TRAILER_TABS.find((t) => t.key === key) || TRAILER_TABS[0];
    try {
      if (tab.mode === 'soon') {
        const r = await api.get('/movies', {
          releaseStatus: 'unreleased',
          orderBy: 'release_asc',
          limit: 20,
          page: 1,
        });
        setTrailerList(r?.data?.list || []);
        return;
      }
      if (tab.mode === 'popular') {
        const r = await api.get('/recommend', { limit: 20, prefer: 'popular' });
        setTrailerList(Array.isArray(r?.data) ? r.data : []);
        return;
      }
      if (tab.mode === 'taste' && tab.tasteType) {
        const r = await api.get('/recommend', { limit: 20, tasteType: tab.tasteType });
        setTrailerList(Array.isArray(r?.data) ? r.data : []);
      }
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
          list.slice(0, 8).forEach((m) => {
            api.post('/recommend/events', { scene: SCENE_HOME, movieId: m.id, eventType: 'exposure' }).catch(() => {});
          });
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

  const trailerBackdrop = trailerList[0]
    ? `linear-gradient(105deg, rgba(3,12,28,0.92) 0%, rgba(12,20,40,0.78) 45%, rgba(8,15,30,0.55) 100%), url(${getCoverUrl(trailerList[0], { w: 1280 })})`
    : undefined;

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
              <div className="home-tmdb-carousel__loading">加载中…</div>
            ) : trendMovies.length ? (
              <div className="home-tmdb-carousel__track">
                {trendMovies.slice(0, 18).map((m) => (
                  <div key={m.id} className="home-tmdb-carousel__cell">
                    <MovieCard movie={m} showRecommendReason={false} showPlayOverlay={false} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-hint home-tmdb-carousel__empty">暂无榜单数据，请先去影视库浏览或稍后再试。</p>
            )}
          </div>
        </div>
      </section>

      {/* 最新预告片（横版 16:9 + Tab） */}
      <section className="home-tmdb-section home-tmdb-section--trailers" style={trailerBackdrop ? { backgroundImage: trailerBackdrop } : undefined}>
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
              <div className="home-tmdb-carousel__loading home-tmdb-carousel__loading--light">加载中…</div>
            ) : trailerList.length ? (
              <div className="home-tmdb-carousel__track home-tmdb-carousel__track--trailers">
                {trailerList.slice(0, 16).map((m) => (
                  <div key={m.id} className="home-tmdb-carousel__cell home-tmdb-carousel__cell--trailer">
                    <TrailerStripCard movie={m} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="home-tmdb-carousel__empty home-tmdb-carousel__empty--light">暂无内容</p>
            )}
          </div>
        </div>
      </section>

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
            <div className="home-tmdb-carousel__loading">加载中…</div>
          ) : recoList.length ? (
            <div className="home-tmdb-carousel">
              <div className="home-tmdb-carousel__track">
                {recoList.slice(0, 12).map((m) => (
                  <div key={m.id} className="home-tmdb-carousel__cell">
                    <MovieCard
                      movie={m}
                      showRecommendReason
                      showPlayOverlay={false}
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

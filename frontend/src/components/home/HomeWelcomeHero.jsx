import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { api, getProxiedImageUrl } from '../../api/request';
import { FALLBACK_BACKDROP_URLS } from '../../constants/homeHeroFallbacks';

/** 认为「够清晰」的最小像素宽（TMDB original 通常 ≥ 1280） */
const MIN_BACKDROP_WIDTH = 960;
const ROTATE_MS = 9000;
const FETCH_IDS = 12;

const GRADIENT_OVERLAY =
  'linear-gradient(105deg, rgba(2, 8, 28, 0.88) 0%, rgba(8, 24, 48, 0.72) 42%, rgba(0, 200, 255, 0.38) 100%)';

/**
 * 预加载并校验宽度，不合格则丢弃（避免糊图）
 * @param {string} proxiedSrc
 * @returns {Promise<string|null>}
 */
function validateBackdrop(proxiedSrc) {
  return new Promise((resolve) => {
    if (!proxiedSrc) return resolve(null);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth >= MIN_BACKDROP_WIDTH) resolve(proxiedSrc);
      else resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = proxiedSrc;
  });
}

/**
 * 首页顶部：白底细搜索条 + TMDB 风全宽 Hero（左深右亮渐变 + 可轮换高清横版背景）
 */
export default function HomeWelcomeHero() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [slides, setSlides] = useState([]);
  const [slideIndex, setSlideIndex] = useState(0);

  const goSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/movies?keyword=${encodeURIComponent(q)}`);
  }, [navigate, searchQuery]);

  const onKeySearch = useCallback(
    (e) => {
      if (e.key === 'Enter') goSearch();
    },
    [goSearch],
  );

  /** 从热门推荐拉 credits 的 backdrop_path，校验清晰度后合并兜底 */
  useEffect(() => {
    let cancelled = false;

    async function loadBackdrops() {
      const accepted = [];
      const seen = new Set();

      const pushUnique = async (fullUrl) => {
        if (!fullUrl || seen.has(fullUrl)) return;
        const proxied = getProxiedImageUrl(fullUrl);
        const ok = await validateBackdrop(proxied);
        if (ok && !cancelled) {
          seen.add(fullUrl);
          accepted.push(ok);
        }
      };

      try {
        const r = await api.get('/recommend', { limit: FETCH_IDS, prefer: 'popular' });
        const list = Array.isArray(r?.data) ? r.data : [];
        const ids = list.map((m) => m.id).filter(Boolean).slice(0, FETCH_IDS);

        for (const id of ids) {
          if (cancelled) return;
          try {
            const cr = await api.get(`/movies/${id}/credits`);
            const bp = cr?.data?.backdrop_path;
            if (typeof bp === 'string' && bp.startsWith('http')) {
              await pushUnique(bp);
            }
          } catch {
            /* 单部失败跳过 */
          }
        }
      } catch {
        /* 整批失败走兜底 */
      }

      if (cancelled) return;

      for (const u of FALLBACK_BACKDROP_URLS) {
        if (accepted.length >= 6) break;
        await pushUnique(u);
      }

      if (cancelled) return;

      if (accepted.length === 0) {
        for (const u of FALLBACK_BACKDROP_URLS) {
          if (cancelled) return;
          const proxied = getProxiedImageUrl(u);
          const ok = await validateBackdrop(proxied);
          if (ok) {
            accepted.push(ok);
            break;
          }
        }
      }

      setSlides(accepted);
      setSlideIndex(0);
    }

    loadBackdrops();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const t = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [slides.length]);

  const activeUrl = slides[slideIndex] || '';

  return (
    <div className="home-welcome-hero-wrap">
      <div className="home-welcome-hero__topbar" aria-label="快捷搜索">
        <label className="home-welcome-hero__topbar-label">
          <MagnifyingGlass className="home-welcome-hero__topbar-icon" weight="regular" aria-hidden />
          <input
            type="search"
            className="home-welcome-hero__topbar-input"
            placeholder="搜索电影、电视节目、人物…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={onKeySearch}
            enterKeyHint="search"
            autoComplete="off"
          />
        </label>
      </div>

      <section className="home-welcome-hero" aria-labelledby="home-welcome-title">
        <div className="home-welcome-hero__bg-stack" aria-hidden>
          {activeUrl ? (
            <div
              key={slideIndex}
              className="home-welcome-hero__bg-layer home-welcome-hero__bg-layer--fade"
              style={{ backgroundImage: `url(${activeUrl})` }}
            />
          ) : (
            <div className="home-welcome-hero__bg-fallback" />
          )}
        </div>
        <div className="home-welcome-hero__tint" style={{ background: GRADIENT_OVERLAY }} />

        <div className="home-welcome-hero__inner">
          <h1 id="home-welcome-title" className="home-welcome-hero__title">
            欢迎。
          </h1>
          <p className="home-welcome-hero__subtitle">这里有海量的电影、节目和人物，快来探索发现吧！</p>

          <div className="home-welcome-hero__search-pill">
            <input
              type="search"
              className="home-welcome-hero__search-pill-input"
              placeholder="搜索电影、电视节目、人物……"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={onKeySearch}
              enterKeyHint="search"
              autoComplete="off"
              aria-label="搜索影片或人物"
            />
            <button type="button" className="home-welcome-hero__search-pill-btn" onClick={goSearch}>
              搜索
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

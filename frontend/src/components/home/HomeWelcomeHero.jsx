import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { api, getProxiedImageUrl } from '../../api/request';
import { FALLBACK_BACKDROP_URLS } from '../../constants/homeHeroFallbacks';

/** 认为「够清晰」的最小像素宽（略放宽以减少解码等待；仍过滤明显竖图） */
const MIN_BACKDROP_WIDTH = 800;
const ROTATE_MS = 8000;
const RECOMMEND_LIMIT = 10;
const MAX_CREDITS_FETCH = 8;
const MAX_SLIDES = 8;

const GRADIENT_OVERLAY =
  'linear-gradient(105deg, rgba(2, 8, 28, 0.88) 0%, rgba(8, 24, 48, 0.72) 42%, rgba(0, 200, 255, 0.38) 100%)';

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

function uniqueProxied(urls) {
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/**
 * 首页顶部：白底细搜索条 + TMDB 风全宽 Hero（左深右亮渐变 + 可轮换高清横版背景）
 * 加载策略：先用本地兜底图同步铺满 → 并行拉 credits + 并行校验宽度 → 合并去重替换，避免串行 12 次请求卡顿
 */
export default function HomeWelcomeHero() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [slides, setSlides] = useState(() =>
    FALLBACK_BACKDROP_URLS.slice(0, 3).map((u) => getProxiedImageUrl(u)),
  );
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

  useEffect(() => {
    let cancelled = false;

    async function loadBackdrops() {
      const fallbackProxied = FALLBACK_BACKDROP_URLS.map((u) => getProxiedImageUrl(u));

      try {
        const r = await api.get('/recommend', { limit: RECOMMEND_LIMIT, prefer: 'popular' });
        const list = Array.isArray(r?.data) ? r.data : [];
        const ids = list.map((m) => m.id).filter(Boolean).slice(0, MAX_CREDITS_FETCH);

        const creditsResults = await Promise.all(
          ids.map((id) => api.get(`/movies/${id}/credits`).catch(() => null)),
        );

        if (cancelled) return;

        const rawUrls = [];
        for (const cr of creditsResults) {
          const bp = cr?.data?.backdrop_path;
          if (typeof bp === 'string' && bp.startsWith('http')) rawUrls.push(bp);
        }

        const proxiedFromApi = rawUrls.map((u) => getProxiedImageUrl(u));
        const validated = await Promise.all(proxiedFromApi.map((p) => validateBackdrop(p)));
        const apiOk = validated.filter(Boolean);

        const merged = uniqueProxied([...apiOk, ...fallbackProxied]).slice(0, MAX_SLIDES);

        if (cancelled) return;
        if (merged.length > 0) {
          setSlides(merged);
          setSlideIndex(0);
        }
      } catch {
        if (cancelled) return;
        const ok = await Promise.all(fallbackProxied.slice(0, 4).map((p) => validateBackdrop(p)));
        const merged = uniqueProxied(ok.filter(Boolean).length ? ok.filter(Boolean) : fallbackProxied.slice(0, 2));
        if (!cancelled && merged.length) {
          setSlides(merged);
          setSlideIndex(0);
        }
      }
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

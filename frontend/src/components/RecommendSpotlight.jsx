/**
 * 个性推荐页 · 沉浸式大背景 + 底部海报横条（推广与内容同形态自然嵌入）
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getCoverUrl } from '../api/request';
import {
  RECOMMEND_SPOTLIGHT_ADS,
  RECOMMEND_SPOTLIGHT_AD_POSITIONS,
} from '../constants/recommendSpotlightAds';

function buildStripItems(movies, ads, positions) {
  const m = Array.isArray(movies) ? movies.slice(0, 14) : [];
  const a = Array.isArray(ads) ? ads : [];
  const posSet = new Set(positions || []);
  const items = [];
  let mi = 0;
  let ai = 0;
  let slot = 0;
  const maxSlots = Math.min(12, m.length + a.length + 4);

  while (slot < maxSlots && (mi < m.length || ai < a.length)) {
    if (posSet.has(slot) && ai < a.length) {
      items.push({ kind: 'ad', key: `ad-${a[ai].id}`, ad: a[ai] });
      ai += 1;
      slot += 1;
      continue;
    }
    if (mi < m.length) {
      items.push({ kind: 'movie', key: `m-${m[mi].id}`, movie: m[mi] });
      mi += 1;
      slot += 1;
      continue;
    }
    if (ai < a.length) {
      items.push({ kind: 'ad', key: `ad-${a[ai].id}`, ad: a[ai] });
      ai += 1;
      slot += 1;
      continue;
    }
    break;
  }
  return items;
}

function backdropForItem(item) {
  if (!item) return '';
  if (item.kind === 'movie') return getCoverUrl(item.movie, { w: 1280 });
  return item.ad.coverUrl || '';
}

function titleForItem(item) {
  if (!item) return '';
  if (item.kind === 'movie') return item.movie.title || '未命名';
  return item.ad.title || item.ad.label || '推荐';
}

function subtitleForItem(item) {
  if (!item) return '';
  if (item.kind === 'movie') {
    const m = item.movie;
    const y = m.release_year || (m.release_date && String(m.release_date).slice(0, 4));
    const parts = [];
    if (y) parts.push(y);
    if (m.recommendReason) parts.push(m.recommendReason);
    else if (m.genre) parts.push(m.genre);
    return parts.join(' · ') || '根据你的偏好，从片库里挑了这一部';
  }
  return item.ad.subtitle || '';
}

/** 副一行：评分 / 导演，让信息更饱满又不挤 */
function extraLineForItem(item) {
  if (!item || item.kind !== 'movie') return null;
  const m = item.movie;
  const bits = [];
  if (m.tmdb_rating != null && !Number.isNaN(Number(m.tmdb_rating))) {
    bits.push(`TMDB ${Number(m.tmdb_rating).toFixed(1)}`);
  }
  if (m.director && String(m.director).trim()) {
    bits.push(String(m.director).split(/[,，]/)[0].trim().slice(0, 18));
  }
  if (!bits.length) return null;
  return bits.join(' · ');
}

export default function RecommendSpotlight({ movies, loading }) {
  const items = useMemo(
    () => buildStripItems(movies, RECOMMEND_SPOTLIGHT_ADS, RECOMMEND_SPOTLIGHT_AD_POSITIONS),
    [movies]
  );
  const [active, setActive] = useState(0);
  const thumbRefs = useRef({});

  useEffect(() => {
    setActive(0);
  }, [movies]);

  /** 当前选中海报滚入可视区，避免「选中了但还在屏幕外」的别扭感 */
  useEffect(() => {
    const el = thumbRefs.current[active];
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [active]);

  const safeIndex = items.length ? Math.min(active, items.length - 1) : 0;
  const current = items[safeIndex];
  const bg = backdropForItem(current);

  if (loading) {
    return (
      <section className="rec-spotlight rec-spotlight--loading" aria-busy="true">
        <div className="rec-spotlight__hero">
          <div className="rec-spotlight__skeleton-bg" />
          <div className="rec-spotlight__gradient" />
          <div className="rec-spotlight__hero-inner">
            <div className="rec-spotlight__skeleton-pill" />
            <div className="rec-spotlight__skeleton-title" />
            <div className="rec-spotlight__skeleton-line" />
          </div>
        </div>
        <div className="rec-spotlight__rail-outer">
          <p className="rec-spotlight__rail-title">加载焦点推荐…</p>
          <div className="rec-spotlight__rail-mask">
            <div className="rec-spotlight__rail">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rec-spotlight__thumb rec-spotlight__thumb--skeleton" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  const detailLink =
    current?.kind === 'movie' ? `/movies/${current.movie.id}` : current?.ad?.to || '/movies';
  const extraLine = extraLineForItem(current);
  const pillAd = current?.kind === 'ad';

  return (
    <section className="rec-spotlight" aria-label="推荐焦点与片单预览">
      <div className="rec-spotlight__hero">
        <div className="rec-spotlight__bg-layer" aria-hidden>
          {bg ? (
            <img key={bg} className="rec-spotlight__bg" src={bg} alt="" decoding="async" />
          ) : (
            <div className="rec-spotlight__bg rec-spotlight__bg--fallback" />
          )}
        </div>
        <div className="rec-spotlight__grain" aria-hidden />
        <div className="rec-spotlight__gradient" />
        <div className="rec-spotlight__hero-inner" key={safeIndex}>
          <div className="rec-spotlight__meta-row">
            <span className={`rec-spotlight__pill ${pillAd ? 'rec-spotlight__pill--soft' : ''}`}>
              {pillAd ? '小编精选' : '猜你喜欢'}
            </span>
            {current?.kind === 'movie' && current.movie?.recommendReason ? (
              <span className="rec-spotlight__reason">{current.movie.recommendReason}</span>
            ) : null}
          </div>
          <h2 className="rec-spotlight__title">{titleForItem(current)}</h2>
          <p className="rec-spotlight__desc">{subtitleForItem(current)}</p>
          {extraLine ? <p className="rec-spotlight__extra">{extraLine}</p> : null}
          <div className="rec-spotlight__cta-row">
            <Link to={detailLink} className="rec-spotlight__cta">
              {pillAd ? '去看看' : '进入详情'}
              <span aria-hidden className="rec-spotlight__cta-arrow">
                →
              </span>
            </Link>
            <span className="rec-spotlight__hint">点击下方海报快速切换</span>
          </div>
        </div>
      </div>

      <div className="rec-spotlight__rail-outer">
        <p className="rec-spotlight__rail-title">本页为你挑选 · 左右滑动查看更多</p>
        <div className="rec-spotlight__rail-mask">
          <div
            className="rec-spotlight__rail"
            role="tablist"
            aria-label="切换焦点推荐"
          >
            {items.map((item, i) => {
              const isActive = i === safeIndex;
              const poster =
                item.kind === 'movie'
                  ? getCoverUrl(item.movie, { w: 400 })
                  : item.ad.coverUrl;
              const label = item.kind === 'movie' ? item.movie.title : item.ad.label;
              return (
                <button
                  key={item.key}
                  ref={(el) => {
                    thumbRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  title={label}
                  className={`rec-spotlight__thumb ${isActive ? 'rec-spotlight__thumb--active' : ''}`}
                  onClick={() => setActive(i)}
                >
                  <span className="rec-spotlight__thumb-frame">
                    {poster ? (
                      <img src={poster} alt="" loading="lazy" />
                    ) : (
                      <span className="rec-spotlight__thumb-placeholder" />
                    )}
                    {item.kind === 'ad' && item.ad.badge ? (
                      <span className="rec-spotlight__thumb-badge">{item.ad.badge}</span>
                    ) : null}
                  </span>
                  <span className="rec-spotlight__thumb-label">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

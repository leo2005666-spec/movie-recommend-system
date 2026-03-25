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
  if (item.kind === 'movie') return getCoverUrl(item.movie, { w: 1920 });
  return item.ad.coverUrl || '';
}

function titleForItem(item) {
  if (!item) return '';
  if (item.kind === 'movie') return item.movie.title || '未命名';
  return item.ad.title || item.ad.label || '推荐';
}

function formatRuntimeMinutes(mins) {
  if (mins == null || mins === '' || Number(mins) < 1) return null;
  const n = Number(mins);
  if (Number.isNaN(n)) return null;
  return `${Math.round(n)} 分钟`;
}

/** 副标题：仅元数据，不再重复推荐理由（理由只出现在顶部单 Tag） */
function metadataLineForMovie(m) {
  if (!m) return '';
  const parts = [];
  const y = m.release_year || (m.release_date && String(m.release_date).trim().slice(0, 4));
  if (y) parts.push(String(y));
  const rt = formatRuntimeMinutes(m.duration);
  if (rt) parts.push(rt);
  if (m.tmdb_rating != null && !Number.isNaN(Number(m.tmdb_rating))) {
    parts.push(`TMDB ${Number(m.tmdb_rating).toFixed(1)} 分`);
  }
  if (m.avg_score != null && !Number.isNaN(Number(m.avg_score))) {
    parts.push(`站内 ${Number(m.avg_score).toFixed(1)} 分`);
  }
  return parts.join(' · ');
}

function subtitleForItem(item) {
  if (!item) return '';
  if (item.kind === 'movie') {
    return metadataLineForMovie(item.movie) || '';
  }
  return item.ad.subtitle || '';
}

function pillLabelForItem(item) {
  if (!item) return '';
  if (item.kind === 'ad') return '小编精选';
  const m = item.movie;
  if (m?.genre && String(m.genre).trim()) return String(m.genre).split(/[,，]/)[0].trim().slice(0, 8);
  if (m?.recommendReason && String(m.recommendReason).trim()) return String(m.recommendReason).trim();
  return '推荐';
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
  /** 仅轻量滚入可视区，避免 smooth 与悬停快速切换叠队列导致卡顿 */
  useEffect(() => {
    const el = thumbRefs.current[active];
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
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
  const pillAd = current?.kind === 'ad';
  const metaLine = subtitleForItem(current);

  return (
    <section className="rec-spotlight" aria-label="推荐焦点与片单预览">
      <div className="rec-spotlight__hero rec-spotlight__hero-banner-container">
        <div className="rec-spotlight__bg-layer" aria-hidden>
          {bg ? (
            <img key={bg} className="rec-spotlight__bg" src={bg} alt="" decoding="async" />
          ) : (
            <div className="rec-spotlight__bg rec-spotlight__bg--fallback" />
          )}
        </div>
        <div className="rec-spotlight__grain" aria-hidden />
        <div className="rec-spotlight__gradient" aria-hidden />
        <div className="rec-spotlight__hero-inner rec-spotlight__hero-content" key={safeIndex}>
          <div className="rec-spotlight__meta-row">
            <span className={`rec-spotlight__pill ${pillAd ? 'rec-spotlight__pill--soft' : ''}`}>
              {pillLabelForItem(current)}
            </span>
          </div>
          <h2 className="rec-spotlight__title">{titleForItem(current)}</h2>
          {metaLine ? <p className="rec-spotlight__desc">{metaLine}</p> : null}
          <div className="rec-spotlight__cta-row">
            <Link to={detailLink} className="rec-spotlight__cta">
              {pillAd ? '去看看' : '进入详情'}
              <span aria-hidden className="rec-spotlight__cta-arrow">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="rec-spotlight__rail-outer">
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
                  onMouseEnter={() => setActive(i)}
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

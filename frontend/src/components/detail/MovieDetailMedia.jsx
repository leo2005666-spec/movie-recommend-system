import { useState, useMemo, useEffect } from 'react';

/**
 * TMDB 风格「媒体」横条：最热门 / 视频 / 剧照 / 海报
 * 数据来自 GET /movies/:id/credits → data.media
 */
export default function MovieDetailMedia({ media }) {
  const [tab, setTab] = useState('popular');

  const hasAny = useMemo(() => {
    if (!media) return false;
    return (
      (media.popular && media.popular.length > 0) ||
      (media.videoCount || 0) > 0 ||
      (media.backdropCount || 0) > 0 ||
      (media.posterCount || 0) > 0
    );
  }, [media]);

  const stripItems = useMemo(() => {
    if (!media) return [];
    if (tab === 'popular') return media.popular || [];
    if (tab === 'backdrops') return (media.backdrops || []).map((url) => ({ url, kind: 'backdrop' }));
    if (tab === 'posters') return (media.posters || []).map((url) => ({ url, kind: 'poster' }));
    return [];
  }, [media, tab]);

  useEffect(() => {
    if (!media) return;
    if (media.popular?.length) {
      setTab('popular');
      return;
    }
    if ((media.videoCount || 0) > 0) {
      setTab('videos');
      return;
    }
    if ((media.backdropCount || 0) > 0) {
      setTab('backdrops');
      return;
    }
    if ((media.posterCount || 0) > 0) setTab('posters');
  }, [media]);

  if (!hasAny) return null;

  const tabs = [
    { key: 'popular', label: '最热门', count: null },
    { key: 'videos', label: '视频', count: media.videoCount ?? 0 },
    { key: 'backdrops', label: '剧照', count: media.backdropCount ?? 0 },
    { key: 'posters', label: '海报', count: media.posterCount ?? 0 },
  ];

  return (
    <section className="detail-section detail-section--media">
      <div className="detail-media-bar">
        <h2 className="detail-media-bar__title">媒体</h2>
        <div className="detail-media-tabs" role="tablist" aria-label="媒体分类">
          {tabs.map((t) => {
            const tabDisabled =
              t.key === 'videos'
                ? (media.videoCount || 0) === 0
                : t.key === 'backdrops'
                  ? (media.backdropCount || 0) === 0
                  : t.key === 'posters'
                    ? (media.posterCount || 0) === 0
                    : false;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                disabled={tabDisabled}
                className={`detail-media-tab ${tab === t.key ? 'detail-media-tab--active' : ''}`}
                onClick={() => !tabDisabled && setTab(t.key)}
              >
                {t.label}
                {t.count != null ? ` ${t.count}` : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div className="detail-media-gallery">
        {tab === 'videos' ? (
          <div className="detail-media-strip detail-media-strip--videos">
            {(media.videos || []).map((v) => (
              <a
                key={v.key}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-media-video"
              >
                <img src={v.thumb} alt="" className="detail-media-video__thumb" loading="lazy" />
                <span className="detail-media-video__play" aria-hidden />
                <span className="detail-media-video__cap">{v.name}</span>
              </a>
            ))}
          </div>
        ) : stripItems.length ? (
          <div className="detail-media-strip">
            {stripItems.map((item, i) => (
              <img
                key={`${item.url}-${i}`}
                src={item.url}
                alt=""
                className={`detail-media-img detail-media-img--${item.kind || 'backdrop'}${i === 0 ? ' detail-media-img--first' : ''}`}
                loading={i < 4 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        ) : (
          <p className="empty-hint detail-media-empty">暂无图片</p>
        )}
      </div>
      <div className="detail-media-footer-line" aria-hidden />
    </section>
  );
}

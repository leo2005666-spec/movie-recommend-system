/**
 * 认证页通用布局：左侧表单卡片 / 右侧电影海报拼图 + 品牌文案
 */
import { Link } from 'react-router-dom';
import { getProxiedImageUrl } from '../api/request';
import { AUTH_PAGE_POSTER_URLS } from '../constants/authPagePosters';

export default function AuthLayout({
  children,
  sideTitle = '欢迎回来',
  sideDesc = '发现你喜欢的影视',
  sideFeatures = [],
  /** 左侧是否显示站点名链接：建议 false，顶栏已有 Logo */
  showLogo = false,
}) {
  const mosaic = [...AUTH_PAGE_POSTER_URLS, ...AUTH_PAGE_POSTER_URLS].slice(0, 9);

  return (
    <div className="auth-split">
      <div className="auth-split__form">
        {showLogo ? (
          <Link to="/" className="auth-split__logo brand-text-gradient">
            火龙果影视
          </Link>
        ) : null}
        {children}
      </div>
      <div className="auth-split__brand" aria-hidden={false}>
        <div className="auth-split__mosaic" aria-hidden>
          {mosaic.map((url, i) => (
            <img
              key={i}
              src={getProxiedImageUrl(url)}
              alt=""
              className="auth-split__mosaic-cell"
              loading={i < 4 ? 'eager' : 'lazy'}
              decoding="async"
              onError={(e) => {
                const el = e.currentTarget;
                if (el.dataset.authPosterFallback === '1') {
                  el.style.opacity = '0';
                  return;
                }
                el.dataset.authPosterFallback = '1';
                const altUrl = AUTH_PAGE_POSTER_URLS[(i + 1) % AUTH_PAGE_POSTER_URLS.length];
                el.src = getProxiedImageUrl(altUrl);
              }}
            />
          ))}
        </div>
        <div className="auth-split__brand-scrim" aria-hidden />
        <div className="auth-split__brand-content">
          <div className="auth-split__brand-badge" aria-hidden>
            <span className="auth-split__brand-badge-play" />
          </div>
          <h2 className="auth-split__brand-title">{sideTitle}</h2>
          <p className="auth-split__brand-desc">{sideDesc}</p>
          {sideFeatures.length > 0 && (
            <ul className="auth-split__brand-features">
              {sideFeatures.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

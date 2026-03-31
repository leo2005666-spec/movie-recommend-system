/**
 * 认证页通用布局：左侧表单卡片 / 右侧流动海报带 + 品牌文案
 */
import { Link } from 'react-router-dom';
import AuthFilmflow from './AuthFilmflow';

export default function AuthLayout({
  children,
  sideTitle = '欢迎回来',
  sideDesc = '发现你喜欢的影视',
  sideFeatures = [],
  /** 左侧是否显示站点名链接：建议 false，顶栏已有 Logo */
  showLogo = false,
}) {
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
        <AuthFilmflow />
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

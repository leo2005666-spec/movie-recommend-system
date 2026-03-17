/**
 * 认证页通用布局：分屏设计（左侧表单 / 右侧品牌区）
 * 参考 Vercel / 现代平台风格
 */
import { Link } from 'react-router-dom';

export default function AuthLayout({
  children,
  sideTitle = '影视推荐',
  sideDesc = '发现你喜欢的影视',
  sideFeatures = [],
  showLogo = true,
}) {
  return (
    <div className="auth-split">
      <div className="auth-split__form">
        {showLogo && <Link to="/" className="auth-split__logo">影视推荐</Link>}
        {children}
      </div>
      <div className="auth-split__brand">
        <div className="auth-split__brand-content">
          <div className="auth-split__icon" aria-hidden />
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

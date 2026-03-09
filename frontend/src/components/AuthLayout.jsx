/**
 * 认证页通用布局：分屏设计（左侧表单 / 右侧品牌区）
 * 参考 Vercel / 现代平台风格
 */
import { Link } from 'react-router-dom';

export default function AuthLayout({
  children,
  sideTitle = '火龙果影院',
  sideDesc = '发现你喜欢的影视',
  sideFeatures = [],
  showLogo = true,
}) {
  return (
    <div className="auth-split">
      <div className="auth-split__form">
        {showLogo && <Link to="/" className="auth-split__logo">火龙果影院</Link>}
        {children}
      </div>
      <div className="auth-split__brand">
        <div className="auth-split__brand-content">
          <img src="/dragon-fruit.png" alt="火龙果" className="auth-split__dragon-fruit" />
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

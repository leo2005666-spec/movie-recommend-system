import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { getAvatarUrl } from '../api/request';
import {
  HouseIcon,
  FilmStripIcon,
  SparkleIcon,
  ChartBarIcon,
  PaperPlaneTiltIcon,
  HeartIcon,
  FileTextIcon,
  GearIcon,
  SignInIcon,
  UserPlusIcon,
  SignOutIcon,
  Moon,
  Sun,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BackgroundFX from './BackgroundFX';
import ApiStatus from './ApiStatus';

const navItems = [
  { to: '/', label: '首页', Icon: HouseIcon },
  { to: '/movies', label: '影视库', Icon: FilmStripIcon },
  { to: '/recommend', label: '个性推荐', Icon: SparkleIcon },
  { to: '/charts', label: '榜单', Icon: ChartBarIcon },
  { to: '/feedback', label: '意见反馈', Icon: PaperPlaneTiltIcon },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const loc = useLocation();
  const [headerAvatarErr, setHeaderAvatarErr] = useState(false);
  /** 向下滚动时收起顶栏，向上滚动时展开，减少遮挡海报/Hero */
  const [headerScrollHidden, setHeaderScrollHidden] = useState(false);
  const lastScrollY = useRef(0);

  /** 影视详情页：全宽内容 + 下方白底区（与 TMDB 一致） */
  const isMovieDetail = /^\/movies\/\d+\/?$/.test(loc.pathname);
  /** 影视库列表：主内容区加宽铺满，贴近 TMDB 热门页 */
  const isMovieList = loc.pathname === '/movies' || loc.pathname === '/movies/';
  /** 首页：TMDB 式全宽趋势/预告片 */
  const isHome = loc.pathname === '/' || loc.pathname === '';
  /** 登录/注册：顶栏仅保留 Logo，主区垂直居中 */
  const isAuthPage = loc.pathname === '/login' || loc.pathname === '/register';

  const isActive = (to) =>
    loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to + '/'));

  useEffect(() => {
    lastScrollY.current = typeof window !== 'undefined' ? window.scrollY : 0;
    setHeaderScrollHidden(false);
  }, [loc.pathname]);

  useEffect(() => {
    setHeaderAvatarErr(false);
  }, [user?.avatar]);

  useEffect(() => {
    const onScroll = () => {
      if (loc.pathname === '/login' || loc.pathname === '/register') return;
      const y = window.scrollY || 0;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;
      if (y < 56) {
        setHeaderScrollHidden(false);
        return;
      }
      if (delta > 8) setHeaderScrollHidden(true);
      else if (delta < -8) setHeaderScrollHidden(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [loc.pathname]);

  return (
    <div className="layout">
      <BackgroundFX />
      <ApiStatus />
      <header
        className={`header${headerScrollHidden ? ' header--scroll-hidden' : ''}${isAuthPage ? ' header--auth-minimal' : ''}`}
      >
        <Link to="/" className="logo">
          影视推荐
        </Link>
        {!isAuthPage && (
        <nav className="nav" aria-label="主导航">
          {navItems.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className={isActive(to) ? 'active' : ''}
            >
              <Icon size={18} weight="regular" className="nav-icon" />
              {label}
            </Link>
          ))}
        </nav>
        )}
        <button
          type="button"
          className="header-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          title={theme === 'dark' ? '浅色' : '深色'}
        >
          {theme === 'dark' ? <Sun size={22} weight="regular" /> : <Moon size={22} weight="regular" />}
        </button>
        {!isAuthPage ? (
        <div className="user-area">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin/dashboard" className="admin-link">
                  <GearIcon size={18} weight="regular" className="nav-icon" />
                  管理
                </Link>
              )}
              <Link to="/profile" className="header-user-link">
                <span className="header-user-avatar" aria-hidden>
                  {user.avatar && !headerAvatarErr ? (
                    <img
                      key={`${user.id}-${user.avatar}`}
                      src={getAvatarUrl(user.avatar)}
                      alt=""
                      className="header-user-avatar__img"
                      referrerPolicy="no-referrer"
                      onError={() => setHeaderAvatarErr(true)}
                    />
                  ) : (
                    <span className="header-user-avatar__fallback">{(user.username || '?')[0].toUpperCase()}</span>
                  )}
                </span>
                <span className="header-user-link__text">
                  {user.username}
                  {isAdmin && <span className="admin-tag">管理员</span>}
                </span>
              </Link>
              <Link to="/favorites">
                <HeartIcon size={18} weight="regular" className="nav-icon" />
                收藏
              </Link>
              <Link to="/logs">
                <FileTextIcon size={18} weight="regular" className="nav-icon" />
                日志
              </Link>
              <button onClick={logout}>
                <SignOutIcon size={18} weight="regular" className="nav-icon" />
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <SignInIcon size={18} weight="regular" className="nav-icon" />
                登录
              </Link>
              <Link to="/register">
                <UserPlusIcon size={18} weight="regular" className="nav-icon" />
                注册
              </Link>
            </>
          )}
        </div>
        ) : null}
      </header>
      <main
        className={`main${isMovieDetail ? ' main--movie-detail' : ''}${isMovieList ? ' main--movie-list' : ''}${isHome ? ' main--home-tmdb' : ''}${isAuthPage ? ' main--auth' : ''}`}
      >
        <Outlet />
      </main>
    </div>
  );
}

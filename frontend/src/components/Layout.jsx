import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  HouseIcon,
  FilmStripIcon,
  SparkleIcon,
  ChartBarIcon,
  ChatCircleIcon,
  PaperPlaneTiltIcon,
  HeartIcon,
  FileTextIcon,
  GearIcon,
  SignInIcon,
  UserPlusIcon,
  SignOutIcon,
  UserIcon,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import BackgroundFX from './BackgroundFX';
import ApiStatus from './ApiStatus';

const navItems = [
  { to: '/', label: '首页', Icon: HouseIcon },
  { to: '/movies', label: '影视库', Icon: FilmStripIcon },
  { to: '/recommend', label: '个性推荐', Icon: SparkleIcon },
  { to: '/charts', label: '榜单', Icon: ChartBarIcon },
  { to: '/qa', label: '问答社区', Icon: ChatCircleIcon },
  { to: '/feedback', label: '意见反馈', Icon: PaperPlaneTiltIcon },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const loc = useLocation();

  const isActive = (to) =>
    loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to + '/'));

  return (
    <div className="layout">
      <BackgroundFX />
      <ApiStatus />
      <header className="header">
        <Link to="/" className="logo">火龙果影院</Link>
        <nav className="nav">
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
        <div className="user-area">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin/movies" className="admin-link">
                  <GearIcon size={18} weight="regular" className="nav-icon" />
                  管理
                </Link>
              )}
              <Link to="/profile">
                <UserIcon size={18} weight="regular" className="nav-icon" />
                {user.nickname || user.username}
                {isAdmin && <span className="admin-tag">管理员</span>}
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
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

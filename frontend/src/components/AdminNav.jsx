import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/admin/movies', label: '影视管理' },
  { to: '/admin/categories', label: '分类管理' },
  { to: '/admin/tags', label: '标签管理' },
  { to: '/admin/users', label: '用户管理' },
  { to: '/admin/ratings', label: '用户评分' },
  { to: '/admin/logs', label: '活动日志' },
  { to: '/admin/feedbacks', label: '用户反馈' },
];

export default function AdminNav() {
  const loc = useLocation();
  return (
    <nav className="admin-nav">
      {links.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className={loc.pathname === to ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link'}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

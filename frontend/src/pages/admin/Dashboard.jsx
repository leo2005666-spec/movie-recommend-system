import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartBarIcon, UsersIcon, FilmStripIcon, StarIcon, ChatCircleIcon, HeartIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
import AdminNav from '../../components/AdminNav';
import { api } from '../../api/request';

/** 数据概览卡片点击后进入的明细页 */
const CARD_HREF = {
  users: '/admin/users',
  movies: '/admin/movies',
  ratings: '/admin/ratings',
  comments: '/admin/explore/comments',
  favorites: '/admin/explore/favorites',
  feedbacks: '/admin/feedbacks',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.message || '加载失败'));
  }, []);

  const cards = data
    ? [
        { key: 'users', label: '注册用户', value: data.users, Icon: UsersIcon, color: '#0ea5e9' },
        { key: 'movies', label: '影视作品', value: data.movies, Icon: FilmStripIcon, color: '#8b5cf6' },
        { key: 'ratings', label: '用户评分条数', value: data.ratings, Icon: StarIcon, color: '#f59e0b' },
        { key: 'comments', label: '评论总数', value: data.comments, Icon: ChatCircleIcon, color: '#10b981' },
        { key: 'favorites', label: '收藏次数', value: data.favorites, Icon: HeartIcon, color: '#ec4899' },
        { key: 'feedbacks', label: '用户反馈', value: data.feedbacks, Icon: PaperPlaneTiltIcon, color: '#64748b' },
      ]
    : [];

  return (
    <div className="admin-page">
      <AdminNav />
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ChartBarIcon size={26} weight="duotone" />
        数据概览
      </h1>
      <p className="empty-hint" style={{ marginBottom: '1.25rem' }}>
        全站核心数据一览，便于答辩与日常运维查看。
      </p>
      {err && <p className="error-msg">{err}</p>}
      {!data && !err && <p className="empty-hint">加载中…</p>}
      {data && (
        <div className="admin-dashboard-grid">
          {cards.map(({ key, label, value, Icon, color }) => {
            const href = CARD_HREF[key];
            const inner = (
              <>
                <div className="admin-dashboard-card__icon" style={{ background: `${color}18`, color }}>
                  <Icon size={28} weight="duotone" />
                </div>
                <div className="admin-dashboard-card__meta">
                  <div className="admin-dashboard-card__value">{value}</div>
                  <div className="admin-dashboard-card__label">{label}</div>
                  <div className="admin-dashboard-card__hint">点击查看明细</div>
                </div>
              </>
            );
            return href ? (
              <Link key={key} to={href} className="admin-dashboard-card admin-dashboard-card--link card">
                {inner}
              </Link>
            ) : (
              <div key={key} className="admin-dashboard-card card">
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

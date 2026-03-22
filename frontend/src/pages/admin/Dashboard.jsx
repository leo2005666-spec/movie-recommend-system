import { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import { api } from '../../api/request';

const STAT_CARDS = [
  { key: 'totalUsers',    emoji: '👤', label: '注册用户总数' },
  { key: 'todayNewUsers', emoji: '🆕', label: '今日新增用户' },
  { key: 'totalMovies',   emoji: '🎬', label: '影视总数' },
  { key: 'totalRatings',  emoji: '⭐', label: '评分总数' },
  { key: 'todayRatings',  emoji: '📊', label: '今日评分' },
  { key: 'totalComments', emoji: '💬', label: '评论总数' },
  { key: 'todayComments', emoji: '🗓️', label: '今日评论' },
  { key: 'totalFavorites',emoji: '❤️', label: '收藏总数' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/admin/stats')
      .then((r) => setStats(r.data || {}))
      .catch(() => setErr('数据加载失败，请刷新重试'));
  }, []);

  return (
    <div>
      <AdminNav />
      <h2 style={{ margin: '1.5rem 0 0.5rem' }}>数据概览</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        系统核心数据一览
      </p>
      {err && <div className="error-msg" style={{ marginBottom: '1rem' }}>{err}</div>}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '1rem',
      }}>
        {STAT_CARDS.map(({ key, emoji, label }) => (
          <div key={key} className="card" style={{ textAlign: 'center', padding: '1.25rem 1rem' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{emoji}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)', lineHeight: 1.1 }}>
              {stats ? (stats[key] ?? 0) : '—'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

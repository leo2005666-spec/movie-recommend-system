import { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import { api } from '../../api/request';

/**
 * 管理员：用户评分数据
 * 普通用户的电影评分会汇总到此，用于驱动个性化推荐
 */
export default function AdminRatings() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setErr('');
    api.get('/admin/ratings')
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch((e) => setErr(e.message || '加载失败（请确认已用管理员账号登录）'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <AdminNav />
      <h2 style={{ marginBottom: '1rem' }}>用户评分数据</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        普通用户的电影评分会汇总到此，系统根据这些评分在推荐页面为每位用户推荐其可能感兴趣的电影。请使用管理员账号登录后查看。
      </p>
      <button type="button" onClick={load} className="btn btn-outline" style={{ marginBottom: '1rem' }} disabled={loading}>
        {loading ? '加载中...' : '刷新'}
      </button>
      {err && <div className="error-msg" style={{ marginBottom: '1rem' }}>{err}</div>}
      {loading ? (
        <p className="empty-hint">加载中...</p>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>用户</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>电影</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>评分</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>评分时间</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>{r.id}</td>
                  <td style={{ padding: '0.75rem' }}>{r.username || '-'} (ID:{r.user_id})</td>
                  <td style={{ padding: '0.75rem' }}>{r.movie_title || '-'} (ID:{r.movie_id})</td>
                  <td style={{ padding: '0.75rem' }}>{r.score} 分</td>
                  <td style={{ padding: '0.75rem' }}>{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className="empty-hint" style={{ padding: '1.5rem' }}>暂无评分数据，用户对电影评分后会自动显示</p>
          )}
        </div>
      )}
    </div>
  );
}

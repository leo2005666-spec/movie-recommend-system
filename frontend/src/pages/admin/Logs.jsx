import { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import Pagination from '../../components/Pagination';
import { api } from '../../api/request';

export default function AdminLogs() {
  const [data, setData] = useState({ list: [], total: 0 });
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);

  const load = () => {
    const params = { page, limit: 30 };
    if (userId) params.userId = userId;
    api.get('/logs', params)
      .then((r) => setData({ list: r.data?.list || [], total: r.data?.total || 0 }))
      .catch(() => setData({ list: [], total: 0 }));
  };

  useEffect(() => {
    load();
    api.get('/users').then((r) => setUsers(r.data || [])).catch(() => {});
  }, [page, userId]);

  const totalPages = Math.ceil(data.total / 30) || 1;

  return (
    <div>
      <AdminNav />
      <h2 style={{ marginBottom: '1rem' }}>活动日志</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }}>
          <option value="">全部用户</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>
        <button onClick={() => load()} className="btn btn-outline">刷新</button>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>时间</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>用户</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>操作</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>目标</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>详情</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {data.list.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem' }}>{l.created_at}</td>
                <td style={{ padding: '0.75rem' }}>{l.username || l.user_id || '-'}</td>
                <td style={{ padding: '0.75rem' }}>{l.action}</td>
                <td style={{ padding: '0.75rem' }}>{l.target_type} {l.target_id}</td>
                <td style={{ padding: '0.75rem', maxWidth: 200 }}>{l.detail || '-'}</td>
                <td style={{ padding: '0.75rem' }}>{l.ip || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

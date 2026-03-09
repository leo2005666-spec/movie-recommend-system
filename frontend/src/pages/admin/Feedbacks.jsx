import { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import { api } from '../../api/request';

export default function AdminFeedbacks() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/feedbacks').then((r) => setList(r.data || [])).catch(() => setList([]));
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/feedbacks/${id}`, { status });
      setList((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    } catch (e) {
      setErr(e.message);
    }
  };

  const statusMap = { pending: '待处理', processed: '已处理', rejected: '已拒绝' };

  return (
    <div>
      <AdminNav />
      <h2 style={{ marginBottom: '1rem' }}>用户反馈</h2>
      {err && <div className="error-msg" style={{ marginBottom: '1rem' }}>{err}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {list.map((f) => (
          <div key={f.id} className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{f.username || '匿名'} · {f.type || 'general'} · {f.created_at}</span>
              <span>{statusMap[f.status] || f.status}</span>
            </div>
            <p style={{ marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>{f.content}</p>
            <div>
              {['pending', 'processed', 'rejected'].map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(f.id, s)}
                  className="btn btn-outline"
                  style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', fontSize: 12, opacity: f.status === s ? 1 : 0.6 }}
                >
                  {statusMap[s]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && <p style={{ color: 'var(--text-muted)' }}>暂无反馈</p>}
    </div>
  );
}

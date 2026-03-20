import { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import { api } from '../../api/request';

export default function AdminFeedbacks() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const loadList = () => {
    setLoading(true);
    setErr('');
    api
      .get('/feedbacks')
      .then((r) => setList(r.data || []))
      .catch((e) => {
        setErr(e.message || '加载失败');
        setList([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/feedbacks/${id}`, { status });
      setList((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    } catch (e) {
      setErr(e.message);
    }
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('确定删除这条反馈？删除后无法恢复。')) return;
    setErr('');
    try {
      await api.delete(`/feedbacks/${id}`);
      setList((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      setErr(e.message || '删除失败');
    }
  };

  const statusMap = { pending: '待处理', processed: '已处理', rejected: '已拒绝' };

  const displayUser = (f) => {
    if (!f.user_id) return '匿名';
    const nick = f.nickname?.trim();
    const name = f.username || '';
    return nick ? `${nick}（${name}）` : name || '用户';
  };

  return (
    <div>
      <AdminNav />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>用户反馈</h2>
        <button type="button" className="btn btn-outline" onClick={loadList} disabled={loading}>
          {loading ? '加载中…' : '刷新列表'}
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          可随时刷新重复查看全部历史；删除后从列表移除。
        </span>
      </div>
      {err && <div className="error-msg" style={{ marginBottom: '1rem' }}>{err}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {list.map((f) => (
          <div key={f.id} className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{displayUser(f)} · {f.type || 'general'} · {f.created_at}</span>
              <span>{statusMap[f.status] || f.status}</span>
            </div>
            <p style={{ marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>{f.content}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
              {['pending', 'processed', 'rejected'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateStatus(f.id, s)}
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.5rem', fontSize: 12, opacity: f.status === s ? 1 : 0.6 }}
                >
                  {statusMap[s]}
                </button>
              ))}
              <button type="button" className="btn" style={{ padding: '0.25rem 0.65rem', fontSize: 12, marginLeft: 'auto' }} onClick={() => deleteFeedback(f.id)}>
                删除反馈
              </button>
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && <p style={{ color: 'var(--text-muted)' }}>暂无反馈</p>}
    </div>
  );
}

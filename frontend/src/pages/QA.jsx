import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatCircleIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { api } from '../api/request';

export default function QA() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/qa', { page, limit: 20 })
      .then((r) => {
        setList(r.data?.list || []);
        setTotal(r.data?.total || 0);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!user) return setErr('请先登录');
    if (!title.trim() || !content.trim()) return setErr('请填写标题和内容');
    if (title.trim().length < 2) return setErr('标题至少 2 个字');
    if (content.trim().length < 5) return setErr('内容至少 5 个字');
    setSubmitting(true);
    try {
      await api.post('/qa', { title: title.trim(), content: content.trim() });
      setTitle('');
      setContent('');
      setShowForm(false);
      load();
    } catch (e) {
      setErr(e.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">
        <ChatCircleIcon size={24} weight="regular" className="page-title__icon" />
        问答社区
      </h1>
      <p className="empty-hint" style={{ marginBottom: 'var(--space-md)' }}>
        咨询系统使用、推荐效果等方面的问题
      </p>
      {user && (
        <button onClick={() => setShowForm(!showForm)} className="btn" style={{ marginBottom: 'var(--space-md)' }}>
          {showForm ? '取消' : '我要提问'}
        </button>
      )}
      {showForm && user && (
        <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-md)' }}>
          <div className="form-group">
            <label>问题标题</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="简要描述问题" required />
          </div>
          <div className="form-group">
            <label>问题内容</label>
            <textarea className="form-input form-textarea" value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="详细描述" required />
          </div>
          {err && <div className="error-msg">{err}</div>}
          <button type="submit" className="btn" disabled={submitting}>{submitting ? '提交中...' : '提交'}</button>
        </form>
      )}

      {loading ? <p className="empty-hint">加载中...</p> : list.length ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {list.map((q) => (
              <Link key={q.id} to={`/qa/${q.id}`} className="card" style={{ padding: '1rem', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong>{q.title}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{q.answer_count || 0} 回答</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{q.content?.slice(0, 100)}...</p>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {q.username} · {q.created_at}
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / 20) || 1} onPageChange={setPage} />
        </>
      ) : (
        <p className="empty-hint">暂无问题，{user ? '快来提问吧' : '登录后可提问'}</p>
      )}
    </div>
  );
}

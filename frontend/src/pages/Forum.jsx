import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatCircleDotsIcon } from '@phosphor-icons/react';
import { api } from '../api/request';
import { useAuth } from '../context/AuthContext';

export default function Forum() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/forum/threads', { page: 1, limit: 20, sort: 'latest' })
      .then((r) => setList(r?.data?.list || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const postThread = async (e) => {
    e.preventDefault();
    if (!user) return;
    setErr('');
    const t = title.trim();
    const c = content.trim();
    if (t.length < 2) return setErr('标题至少 2 个字');
    if (c.length < 1) return setErr('内容不能为空');
    setBusy(true);
    try {
      await api.post('/forum/threads', { title: t, content: c });
      setTitle('');
      setContent('');
      load();
    } catch (e2) {
      setErr(e2.message || '发帖失败');
    } finally {
      setBusy(false);
    }
  };

  const seed = async () => {
    if (!isAdmin) return;
    setBusy(true);
    setErr('');
    try {
      await api.post('/forum/seed', { threads: 14, maxReplies: 10 });
      load();
    } catch (e2) {
      setErr(e2.message || '生成失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="forum-page">
      <h1 className="page-title">
        <ChatCircleDotsIcon size={24} weight="regular" className="page-title__icon" />
        讨论论坛
      </h1>

      {isAdmin && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={seed}>
            生成一批虚拟讨论
          </button>
        </div>
      )}

      {user ? (
        <form onSubmit={postThread} className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              placeholder="标题（2-80字）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              style={{ flex: '1 1 260px' }}
            />
            <button type="submit" className="btn" disabled={busy}>
              发布
            </button>
          </div>
          <textarea
            className="form-textarea form-input"
            placeholder="说点什么…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={4000}
            style={{ marginTop: '0.6rem' }}
          />
          {err ? <div className="error-msg" style={{ marginTop: '0.5rem' }}>{err}</div> : null}
        </form>
      ) : (
        <p className="empty-hint" style={{ marginBottom: 'var(--space-lg)' }}>
          <Link to="/login">登录</Link>后可以发帖交流
        </p>
      )}

      {loading ? (
        <p className="empty-hint">加载中…</p>
      ) : list.length ? (
        <div className="forum-thread-list">
          {list.map((t) => (
            <Link key={t.id} to={`/forum/${t.id}`} className="forum-thread-card card">
              <div className="forum-thread-card__title">{t.title}</div>
              <div className="forum-thread-card__meta">
                {t.username} · {t.created_at} · {t.reply_cnt ?? 0} 回复
              </div>
              <div className="forum-thread-card__excerpt">
                {String(t.content || '').slice(0, 110)}
                {String(t.content || '').length > 110 ? '…' : ''}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty-hint">暂无讨论</p>
      )}
    </div>
  );
}


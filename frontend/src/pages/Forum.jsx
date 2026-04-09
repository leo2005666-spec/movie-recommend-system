import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChatCircleDotsIcon } from '@phosphor-icons/react';
import { api } from '../api/request';
import { useAuth } from '../context/AuthContext';

export default function Forum() {
  const { user, isAdmin } = useAuth();
  const [sp, setSp] = useSearchParams();
  const topic = (sp.get('topic') || '').trim();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [topics, setTopics] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/forum/threads', { page: 1, limit: 20, sort: 'latest', topic: topic || undefined })
      .then((r) => setList(r?.data?.list || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/forum/topics').then((r) => setTopics(Array.isArray(r?.data) ? r.data : [])).catch(() => setTopics([]));
  }, []);

  useEffect(() => {
    load();
  }, [topic]);

  const topicMeta = useMemo(() => topics.find((t) => t.key === topic) || null, [topics, topic]);

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
      await api.post('/forum/threads', { topic: topic || undefined, title: t, content: c });
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

      {topics.length > 0 && (
        <section className="forum-topics">
          <div className="forum-topics__grid">
            {topics.map((tp) => (
              <button
                key={tp.key}
                type="button"
                className={`forum-topic-tile ${topic === tp.key ? 'active' : ''}`}
                onClick={() => {
                  const next = new URLSearchParams(sp);
                  next.set('topic', tp.key);
                  setSp(next);
                }}
              >
                <div className="forum-topic-tile__label">{tp.label}</div>
                <div className="forum-topic-tile__desc">{tp.desc}</div>
                <div className="forum-topic-tile__meta">{tp.thread_cnt ?? 0} 讨论</div>
              </button>
            ))}
          </div>
          <div className="forum-topics__bar">
            <span className="forum-topics__current">
              当前话题：<b>{topicMeta?.label || (topic ? topic : '全部')}</b>
            </span>
            <button
              type="button"
              className="forum-topics__clear"
              onClick={() => {
                const next = new URLSearchParams(sp);
                next.delete('topic');
                setSp(next);
              }}
            >
              清除话题筛选
            </button>
            {isAdmin && (
              <button type="button" className="btn btn-outline forum-admin-seed" disabled={busy} onClick={seed}>
                生成虚拟讨论
              </button>
            )}
          </div>
        </section>
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
        <div className="forum-feed">
          {list.map((t) => (
            <Link key={t.id} to={`/forum/${t.id}`} className="forum-feed__item card">
              <div className="forum-feed__title">{t.title}</div>
              <div className="forum-feed__excerpt">
                {String(t.content || '').slice(0, 160)}{String(t.content || '').length > 160 ? '…' : ''}
              </div>
              <div className="forum-feed__meta">
                {t.username} · {t.created_at} · {t.reply_cnt ?? 0} 回复
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


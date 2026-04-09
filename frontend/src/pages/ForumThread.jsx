import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/request';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';

function buildReplyTree(replies) {
  const byId = new Map();
  const children = new Map();
  for (const r of replies) {
    byId.set(r.id, { ...r, children: [] });
    children.set(r.id, []);
  }
  const roots = [];
  for (const r of replies) {
    const node = byId.get(r.id);
    if (!node) continue;
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function ReplyNode({ node, onReply }) {
  return (
    <div className="forum-reply">
      <div className="forum-reply__av">
        <UserAvatar
          userId={node.user_id}
          username={node.username}
          avatar={node.avatar}
          avatarStyle={node.avatar_style}
          size={34}
        />
      </div>
      <div className="forum-reply__body">
        <div className="forum-reply__head">
          <span className="forum-reply__name">{node.username}</span>
          <span className="forum-reply__time">{node.created_at}</span>
          <button type="button" className="forum-reply__btn" onClick={() => onReply(node)}>
            回复
          </button>
        </div>
        <div className="forum-reply__text">{node.content}</div>
        {node.children?.length > 0 && (
          <div className="forum-reply__children">
            {node.children.map((c) => (
              <ReplyNode key={c.id} node={c} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForumThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [err, setErr] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const load = () => {
    setLoading(true);
    setErr('');
    api.get(`/forum/threads/${id}`)
      .then((r) => {
        setThread(r?.data?.thread || null);
        setReplies(r?.data?.replies || []);
      })
      .catch((e) => setErr(e.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const tree = useMemo(() => buildReplyTree(Array.isArray(replies) ? replies : []), [replies]);

  const send = async (e) => {
    e.preventDefault();
    if (!user) return;
    const c = content.trim();
    if (!c) return;
    setBusy(true);
    setErr('');
    try {
      await api.post(`/forum/threads/${id}/replies`, { content: c, parentId: replyTo?.id || null });
      setContent('');
      setReplyTo(null);
      load();
    } catch (e2) {
      setErr(e2.message || '回复失败');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="empty-hint">加载中…</p>;
  if (err || !thread) {
    return (
      <div className="page-container" style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
        <p className="error-msg">{err || '帖子不存在'}</p>
        <Link to="/forum" className="btn btn-outline">返回论坛</Link>
      </div>
    );
  }

  return (
    <div className="forum-thread-page">
      <Link to="/forum" className="btn btn-outline" style={{ marginBottom: 'var(--space-md)' }}>
        ← 返回论坛
      </Link>
      <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        {thread.topic_display ? (
          <div className="forum-thread__topic" style={{ color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            话题：{thread.topic_label ? `${thread.topic_label} · ` : ''}{thread.topic_display}
          </div>
        ) : null}
        <h1 style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>{thread.title}</h1>
        <div className="empty-hint" style={{ marginBottom: '0.75rem' }}>
          {thread.username} · {thread.created_at}
        </div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{thread.content}</div>
      </div>

      <h2 className="section-title">回复</h2>

      {user ? (
        <form onSubmit={send} className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          {replyTo ? (
            <div className="forum-replyto">
              回复 <b>{replyTo.username}</b>
              <button type="button" className="forum-replyto__cancel" onClick={() => setReplyTo(null)}>
                取消
              </button>
            </div>
          ) : null}
          <textarea
            className="form-textarea form-input"
            placeholder="写下你的回复…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={2000}
          />
          <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? '发送中…' : '发送回复'}
            </button>
          </div>
          {err ? <div className="error-msg" style={{ marginTop: '0.5rem' }}>{err}</div> : null}
        </form>
      ) : (
        <p className="empty-hint" style={{ marginBottom: 'var(--space-md)' }}>
          <Link to="/login">登录</Link>后可以回复
        </p>
      )}

      {tree.length ? (
        <div className="forum-replies">
          {tree.map((n) => (
            <ReplyNode key={n.id} node={n} onReply={setReplyTo} />
          ))}
        </div>
      ) : (
        <p className="empty-hint">还没有回复，来抢沙发</p>
      )}
    </div>
  );
}


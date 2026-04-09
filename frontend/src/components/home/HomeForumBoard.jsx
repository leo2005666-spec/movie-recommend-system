import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatCircleDotsIcon } from '@phosphor-icons/react';
import { api } from '../../api/request';

export default function HomeForumBoard() {
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/forum/threads', { page: 1, limit: 6, sort: 'latest' })
      .then((r) => {
        if (!cancelled) setThreads(r?.data?.list || []);
      })
      .catch(() => {
        if (!cancelled) setThreads([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="home-forum-board">
      <div className="home-forum-board__head">
        <h2 className="home-forum-board__title">
          <ChatCircleDotsIcon size={20} weight="regular" style={{ verticalAlign: 'middle', marginRight: 8 }} />
          讨论论坛
        </h2>
        <Link to="/forum" className="home-forum-board__more">进入论坛 →</Link>
      </div>
      {loading ? (
        <p className="empty-hint">加载中…</p>
      ) : threads.length ? (
        <div className="home-forum-board__grid">
          {threads.map((t) => (
            <Link key={t.id} to={`/forum/${t.id}`} className="home-forum-card card">
              <div className="home-forum-card__title">{t.title}</div>
              <div className="home-forum-card__meta">
                {t.username} · {t.reply_cnt ?? 0} 回复
              </div>
              <div className="home-forum-card__excerpt">
                {String(t.content || '').slice(0, 70)}{String(t.content || '').length > 70 ? '…' : ''}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty-hint">还没有讨论，去论坛发第一帖吧</p>
      )}
    </section>
  );
}


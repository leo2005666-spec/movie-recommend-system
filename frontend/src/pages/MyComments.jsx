import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatCircleDotsIcon, ArrowLeftIcon } from '@phosphor-icons/react';
import { api } from '../api/request';

/**
 * 个人中心 · 我的影评：发表过的评论全文
 */
export default function MyComments() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const load = () => {
    setLoading(true);
    setErr('');
    api
      .get('/users/me/comments', { page, limit })
      .then((r) => {
        const d = r.data || {};
        setList(Array.isArray(d.list) ? d.list : []);
        setTotal(typeof d.total === 'number' ? d.total : 0);
      })
      .catch((e) => setErr(e.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="form-page profile-page profile-page--wide my-activity-page">
      <p className="my-activity-page__back">
        <Link to="/profile" className="my-activity-page__back-link">
          <ArrowLeftIcon size={18} weight="bold" />
          返回个人信息
        </Link>
      </p>
      <h1 className="page-title">
        <ChatCircleDotsIcon size={24} weight="regular" className="page-title__icon" />
        我的影评
      </h1>
      <p className="empty-hint my-activity-page__desc">你在各影片下发表的评论，可进入影片页继续互动。</p>
      {err && <p className="error-msg">{err}</p>}
      {loading && <p className="empty-hint">加载中…</p>}
      {!loading && !err && list.length === 0 && (
        <p className="empty-hint">暂无影评，去 <Link to="/movies">影视库</Link> 选片评论吧。</p>
      )}
      {!loading && list.length > 0 && (
        <>
          <ul className="my-comments-list">
            {list.map((row) => (
              <li key={row.id} className="my-comments-card card">
                <div className="my-comments-card__head">
                  <Link to={`/movies/${row.movie_id}`} className="my-comments-card__movie">
                    {row.title}
                  </Link>
                  <span className="my-comments-card__date">{row.created_at}</span>
                </div>
                <p className="my-comments-card__content">{row.content}</p>
                <Link to={`/movies/${row.movie_id}`} className="my-comments-card__goto">
                  查看影片页 →
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="my-comments-pager">
              <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                上一页
              </button>
              <span>
                第 {page} / {totalPages} 页（共 {total} 条）
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

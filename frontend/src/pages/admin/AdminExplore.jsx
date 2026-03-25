import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import AdminNav from '../../components/AdminNav';
import { api } from '../../api/request';
import UserAvatar from '../../components/UserAvatar';

/**
 * 管理端：从数据概览下钻 — 全站评论明细 / 全站收藏明细
 * 路由：/admin/explore/comments | /admin/explore/favorites
 */
export default function AdminExplore() {
  const { type } = useParams();
  const isComments = type === 'comments';
  const isFavorites = type === 'favorites';
  const title = isComments ? '全站评论明细' : isFavorites ? '全站收藏明细' : '数据明细';
  const apiPath = isComments ? '/admin/explore/comments' : '/admin/explore/favorites';

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isComments && !isFavorites) {
      setErr('未知类型');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr('');
    api
      .get(apiPath, { page, limit })
      .then((r) => {
        const d = r.data || {};
        setList(Array.isArray(d.list) ? d.list : []);
        setTotal(typeof d.total === 'number' ? d.total : 0);
      })
      .catch((e) => setErr(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [apiPath, page, limit, isComments, isFavorites]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!isComments && !isFavorites) {
    return (
      <div className="admin-page">
        <AdminNav />
        <p className="error-msg">页面不存在</p>
        <Link to="/admin/dashboard">返回数据概览</Link>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <AdminNav />
      <p style={{ marginBottom: '1rem' }}>
        <Link to="/admin/dashboard" className="admin-explore-back">
          <ArrowLeftIcon size={18} weight="bold" style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          返回数据概览
        </Link>
      </p>
      <h2 style={{ marginBottom: '0.5rem' }}>{title}</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        {isComments
          ? '展示全站用户对影片发表的评论内容。'
          : '展示每位用户收藏了哪部影片（谁收藏了什么）。'}
      </p>
      {err && <div className="error-msg" style={{ marginBottom: '1rem' }}>{err}</div>}
      {loading ? (
        <p className="empty-hint">加载中…</p>
      ) : (
        <>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="admin-explore-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户</th>
                  <th>影片</th>
                  {isComments ? <th>评论内容</th> : null}
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>
                      <div className="admin-explore-user-cell">
                        <UserAvatar
                          userId={row.user_id}
                          username={row.username}
                          nickname={row.nickname}
                          avatar={row.avatar}
                          avatarStyle={row.avatar_style}
                          size={36}
                        />
                        <span>
                          {row.nickname || row.username || '—'}{' '}
                          <span className="admin-explore-id">(用户ID {row.user_id})</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      {row.movie_title || '—'} <span className="admin-explore-id">(影片ID {row.movie_id})</span>
                    </td>
                    {isComments ? (
                      <td className="admin-explore-content">{row.content || '—'}</td>
                    ) : null}
                    <td>{row.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && (
              <p className="empty-hint" style={{ padding: '1.5rem' }}>
                暂无数据
              </p>
            )}
          </div>
          {total > 0 && (
            <div className="admin-explore-pager">
              <button
                type="button"
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </button>
              <span className="admin-explore-pager__info">
                第 {page} / {totalPages} 页，共 {total} 条
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

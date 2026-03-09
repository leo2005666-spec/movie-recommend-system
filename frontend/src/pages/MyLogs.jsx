import { useEffect, useState } from 'react';
import { FileTextIcon } from '@phosphor-icons/react';
import { api } from '../api/request';

export default function MyLogs() {
  const [data, setData] = useState({ list: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);

  const load = (p = 1) => {
    setLoading(true);
    api.get('/logs/me', { page: p, limit: 20 })
      .then((r) => setData({ list: r.data?.list || [], total: r.data?.total || 0, page: r.data?.page || 1 }))
      .catch(() => setData({ list: [], total: 0, page: 1 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totalPages = Math.ceil(data.total / 20) || 1;

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: '1rem' }}>
        <FileTextIcon size={24} weight="regular" className="page-title__icon" />
        我的活动日志
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        记录你的登录、评分、收藏、评论等操作，便于追溯
      </p>
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>加载中...</p>
      ) : data.list.length ? (
        <>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>时间</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>操作</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>目标</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>详情</th>
                </tr>
              </thead>
              <tbody>
                {data.list.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem' }}>{l.created_at}</td>
                    <td style={{ padding: '0.75rem' }}>{l.action}</td>
                    <td style={{ padding: '0.75rem' }}>{l.target_type} {l.target_id}</td>
                    <td style={{ padding: '0.75rem', maxWidth: 200 }}>{l.detail || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button className="btn btn-outline" disabled={data.page <= 1} onClick={() => load(data.page - 1)}>上一页</button>
            <span style={{ alignSelf: 'center' }}>{data.page} / {totalPages}</span>
            <button className="btn btn-outline" disabled={data.page >= totalPages} onClick={() => load(data.page + 1)}>下一页</button>
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>暂无活动记录</p>
      )}
    </div>
  );
}

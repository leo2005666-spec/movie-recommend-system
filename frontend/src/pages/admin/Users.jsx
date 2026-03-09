import { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import { api } from '../../api/request';
import { useAuth } from '../../context/AuthContext';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');

  const load = () => api.get('/users').then((r) => setList(r.data || [])).catch(() => setList([]));

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('确定删除该用户？')) return;
    try {
      await api.delete(`/users/${id}`);
      setList((prev) => prev.filter((u) => u.id !== id));
      setErr('');
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleChangeRole = async (id, newRole) => {
    if (!confirm(`确定将该用户改为${newRole === 'admin' ? '管理员' : '普通用户'}？`)) return;
    try {
      await api.patch(`/users/${id}/role`, { role: newRole });
      setList((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
      setErr('');
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <AdminNav />
      <h2 style={{ marginBottom: '1rem' }}>用户管理</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        管理员可删除用户、修改用户角色。普通用户仅能浏览和操作自己的内容。
      </p>
      {err && <div className="error-msg" style={{ marginBottom: '1rem' }}>{err}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>用户名</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>昵称</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>角色</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>注册时间</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem' }}>{u.id}</td>
                <td style={{ padding: '0.75rem' }}>{u.username}</td>
                <td style={{ padding: '0.75rem' }}>{u.nickname || '-'}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{
                    padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: 12,
                    background: u.role === 'admin' ? 'rgba(245, 158, 11, 0.2)' : 'var(--border)',
                    color: u.role === 'admin' ? '#f59e0b' : 'var(--text-muted)',
                  }}>
                    {u.role === 'admin' ? '管理员' : '普通用户'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>{u.created_at}</td>
                <td style={{ padding: '0.75rem' }}>
                  {u.id !== currentUser?.id && (
                    <>
                      <button
                        onClick={() => handleChangeRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem', fontSize: 12, marginRight: '0.5rem' }}
                      >
                        {u.role === 'admin' ? '降为普通用户' : '设为管理员'}
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem', fontSize: 12, color: 'var(--accent)' }}
                      >
                        删除
                      </button>
                    </>
                  )}
                  {u.id === currentUser?.id && (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>当前登录</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

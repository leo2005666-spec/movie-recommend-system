import { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import { api } from '../../api/request';

export default function AdminTags() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  const load = () => api.get('/tags').then((r) => setList(r.data || [])).catch(() => setList([]));

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setErr('');
    if (!name.trim()) return setErr('请输入标签名');
    try {
      await api.post('/tags', { name: name.trim() });
      setName('');
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return;
    try {
      await api.delete(`/tags/${id}`);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <AdminNav />
      <h2 style={{ marginBottom: '1rem' }}>标签管理</h2>
      <form onSubmit={handleAdd} className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>标签名</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: 150 }} />
        </div>
        <button type="submit" className="btn">新增</button>
        {err && <span className="error-msg">{err}</span>}
      </form>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {list.map((t) => (
          <div key={t.id} className="card" style={{ padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{t.name}</span>
            <button onClick={() => handleDelete(t.id)} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: 12, color: 'var(--accent)' }}>删除</button>
          </div>
        ))}
      </div>
    </div>
  );
}

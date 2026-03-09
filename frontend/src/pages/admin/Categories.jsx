import { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import { api } from '../../api/request';

export default function AdminCategories() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get('/categories').then((r) => setList(r.data || [])).catch(() => setList([]));

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setErr('');
    if (!name.trim()) return setErr('请输入分类名');
    try {
      await api.post('/categories', { name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editing || !name.trim()) return;
    try {
      await api.put(`/categories/${editing.id}`, { name: name.trim(), description: description.trim() });
      setEditing(null);
      setName('');
      setDescription('');
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return;
    try {
      await api.delete(`/categories/${id}`);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <AdminNav />
      <h2 style={{ marginBottom: '1rem' }}>分类管理</h2>
      <form onSubmit={editing ? handleUpdate : handleAdd} className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>分类名</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: 150 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>描述</label>
            <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: 200 }} />
          </div>
          <button type="submit" className="btn">{editing ? '更新' : '新增'}</button>
          {editing && <button type="button" className="btn btn-outline" onClick={() => { setEditing(null); setName(''); setDescription(''); }}>取消</button>}
        </div>
        {err && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{err}</div>}
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {list.map((c) => (
          <div key={c.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{c.name}</strong>
              {c.description && <span className="empty-hint" style={{ marginLeft: 'var(--space-sm)' }}>{c.description}</span>}
            </div>
            <div>
              <button onClick={() => { setEditing(c); setName(c.name); setDescription(c.description || ''); }} className="btn btn-outline">编辑</button>
              <button onClick={() => handleDelete(c.id)} className="btn btn-outline" style={{ marginLeft: '0.5rem', color: 'var(--accent)' }}>删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

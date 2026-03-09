import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { api } from '../../api/request';

export default function AdminMovies() {
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', cover: '', description: '', release_year: '', director: '', actors: '', duration: '', categoryIds: [], tagIds: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = () => {
    api.get('/movies', { limit: 500 }).then((r) => setList(r.data?.list || [])).catch(() => setList([]));
  };

  useEffect(() => {
    load();
    api.get('/categories').then((r) => setCategories(r.data || [])).catch(() => {});
    api.get('/tags').then((r) => setTags(r.data || [])).catch(() => {});
    setLoading(false);
  }, []);

  const resetForm = () => {
    setForm({ title: '', cover: '', description: '', release_year: '', director: '', actors: '', duration: '', categoryIds: [], tagIds: [] });
    setEditing(null);
  };

  const openEdit = (m) => {
    setEditing(m.id);
    setForm({
      title: m.title,
      cover: m.cover || '',
      description: m.description || '',
      release_year: m.release_year || '',
      director: m.director || '',
      actors: m.actors || '',
      duration: m.duration || '',
      categoryIds: m.categories?.map((c) => c.id) || [],
      tagIds: m.tags?.map((t) => t.id) || [],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.title.trim()) return setErr('请输入标题');
    try {
      if (editing) {
        await api.put(`/movies/${editing}`, form);
      } else {
        await api.post('/movies', form);
      }
      resetForm();
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return;
    try {
      await api.delete(`/movies/${id}`);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const toggleCategory = (id) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((x) => x !== id) : [...f.categoryIds, id],
    }));
  };
  const toggleTag = (id) => {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter((x) => x !== id) : [...f.tagIds, id],
    }));
  };

  return (
    <div>
      <AdminNav />
      <h2 style={{ marginBottom: '1rem' }}>影视作品管理</h2>
      <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label>标题 *</label>
            <input className="form-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>封面URL</label>
            <input className="form-input" value={form.cover} onChange={(e) => setForm((f) => ({ ...f, cover: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>导演</label>
            <input className="form-input" value={form.director} onChange={(e) => setForm((f) => ({ ...f, director: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>上映年份</label>
            <input className="form-input" type="number" value={form.release_year} onChange={(e) => setForm((f) => ({ ...f, release_year: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>主演</label>
            <input className="form-input" value={form.actors} onChange={(e) => setForm((f) => ({ ...f, actors: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>片长(分钟)</label>
            <input className="form-input" type="number" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>简介</label>
          <textarea className="form-input form-textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
        </div>
        <div className="form-group">
          <label>分类</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map((c) => (
              <label key={c.id} style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>标签</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {tags.map((t) => (
              <label key={t.id} style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={form.tagIds.includes(t.id)} onChange={() => toggleTag(t.id)} />
                {t.name}
              </label>
            ))}
          </div>
        </div>
        {err && <div className="error-msg">{err}</div>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn">{editing ? '更新' : '新增'}</button>
          {editing && <button type="button" className="btn btn-outline" onClick={resetForm}>取消</button>}
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {list.map((m) => (
          <div key={m.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src={m.cover && m.id ? `/api/movies/${m.id}/cover` : ''} alt="" style={{ width: 60, height: 90, objectFit: 'cover', background: 'var(--border)' }} onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90" fill="%232a2a35"><rect width="60" height="90"/><text x="30" y="45" dominant-baseline="middle" text-anchor="middle" fill="%238a8a9a" font-size="10">暂无</text></svg>'; }} />
            <div style={{ flex: 1 }}>
              <Link to={`/movies/${m.id}`}>{m.title}</Link>
              <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                {m.categories?.map((c) => c.name).join(' / ')} {m.release_year}
              </span>
            </div>
            <button onClick={() => openEdit(m)} className="btn btn-outline">编辑</button>
            <button onClick={() => handleDelete(m.id)} className="btn btn-outline" style={{ color: 'var(--accent)' }}>删除</button>
          </div>
        ))}
      </div>
      {list.length === 0 && !loading && <p className="empty-hint">暂无影视作品</p>}
    </div>
  );
}

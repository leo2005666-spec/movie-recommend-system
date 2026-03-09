import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilmStripIcon } from '@phosphor-icons/react';
import MovieCard from '../components/MovieCard';
import { api } from '../api/request';

export default function MovieList() {
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [tastes, setTastes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [tagId, setTagId] = useState('');
  const [tasteType, setTasteType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (categoryId) params.categoryId = categoryId;
    if (tagId) params.tagId = tagId;
    if (tasteType) params.tasteType = tasteType;
    if (keyword) params.keyword = keyword;
    api.get('/movies', params)
      .then((r) => {
        setList(r.data.list || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data || [])).catch(() => {});
    api.get('/tags').then((r) => setTags(r.data || [])).catch(() => {});
    api.get('/recommend/tastes').then((r) => setTastes(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [page, categoryId, tagId, tasteType]);

  const search = () => {
    setPage(1);
    load();
  };

  const totalPages = Math.ceil(total / 12) || 1;

  const clearTaste = () => { setTasteType(''); setPage(1); };
  const setTaste = (key) => { setTasteType(key); setPage(1); };

  return (
    <div>
      <h1 className="page-title">
        <FilmStripIcon size={24} weight="regular" className="page-title__icon" />
        影视库
      </h1>
      {tastes.length > 0 && (
        <div className="taste-chips">
          <button
            type="button"
            className={`taste-chip ${!tasteType ? 'active' : ''}`}
            onClick={clearTaste}
          >
            全部
          </button>
          {tastes.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`taste-chip ${tasteType === t.key ? 'active' : ''}`}
              onClick={() => setTaste(t.key)}
              title={t.desc}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="search-bar">
        <input
          className="form-input"
          placeholder="搜索标题、导演..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          style={{ width: 220 }}
        />
        <select
          className="form-select"
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
        >
          <option value="">全部分类</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={tagId}
          onChange={(e) => { setTagId(e.target.value); setPage(1); }}
        >
          <option value="">全部标签</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button onClick={search} className="btn" disabled={loading}>搜索</button>
      </div>

      {loading ? (
        <div className="movie-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton-card movie-card" style={{ pointerEvents: 'none' }}>
              <div className="skeleton skeleton-cover" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-meta" />
            </div>
          ))}
        </div>
      ) : list.length ? (
        <>
          <div className="movie-grid">
            {list.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
          <div className="pagination">
            <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
            <span>{page} / {totalPages}</span>
            <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</button>
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>暂无影视作品</p>
      )}
    </div>
  );
}

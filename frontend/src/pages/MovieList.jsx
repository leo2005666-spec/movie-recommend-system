import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilmStripIcon, CaretDown, CaretUp } from '@phosphor-icons/react';
import MovieCard from '../components/MovieCard';
import { api } from '../api/request';
import { useAuth } from '../context/AuthContext';

export default function MovieList() {
  const { user } = useAuth();
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
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [watched, setWatched] = useState('all');
  const [filterOpen, setFilterOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (categoryId) params.categoryId = categoryId;
    if (tagId) params.tagId = tagId;
    if (tasteType) params.tasteType = tasteType;
    if (appliedKeyword) params.keyword = appliedKeyword;
    if (yearFrom) params.yearFrom = yearFrom;
    if (yearTo) params.yearTo = yearTo;
    if (watched !== 'all' && user) params.watched = watched;
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

  useEffect(() => { load(); }, [page, categoryId, tagId, tasteType, appliedKeyword, yearFrom, yearTo, watched]);

  const search = () => {
    setAppliedKeyword(keyword);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 12) || 1;
  const clearFilters = () => {
    setCategoryId('');
    setTagId('');
    setTasteType('');
    setKeyword('');
    setAppliedKeyword('');
    setYearFrom('');
    setYearTo('');
    setWatched('all');
    setPage(1);
  };

  return (
    <div className="movie-list-page">
      <h1 className="page-title">
        <FilmStripIcon size={24} weight="regular" className="page-title__icon" />
        影视库
      </h1>

      <div className="movie-list-layout">
        {/* 左侧筛选面板 · TMDB 风格 */}
        <aside className={`filter-sidebar ${filterOpen ? 'open' : ''}`}>
          <button type="button" className="filter-sidebar__toggle" onClick={() => setFilterOpen(!filterOpen)}>
            筛选 {filterOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </button>
          {filterOpen && (
            <div className="filter-sidebar__content">
              {/* 显示 */}
              {user && (
                <div className="filter-section">
                  <h3 className="filter-section__title">显示</h3>
                  <div className="filter-radio-group">
                    <label className="filter-radio">
                      <input type="radio" name="watched" checked={watched === 'all'} onChange={() => { setWatched('all'); setPage(1); }} />
                      <span>全部</span>
                    </label>
                    <label className="filter-radio">
                      <input type="radio" name="watched" checked={watched === 'unwatched'} onChange={() => { setWatched('unwatched'); setPage(1); }} />
                      <span>未观看</span>
                    </label>
                    <label className="filter-radio">
                      <input type="radio" name="watched" checked={watched === 'watched'} onChange={() => { setWatched('watched'); setPage(1); }} />
                      <span>已观看</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 发行年份 */}
              <div className="filter-section">
                <h3 className="filter-section__title">发行年份</h3>
                <div className="filter-year-range">
                  <input type="number" className="form-input" placeholder="从" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} min={1900} max={2030} />
                  <span>至</span>
                  <input type="number" className="form-input" placeholder="到" value={yearTo} onChange={(e) => setYearTo(e.target.value)} min={1900} max={2030} />
                </div>
              </div>

              {/* 类型 */}
              <div className="filter-section">
                <h3 className="filter-section__title">类型</h3>
                <div className="filter-chips">
                  <button type="button" className={`filter-chip ${!categoryId ? 'active' : ''}`} onClick={() => { setCategoryId(''); setPage(1); }}>全部</button>
                  {categories.map((c) => (
                    <button key={c.id} type="button" className={`filter-chip ${categoryId === String(c.id) ? 'active' : ''}`} onClick={() => { setCategoryId(String(c.id)); setPage(1); }}>{c.name}</button>
                  ))}
                </div>
              </div>

              {/* 标签 */}
              <div className="filter-section">
                <h3 className="filter-section__title">标签</h3>
                <div className="filter-chips">
                  <button type="button" className={`filter-chip ${!tagId ? 'active' : ''}`} onClick={() => { setTagId(''); setPage(1); }}>全部</button>
                  {tags.map((t) => (
                    <button key={t.id} type="button" className={`filter-chip ${tagId === String(t.id) ? 'active' : ''}`} onClick={() => { setTagId(String(t.id)); setPage(1); }}>{t.name}</button>
                  ))}
                </div>
              </div>

              {/* 人群口味 */}
              {tastes.length > 0 && (
                <div className="filter-section">
                  <h3 className="filter-section__title">人群口味</h3>
                  <div className="filter-chips">
                    <button type="button" className={`filter-chip ${!tasteType ? 'active' : ''}`} onClick={() => { setTasteType(''); setPage(1); }}>全部</button>
                    {tastes.map((t) => (
                      <button key={t.key} type="button" className={`filter-chip ${tasteType === t.key ? 'active' : ''}`} onClick={() => { setTasteType(t.key); setPage(1); }} title={t.desc}>{t.label}</button>
                    ))}
                  </div>
                </div>
              )}

              <button type="button" className="btn btn-outline filter-clear" onClick={clearFilters}>清除筛选</button>
            </div>
          )}
        </aside>

        {/* 右侧主内容 */}
        <main className="movie-list-main">
          <div className="search-bar">
            <input
              className="form-input"
              placeholder="搜索标题、导演..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              style={{ flex: 1, maxWidth: 280 }}
            />
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
              <p className="list-count">共 {total} 部影视</p>
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
            <p className="empty-hint">暂无影视作品，试试调整筛选条件</p>
          )}
        </main>
      </div>
    </div>
  );
}

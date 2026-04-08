import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilmStripIcon, CaretDown, CaretUp } from '@phosphor-icons/react';
import MovieCard from '../components/MovieCard';
import Pagination from '../components/Pagination';
import { api } from '../api/request';
import FilterRangeDual from '../components/filter/FilterRangeDual';

/** 影视库「电影」浏览模式（对齐 TMDB 分类：热门 / 在映 / 即将 / 高分） */
const BROWSE_MODES = [
  { key: 'popular', label: '热门' },
  { key: 'now_playing', label: '正在上映' },
  { key: 'upcoming', label: '即将上映' },
  { key: 'top_rated', label: '高分' },
];
const HIDDEN_FILTER_TAG_LABELS = new Set(['高分', '经典', '热门', '新片', '治愈', '烧脑']);

export default function MovieList() {
  const [searchParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [tastes, setTastes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tasteType, setTasteType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  /** 对应后端 query：releaseStatus=popular|now_playing|upcoming|top_rated */
  const [browseMode, setBrowseMode] = useState('popular');
  const [filterOpen, setFilterOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  /** 类型多选：'c:1' | 't:2' */
  const [selectedTypes, setSelectedTypes] = useState([]);

  /** 发行日期 */
  const [searchAllReleases, setSearchAllReleases] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  /** 片长（分钟）0–360 */
  const [durationRange, setDurationRange] = useState({ min: 0, max: 360 });

  /** 避免快速切换筛选时，旧请求晚返回覆盖新结果 */
  const movieListFetchGen = useRef(0);

  const toggleTypeKey = (key) => {
    setSelectedTypes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    setPage(1);
  };

  const clearTypes = () => {
    setSelectedTypes([]);
    setPage(1);
  };

  const load = useCallback(() => {
    const gen = ++movieListFetchGen.current;
    setLoading(true);
    const params = { page, limit: 15 };
    if (tasteType) params.tasteType = tasteType;
    if (appliedKeyword) params.keyword = appliedKeyword;
    params.releaseStatus = browseMode;

    if (selectedTypes.length) params.typeKeys = selectedTypes.join(',');

    if (!searchAllReleases) {
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
    }

    if (durationRange.min > 0) params.durationMin = durationRange.min;
    if (durationRange.max < 360) params.durationMax = durationRange.max;

    api
      .get('/movies', params)
      .then((r) => {
        if (gen !== movieListFetchGen.current) return;
        setList(r.data.list || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => {
        if (gen !== movieListFetchGen.current) return;
        setList([]);
        setTotal(0);
      })
      .finally(() => {
        if (gen !== movieListFetchGen.current) return;
        setLoading(false);
      });
  }, [
    page,
    tasteType,
    appliedKeyword,
    browseMode,
    selectedTypes,
    searchAllReleases,
    dateFrom,
    dateTo,
    durationRange,
  ]);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data || [])).catch(() => {});
    api.get('/tags').then((r) => setTags(r.data || [])).catch(() => {});
    api.get('/recommend/tastes').then((r) => setTastes(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!tasteType) return;
    const exists = tastes.some((t) => t.key === tasteType);
    if (!exists) setTasteType('');
  }, [tastes, tasteType]);

  useEffect(() => {
    load();
  }, [load]);

  /** 从首页 Hero 等入口跳转：/movies?keyword=xxx */
  useEffect(() => {
    const k = searchParams.get('keyword');
    if (k == null || String(k).trim() === '') return;
    try {
      const decoded = decodeURIComponent(String(k)).trim();
      if (decoded) {
        setKeyword(decoded);
        setAppliedKeyword(decoded);
        setPage(1);
      }
    } catch {
      /* 非法编码则忽略 */
    }
  }, [searchParams]);

  const search = () => {
    setAppliedKeyword(keyword);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 15) || 1;

  const clearFilters = () => {
    setTasteType('');
    setKeyword('');
    setAppliedKeyword('');
    setBrowseMode('popular');
    clearTypes();
    setSearchAllReleases(true);
    setDateFrom('');
    setDateTo('');
    setDurationRange({ min: 0, max: 360 });
    setPage(1);
  };

  const typeMerged = useMemo(() => {
    const rows = [];
    categories.forEach((c) => rows.push({ key: `c:${c.id}`, label: c.name, kind: 'c' }));
    tags
      .filter((t) => !HIDDEN_FILTER_TAG_LABELS.has(String(t?.name || '').trim()))
      .forEach((t) => rows.push({ key: `t:${t.id}`, label: t.name, kind: 't' }));
    return rows;
  }, [categories, tags]);

  return (
    <div className="movie-list-page movie-list-page--tmdb">
      <h1 className="page-title">
        <FilmStripIcon size={24} weight="regular" className="page-title__icon" />
        影视库
      </h1>

      <div className="movie-list-layout">
        <aside className={`filter-sidebar filter-sidebar--wide ${filterOpen ? 'open' : ''}`}>
          <button type="button" className="filter-sidebar__toggle" onClick={() => setFilterOpen(!filterOpen)}>
            筛选 {filterOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </button>
          {filterOpen && (
            <div className="filter-sidebar__content">
              {/* 电影：TMDB 式深蓝标题 + 白卡片四态 */}
              <div className="filter-movie-browse">
                <div className="filter-movie-browse__head">电影</div>
                <div className="filter-movie-browse__card">
                  <ul className="filter-movie-browse__list" role="listbox" aria-label="电影分类">
                    {BROWSE_MODES.map((item) => (
                      <li key={item.key}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={browseMode === item.key}
                          className={`filter-movie-browse__item ${browseMode === item.key ? 'filter-movie-browse__item--active' : ''}`}
                          onClick={() => {
                            setBrowseMode(item.key);
                            setPage(1);
                          }}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 发行日期 */}
              <div className="filter-section">
                <h3 className="filter-section__title filter-section__title--lg">发行日期</h3>
                <label className="filter-checkbox-row">
                  <input
                    type="checkbox"
                    checked={searchAllReleases}
                    onChange={(e) => setSearchAllReleases(e.target.checked)}
                  />
                  <span>不限制发行日期</span>
                </label>
                {!searchAllReleases && (
                  <div className="filter-date-rows">
                    <div className="filter-date-row">
                      <span className="filter-date-row__label">从</span>
                      <input
                        type="date"
                        className="form-input filter-date-input"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                    <div className="filter-date-row">
                      <span className="filter-date-row__label">到</span>
                      <input
                        type="date"
                        className="form-input filter-date-input"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="filter-section">
                <div className="filter-type-head">
                  <h3 className="filter-section__title filter-section__title--lg" style={{ marginBottom: 0 }}>
                    类型
                  </h3>
                  {selectedTypes.length > 0 && (
                    <button type="button" className="filter-type-clear" onClick={clearTypes}>
                      清除
                    </button>
                  )}
                </div>
                <div className="filter-type-pills">
                  {typeMerged.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`filter-type-pill ${selectedTypes.includes(item.key) ? 'filter-type-pill--active' : ''}`}
                      onClick={() => toggleTypeKey(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {tastes.length > 0 && (
                <div className="filter-section">
                  <h3 className="filter-section__title">人群口味</h3>
                  <p className="filter-hint" style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    需同时匹配预设类型与标签；排序偏高分与经典片
                  </p>
                  <div className="filter-chips">
                    <button
                      type="button"
                      className={`filter-chip ${!tasteType ? 'active' : ''}`}
                      onClick={() => {
                        setTasteType('');
                        setPage(1);
                      }}
                    >
                      全部
                    </button>
                    {tastes.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        className={`filter-chip ${tasteType === t.key ? 'active' : ''}`}
                        onClick={() => {
                          setTasteType(t.key);
                          setPage(1);
                        }}
                        title={t.desc}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="filter-section filter-section--sliders">
                <FilterRangeDual
                  className="filter-range-dual--duration"
                  label="时长（分钟）"
                  min={0}
                  max={360}
                  step={1}
                  valueMin={durationRange.min}
                  valueMax={durationRange.max}
                  onChange={(r) => {
                    setDurationRange(r);
                    setPage(1);
                  }}
                  ticks={[0, 120, 240, 360]}
                  formatTick={(v) => String(v)}
                />
              </div>

              <button type="button" className="btn btn-outline filter-clear" onClick={clearFilters}>
                清除筛选
              </button>
            </div>
          )}
        </aside>

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
            <button type="button" onClick={search} className="btn" disabled={loading}>
              搜索
            </button>
          </div>

          {loading ? (
            <div className="movie-grid movie-grid--tmdb-list">
              {Array.from({ length: 15 }).map((_, i) => (
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
              <div className="movie-grid movie-grid--tmdb-list">
                {list.map((m) => (
                  <MovieCard key={m.id} movie={m} showRecommendReason={false} variant="library" showPlayOverlay={false} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          ) : (
            <p className="empty-hint">暂无影视作品，试试调整筛选条件</p>
          )}
        </main>
      </div>
    </div>
  );
}

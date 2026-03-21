import { useEffect, useState, useCallback, useMemo } from 'react';
import { FilmStripIcon, CaretDown, CaretUp, PencilSimple } from '@phosphor-icons/react';
import MovieCard from '../components/MovieCard';
import Pagination from '../components/Pagination';
import { api } from '../api/request';
import FilterRangeDual from '../components/filter/FilterRangeDual';
import FilterRangeSingle from '../components/filter/FilterRangeSingle';
import ProviderIcon from '../components/filter/ProviderIcon';
import {
  WATCH_REGIONS,
  STREAM_PROVIDERS,
  LS_WATCH_SUBSCRIBED,
  LS_WATCH_REGION,
} from '../constants/watchProviders';

function readLsJson(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    if (!s) return fallback;
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

export default function MovieList() {
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [tastes, setTastes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tasteType, setTasteType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [releaseStatus, setReleaseStatus] = useState('all');
  const [filterOpen, setFilterOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  /** 类型多选：'c:1' | 't:2' */
  const [selectedTypes, setSelectedTypes] = useState([]);

  /** 在哪里观看 */
  const [whereWatchOpen, setWhereWatchOpen] = useState(true);
  const [watchRegion, setWatchRegion] = useState(() => localStorage.getItem(LS_WATCH_REGION) || 'CN');
  const [subscribedIds, setSubscribedIds] = useState(() => readLsJson(LS_WATCH_SUBSCRIBED, [8, 9]));
  const [editSubscribed, setEditSubscribed] = useState(false);
  const [onlySubscribedFilter, setOnlySubscribedFilter] = useState(false);
  const [selectedProviderIds, setSelectedProviderIds] = useState([]);
  const [watchAllPlatforms, setWatchAllPlatforms] = useState(false);

  /** 发行日期 */
  const [searchAllReleases, setSearchAllReleases] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  /** 语言 + 滑块 */
  const [language, setLanguage] = useState('');
  const [scoreRange, setScoreRange] = useState({ min: 0, max: 10 });
  const [minVotes, setMinVotes] = useState(0);

  useEffect(() => {
    localStorage.setItem(LS_WATCH_REGION, watchRegion);
  }, [watchRegion]);

  const saveSubscribed = useCallback((ids) => {
    setSubscribedIds(ids);
    localStorage.setItem(LS_WATCH_SUBSCRIBED, JSON.stringify(ids));
  }, []);

  const toggleSubscribedId = (id) => {
    const next = subscribedIds.includes(id)
      ? subscribedIds.filter((x) => x !== id)
      : [...subscribedIds, id];
    saveSubscribed(next);
  };

  const toggleProviderFilter = (id) => {
    if (onlySubscribedFilter && !subscribedIds.includes(id)) return;
    setSelectedProviderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTypeKey = (key) => {
    setSelectedTypes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    setPage(1);
  };

  const clearTypes = () => {
    setSelectedTypes([]);
    setPage(1);
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (tasteType) params.tasteType = tasteType;
    if (appliedKeyword) params.keyword = appliedKeyword;
    if (releaseStatus !== 'all') params.releaseStatus = releaseStatus;

    if (selectedTypes.length) params.typeKeys = selectedTypes.join(',');

    if (!searchAllReleases) {
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
    }

    if (language) params.language = language;

    if (scoreRange.min > 0) params.scoreMin = Math.round(scoreRange.min * 10) / 10;
    if (scoreRange.max < 10) params.scoreMax = Math.round(scoreRange.max * 10) / 10;

    if (minVotes > 0) params.minVotes = minVotes;

    if (!watchAllPlatforms && selectedProviderIds.length > 0) {
      params.providerIds = selectedProviderIds.join(',');
    }
    if (watchAllPlatforms) params.searchAllChannels = 'true';

    api
      .get('/movies', params)
      .then((r) => {
        setList(r.data.list || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [
    page,
    tasteType,
    appliedKeyword,
    releaseStatus,
    selectedTypes,
    searchAllReleases,
    dateFrom,
    dateTo,
    language,
    scoreRange,
    minVotes,
    watchAllPlatforms,
    selectedProviderIds,
  ]);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data || [])).catch(() => {});
    api.get('/tags').then((r) => setTags(r.data || [])).catch(() => {});
    api.get('/recommend/tastes').then((r) => setTastes(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const search = () => {
    setAppliedKeyword(keyword);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 12) || 1;

  const clearFilters = () => {
    setTasteType('');
    setKeyword('');
    setAppliedKeyword('');
    setReleaseStatus('all');
    clearTypes();
    setSearchAllReleases(true);
    setDateFrom('');
    setDateTo('');
    setLanguage('');
    setScoreRange({ min: 0, max: 10 });
    setMinVotes(0);
    setWatchAllPlatforms(false);
    setSelectedProviderIds([]);
    setOnlySubscribedFilter(false);
    setPage(1);
  };

  const typeMerged = useMemo(() => {
    const rows = [];
    categories.forEach((c) => rows.push({ key: `c:${c.id}`, label: c.name, kind: 'c' }));
    tags.forEach((t) => rows.push({ key: `t:${t.id}`, label: t.name, kind: 't' }));
    return rows;
  }, [categories, tags]);

  const LANG_OPTIONS = [
    { code: '', label: '未选择' },
    { code: 'zh', label: '中文' },
    { code: 'en', label: '英语' },
    { code: 'ja', label: '日语' },
    { code: 'ko', label: '韩语' },
    { code: 'fr', label: '法语' },
    { code: 'es', label: '西班牙语' },
  ];

  return (
    <div className="movie-list-page">
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
              {/* 在哪里观看 */}
              <div className="filter-section filter-section--collapse">
                <button
                  type="button"
                  className="filter-collapse-head"
                  onClick={() => setWhereWatchOpen(!whereWatchOpen)}
                >
                  <span className="filter-collapse-head__title">在哪里观看</span>
                  <span className="filter-collapse-head__badge">{STREAM_PROVIDERS.length}</span>
                  {whereWatchOpen ? <CaretUp size={18} /> : <CaretDown size={18} />}
                </button>
                {whereWatchOpen && (
                  <div className="filter-where-watch">
                    <div className="filter-my-services">
                      <span className="filter-my-services__label">
                        我的服务
                        <button
                          type="button"
                          className="filter-my-services__edit"
                          title="编辑已订阅平台"
                          onClick={() => setEditSubscribed(!editSubscribed)}
                        >
                          <PencilSimple size={16} weight="regular" />
                        </button>
                      </span>
                      <label className="filter-checkbox-row">
                        <input
                          type="checkbox"
                          checked={onlySubscribedFilter}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setOnlySubscribedFilter(on);
                            if (on) {
                              setSelectedProviderIds((prev) => prev.filter((id) => subscribedIds.includes(id)));
                            }
                          }}
                        />
                        <span>仅搜索我已订阅的服务？</span>
                      </label>
                    </div>
                    {editSubscribed && (
                      <div className="filter-subscribed-editor">
                        <p className="filter-hint">勾选你订阅的平台（保存到本机浏览器）</p>
                        <div className="provider-grid provider-grid--small provider-grid--scroll">
                          {STREAM_PROVIDERS.map((p, idx) => (
                            <label key={`sub-${p.id}-${idx}`} className="provider-cell provider-cell--check">
                              <input
                                type="checkbox"
                                checked={subscribedIds.includes(p.id)}
                                onChange={() => toggleSubscribedId(p.id)}
                              />
                              <span className="provider-cell__logo-wrap">
                                <ProviderIcon name={p.name} logoPath={p.logoPath} clearbitDomain={p.clearbitDomain} />
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="filter-field-label">国家或地区</label>
                    <select
                      className="form-input filter-region-select"
                      value={watchRegion}
                      onChange={(e) => setWatchRegion(e.target.value)}
                    >
                      {WATCH_REGIONS.map((r) => (
                        <option key={r.code} value={r.code}>
                          {(r.flag ? `${r.flag} ` : '') + r.label}
                        </option>
                      ))}
                    </select>
                    <label className="filter-checkbox-row filter-checkbox-row--tight">
                      <input
                        type="checkbox"
                        checked={watchAllPlatforms}
                        onChange={(e) => setWatchAllPlatforms(e.target.checked)}
                      />
                      <span>搜索全部平台（不按观看渠道筛选）</span>
                    </label>
                    <div className="provider-grid provider-grid--scroll">
                      {STREAM_PROVIDERS.map((p, idx) => {
                        const disabled = onlySubscribedFilter && !subscribedIds.includes(p.id);
                        const active = selectedProviderIds.includes(p.id);
                        return (
                          <button
                            key={`pv-${p.id}-${idx}`}
                            type="button"
                            disabled={disabled}
                            className={`provider-cell ${active ? 'provider-cell--active' : ''} ${disabled ? 'provider-cell--disabled' : ''}`}
                            title={p.name}
                            aria-label={p.name}
                            onClick={() => toggleProviderFilter(p.id)}
                          >
                            <span className="provider-cell__logo-wrap">
                              <ProviderIcon name={p.name} logoPath={p.logoPath} clearbitDomain={p.clearbitDomain} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                  <span>搜索所有发行渠道？</span>
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
                <h3 className="filter-section__title">上映状态</h3>
                <div className="filter-radio-group">
                  <label className="filter-radio">
                    <input
                      type="radio"
                      name="releaseStatus"
                      checked={releaseStatus === 'all'}
                      onChange={() => {
                        setReleaseStatus('all');
                        setPage(1);
                      }}
                    />
                    <span>全部</span>
                  </label>
                  <label className="filter-radio">
                    <input
                      type="radio"
                      name="releaseStatus"
                      checked={releaseStatus === 'released'}
                      onChange={() => {
                        setReleaseStatus('released');
                        setPage(1);
                      }}
                    />
                    <span>已上映</span>
                  </label>
                  <label className="filter-radio">
                    <input
                      type="radio"
                      name="releaseStatus"
                      checked={releaseStatus === 'unreleased'}
                      onChange={() => {
                        setReleaseStatus('unreleased');
                        setPage(1);
                      }}
                    />
                    <span>未上映</span>
                  </label>
                </div>
              </div>

              {/* 类型：分类+标签合并，多选，三列 */}
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

              {/* 语言 + 评分 + 投票 */}
              <div className="filter-section filter-section--sliders">
                <div className="filter-lang-row">
                  <label className="filter-lang-row__label">
                    语言
                    <span className="filter-lang-help" title="按作品原始对白语言（TMDB 字段）">
                      ?
                    </span>
                  </label>
                  <select
                    className="form-input"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setPage(1);
                    }}
                  >
                    {LANG_OPTIONS.map((o) => (
                      <option key={o.code || 'none'} value={o.code}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <FilterRangeDual
                  label="用户评分（TMDB）"
                  min={0}
                  max={10}
                  step={0.1}
                  valueMin={scoreRange.min}
                  valueMax={scoreRange.max}
                  onChange={(r) => {
                    setScoreRange(r);
                    setPage(1);
                  }}
                  ticks={[0, 5, 10]}
                  formatTick={(v) => String(v)}
                />

                <FilterRangeSingle
                  label="最少人数投票"
                  min={0}
                  max={500}
                  step={10}
                  value={minVotes}
                  onChange={(v) => {
                    setMinVotes(v);
                    setPage(1);
                  }}
                  ticks={[0, 100, 200, 300, 400, 500]}
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

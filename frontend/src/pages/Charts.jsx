import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartBarIcon } from '@phosphor-icons/react';
import { api, getCoverUrl } from '../api/request';

export default function Charts() {
  const [data, setData] = useState({ weekly: [], top: [], hot: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('weekly');

  useEffect(() => {
    api.get('/charts/all', { limit: 10 })
      .then((r) => setData(r.data || { weekly: [], top: [], hot: [] }))
      .catch(() => setData({ weekly: [], top: [], hot: [] }))
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'weekly', label: '一周口碑榜', desc: '本周最受好评（基于用户评分）' },
    { key: 'top', label: '高分榜', desc: '系统高分 Top10' },
    { key: 'hot', label: '热门榜', desc: '收藏+评分综合热度 Top10' },
  ];

  const list = data[activeTab] || [];

  function rankClass(rank) {
    if (rank === 1) return 'chart-rank chart-rank--gold';
    if (rank === 2) return 'chart-rank chart-rank--silver';
    if (rank === 3) return 'chart-rank chart-rank--bronze';
    return 'chart-rank chart-rank--rest';
  }

  return (
    <div className="charts-page">
      <h1 className="page-title">
        <ChartBarIcon size={24} weight="regular" className="page-title__icon" />
        榜单
      </h1>
      <p className="charts-page__intro">
        口碑榜基于用户行为；高分榜、热门榜由系统自动排序，TMDB 同步后更新
      </p>

      <div className="chart-tabs" role="tablist" aria-label="榜单类型">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            className={`chart-tab ${activeTab === t.key ? 'chart-tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
            title={t.desc}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="chart-skeleton" />
      ) : list.length ? (
        <div className="chart-table">
          <table>
            <thead>
              <tr>
                <th style={{ width: 48 }}>排名</th>
                <th>电影</th>
                <th style={{ width: 80 }}>评分</th>
                <th style={{ width: 90 }}>评分人数</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className={rankClass(m.rank)}>{m.rank}</span>
                  </td>
                  <td>
                    <Link to={`/movies/${m.id}`} className="chart-movie">
                      <img
                        src={getCoverUrl(m)}
                        alt=""
                        className="chart-poster"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
                      />
                      <div className="chart-movie__meta">
                        <span className="chart-title">{m.title}</span>
                        {m.release_year != null && m.release_year !== '' ? (
                          <span className="chart-year">{m.release_year}</span>
                        ) : null}
                      </div>
                    </Link>
                  </td>
                  <td>
                    {m.avg_score != null ? (
                      <span className="chart-score">{m.avg_score}</span>
                    ) : (
                      <span className="empty-hint">—</span>
                    )}
                  </td>
                  <td className="empty-hint">{m.cnt || 0} 人</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-hint">
          {activeTab === 'weekly'
            ? '暂无数据。去 影视库 浏览并对喜欢的作品评分，口碑榜将自动生成。'
            : '暂无数据，TMDB 同步后会显示高分榜与热门榜。'}
          <Link to="/movies"> 影视库</Link>
        </p>
      )}
    </div>
  );
}

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

  return (
    <div>
      <h1 className="page-title">
        <ChartBarIcon size={24} weight="regular" className="page-title__icon" />
        榜单
      </h1>
      <p className="empty-hint" style={{ marginBottom: 'var(--space-lg)' }}>
        口碑榜基于用户行为；高分榜、热门榜由系统自动排序，TMDB 同步后更新
      </p>

      <div className="taste-chips">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`taste-chip ${activeTab === t.key ? 'active' : ''}`}
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
                    <span className={`chart-rank ${m.rank <= 3 ? 'top3' : ''}`}>{m.rank}</span>
                  </td>
                  <td>
                    <Link to={`/movies/${m.id}`} className="chart-movie">
                      <img
                        src={getCoverUrl(m)}
                        alt=""
                        className="chart-poster"
                        onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
                      />
                      <div>
                        <span className="chart-title">{m.title}</span>
                        {m.release_year && <span className="chart-year">{m.release_year}</span>}
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

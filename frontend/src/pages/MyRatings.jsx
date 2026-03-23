import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, ArrowLeftIcon } from '@phosphor-icons/react';
import { api, getCoverUrl } from '../api/request';

/**
 * 个人中心 · 我的评分：已评分的影片列表
 */
export default function MyRatings() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/users/me/ratings')
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch((e) => setErr(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="form-page profile-page profile-page--wide my-activity-page">
      <p className="my-activity-page__back">
        <Link to="/profile" className="my-activity-page__back-link">
          <ArrowLeftIcon size={18} weight="bold" />
          返回个人信息
        </Link>
      </p>
      <h1 className="page-title">
        <StarIcon size={24} weight="regular" className="page-title__icon" />
        我的评分
      </h1>
      <p className="empty-hint my-activity-page__desc">你在本站为影片打过的分数，点击海报或标题可进入详情。</p>
      {err && <p className="error-msg">{err}</p>}
      {loading && <p className="empty-hint">加载中…</p>}
      {!loading && !err && list.length === 0 && (
        <p className="empty-hint">暂无评分，去 <Link to="/movies">影视库</Link> 给喜欢的片子打分吧。</p>
      )}
      {!loading && list.length > 0 && (
        <ul className="my-ratings-list">
          {list.map((row) => (
            <li key={row.id} className="my-ratings-row card">
              <Link to={`/movies/${row.movie_id}`} className="my-ratings-row__cover">
                <img src={getCoverUrl({ id: row.movie_id })} alt="" />
              </Link>
              <div className="my-ratings-row__body">
                <Link to={`/movies/${row.movie_id}`} className="my-ratings-row__title">
                  {row.title}
                </Link>
                <div className="my-ratings-row__meta">
                  <span className="my-ratings-row__score">{Number(row.score).toFixed(1)} 分</span>
                  <span className="my-ratings-row__date">{row.created_at}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

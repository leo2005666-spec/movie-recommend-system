import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getCoverUrl } from '../api/request';
import TmdbAwardsListing from '../components/TmdbAwardsListing';

export default function MovieAwards() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setErr('');
    api
      .get(`/movies/${id}/awards-data`)
      .then((res) => {
        if (!cancelled) setPayload(res.data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="movie-awards-page">
        <p className="empty-hint">加载中…</p>
      </div>
    );
  }
  if (err || !payload) {
    return (
      <div className="movie-awards-page">
        <p className="error-msg">{err || '无数据'}</p>
        <Link to={`/movies/${id}`}>返回影片页</Link>
      </div>
    );
  }

  const {
    movie,
    nomination_count: nomRaw,
    award_lines: linesRaw,
    awards_text: awardsText,
    tmdb_awards_url: tmdbUrl,
    groups: groupsRaw,
  } = payload;
  const awardLines = Array.isArray(linesRaw) ? linesRaw : [];
  const groups = Array.isArray(groupsRaw) ? groupsRaw : [];
  const nominationCount = nomRaw != null ? nomRaw : (awardLines.length > 0 ? awardLines.length : null);
  const mid = parseInt(id, 10);

  return (
    <div className="movie-awards-page">
      <header className="movie-awards-header">
        <div className="movie-awards-header__inner">
          {movie.cover && (
            <img
              src={getCoverUrl({ id: mid, cover: movie.cover })}
              alt=""
              className="movie-awards-header__poster"
            />
          )}
          <div>
            <h1 className="movie-awards-header__title">
              {movie.title}
              {movie.release_year != null && <span> ({movie.release_year})</span>}
            </h1>
            <Link to={`/movies/${id}`} className="movie-awards-back">
              ← 返回主页面
            </Link>
          </div>
        </div>
      </header>

      <main className="movie-awards-main">
        {groups.length > 0 ? (
          <TmdbAwardsListing
            data={payload}
            panelId="movie-awards-standalone-panel"
            wrapClassName="movie-awards-standalone-card"
            showStrip={false}
          />
        ) : (
          <>
            <div className="movie-awards-headrow">
              <h2 className="movie-awards-title-serif">AWARDS</h2>
              <span className="movie-awards-count">共 {nominationCount != null ? nominationCount : '—'} 项提名</span>
            </div>
            <hr className="movie-awards-rule" />

            {awardLines.length > 0 ? (
              <ul className="movie-awards-lines">
                {awardLines.map((line, i) => (
                  <li key={i} className="movie-awards-line-card">
                    <p>{line}</p>
                  </li>
                ))}
              </ul>
            ) : awardsText ? (
              <p className="movie-awards-fallback-text">{awardsText}</p>
            ) : (
              <p className="empty-hint">暂无结构化奖项数据。若 TMDB 官网有该片奖项页，请稍后重试或前往 TMDB 查看。</p>
            )}
          </>
        )}

        {tmdbUrl && (
          <p className="movie-awards-external">
            <a href={tmdbUrl} target="_blank" rel="noopener noreferrer">
              在 The Movie Database 上查看完整奖项
            </a>
          </p>
        )}
      </main>
    </div>
  );
}

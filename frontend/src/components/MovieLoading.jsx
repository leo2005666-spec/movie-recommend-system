/**
 * 电影主题加载动画 · 胶卷与放映机风格
 */
export default function MovieLoading({ count = 12 }) {
  return (
    <div className="movie-loading">
      <div className="movie-loading__film" aria-hidden>
        <div className="movie-loading__frame" />
        <div className="movie-loading__frame" />
        <div className="movie-loading__frame" />
        <div className="movie-loading__frame" />
      </div>
      <div className="movie-loading__reel" aria-hidden>
        <div className="movie-loading__reel-inner" />
      </div>
      <div className="movie-loading__grid">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="movie-loading__card">
            <div className="movie-loading__poster" />
            <div className="movie-loading__line movie-loading__line--title" />
            <div className="movie-loading__line movie-loading__line--meta" />
          </div>
        ))}
      </div>
    </div>
  );
}

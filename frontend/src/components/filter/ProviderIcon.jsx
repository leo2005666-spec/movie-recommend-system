import { useState, useMemo } from 'react';

const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w154';

export default function ProviderIcon({ name, logoPath, clearbitDomain }) {
  const urls = useMemo(() => {
    const list = [];
    if (logoPath) {
      const p = logoPath.startsWith('/') ? logoPath : `/${logoPath}`;
      list.push(`${TMDB_LOGO_BASE}${p}`);
    }
    if (clearbitDomain) {
      list.push(`https://logo.clearbit.com/${clearbitDomain}`);
    }
    return list;
  }, [logoPath, clearbitDomain]);

  const [index, setIndex] = useState(0);

  if (urls.length === 0 || index >= urls.length) {
    return <span className="provider-cell__fallback provider-cell__fallback--only">{name?.[0] || '?'}</span>;
  }

  return (
    <img
      src={urls[index]}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

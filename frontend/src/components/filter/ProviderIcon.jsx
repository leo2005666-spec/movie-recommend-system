import { useState, useMemo } from 'react';
import { API_BASE } from '../../api/request';

const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w185';

function proxied(href) {
  return `${API_BASE}/proxy-img?u=${encodeURIComponent(href)}`;
}

export default function ProviderIcon({ name, logoPath, clearbitDomain }) {
  const urls = useMemo(() => {
    const list = [];
    if (logoPath) {
      const p = logoPath.startsWith('/') ? logoPath : `/${logoPath}`;
      const direct = `${TMDB_LOGO_BASE}${p}`;
      /** 国内常无法直连 image.tmdb.org：优先走后端代理 */
      list.push(proxied(direct));
      list.push(direct);
    }
    if (clearbitDomain) {
      const gFav = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(clearbitDomain)}&sz=128`;
      list.push(proxied(gFav));
      list.push(gFav);
      const cb = `https://logo.clearbit.com/${clearbitDomain}`;
      list.push(proxied(cb));
      list.push(cb);
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

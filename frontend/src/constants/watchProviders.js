/**
 * TMDB watch provider_id + logo_path；clearbit 为图标加载失败时的备用
 * 列表经去重：相同 logo 或相同展示名称只保留一条，避免界面重复（如双 Amazon、同图多 ID）
 */
export const WATCH_REGIONS = [
  { code: 'CN', label: '中国', flag: '🇨🇳' },
  { code: 'US', label: '美国', flag: '🇺🇸' },
  { code: 'SG', label: '新加坡', flag: '🇸🇬' },
  { code: 'JP', label: '日本', flag: '🇯🇵' },
  { code: 'KR', label: '韩国', flag: '🇰🇷' },
  { code: 'GB', label: '英国', flag: '🇬🇧' },
  { code: 'TW', label: '台湾', flag: '🇹🇼' },
  { code: 'HK', label: '香港', flag: '🇭🇰' },
];

const STREAM_PROVIDERS_RAW = [
  { id: 8, name: 'Netflix', logoPath: '/9A1JSVmS8AGHmnwRLHswLlKhlxA.jpg', clearbitDomain: 'netflix.com' },
  { id: 9, name: 'Amazon Prime Video', logoPath: '/kQFXrTbfVFB44dDNrIKZN944Svp.jpg', clearbitDomain: 'primevideo.com' },
  { id: 119, name: 'Amazon Prime Video', logoPath: '/emthp39XA2YScoYL1p0sdbAH2WA.jpg', clearbitDomain: 'primevideo.com' },
  { id: 337, name: 'Disney+', logoPath: '/8z7rC8uMPaWVLNvmuWHzJ1I7jyL.jpg', clearbitDomain: 'disneyplus.com' },
  { id: 350, name: 'Apple TV+', logoPath: '/6uhKBfmtzFqDkR8ZnVuIUsutXbj.jpg', clearbitDomain: 'apple.com' },
  { id: 384, name: 'Max', logoPath: '/AkXBqZwonMBDbWySbaCMYHsyQE.jpg', clearbitDomain: 'max.com' },
  { id: 2, name: 'Apple TV', logoPath: '/peURlLxl8yIDQzrXJQQKwmIdC5q.jpg', clearbitDomain: 'apple.com' },
  { id: 3, name: 'Google Play 电影', logoPath: '/pTnnSxUiABfYDukSoMuXFEDLRUM.jpg', clearbitDomain: 'google.com' },
  { id: 283, name: 'Crunchyroll', logoPath: '/mXeC3AiSCFbHVSqDwo5d7ZnVBaj.jpg', clearbitDomain: 'crunchyroll.com' },
  { id: 15, name: 'Hulu', logoPath: '/A5MQ00DBO2b8P6Fmzwg7Ps1e2fh.jpg', clearbitDomain: 'hulu.com' },
  { id: 386, name: 'Peacock', logoPath: '/ctI1CeHtr4rYcJwwdK9CatyjQnR.jpg', clearbitDomain: 'peacocktv.com' },
  { id: 531, name: 'Paramount+', logoPath: '/fj29Eb1OZi9BIXa4guUx1z1R7Lw.jpg', clearbitDomain: 'paramountplus.com' },
  { id: 526, name: 'AMC+', logoPath: '/z6T8SV14EAnCu6DTFCWleGsWU1o.jpg', clearbitDomain: 'amc.com' },
  { id: 43, name: 'Starz', logoPath: '/z0h7mBHGXw3a65DqADPAWOTCHE.jpg', clearbitDomain: 'starz.com' },
  { id: 37, name: 'Showtime', logoPath: '/4kLm7E1HzZKtGjtn3uEwE8BUBxa.jpg', clearbitDomain: 'showtime.com' },
  { id: 11, name: 'MUBI', logoPath: '/bVR4Z5L9Y8bX8iJtGkMIXUX75xN.jpg', clearbitDomain: 'mubi.com' },
  { id: 1796, name: 'Netflix 含广告', logoPath: '/9A1JSVmS8AGHmnwRLHswLlKhlxA.jpg', clearbitDomain: 'netflix.com' },
  { id: 192, name: 'YouTube', logoPath: '/wFsB7e1Qyxl9t8NraKxDJ5u0F1H.jpg', clearbitDomain: 'youtube.com' },
  { id: 300, name: 'Rakuten TV', logoPath: '/x6IedYxZWH6fVjByPj3cF0x7qMq.jpg', clearbitDomain: 'rakuten.tv' },
  { id: 68, name: 'Microsoft Store', logoPath: '/paq2o2dIfajlQEJXQtwKWrBv6z.jpg', clearbitDomain: 'microsoft.com' },
  { id: 2528, name: 'Roku Channel', logoPath: '/z6T8SV14EAnCu6DTFCWleGsWU1o.jpg', clearbitDomain: 'roku.com' },
  { id: 99, name: 'Shudder', logoPath: '/5Xa7e3VUbsQByqxXKgJfXsxF7Tw.jpg', clearbitDomain: 'shudder.com' },
  { id: 157, name: 'Sling TV', logoPath: '/d1gl0ftq6PZ0o1KQB7U9Vjx0fqn.jpg', clearbitDomain: 'sling.com' },
  { id: 34, name: 'MGM+', logoPath: '/9qlSK3Ru0XP95yUre6kJwyQKtXH.jpg', clearbitDomain: 'mgmplus.com' },
  { id: 613, name: 'Stan', logoPath: '/rIZxF4GEZ2kHMk5ndhr0NHFmIUN.jpg', clearbitDomain: 'stan.com.au' },
  { id: 385, name: 'CuriosityStream', logoPath: '/1wYwnrch5BNG6GNOgfmg2sxbdXV.jpg', clearbitDomain: 'curiositystream.com' },
  { id: 510, name: 'Discovery+', logoPath: '/wYq2gGMf0x4zghKj7YOFXJRIaQz.jpg', clearbitDomain: 'discoveryplus.com' },
  { id: 232, name: 'Zee5', logoPath: '/ajcUgYePZ0wL99sxFwnrnqnZfp8.jpg', clearbitDomain: 'zee5.com' },
  { id: 309, name: 'Sun NXT', logoPath: '/tVE0bjqH4r4LlGoPACl29JfIJIf.jpg' },
  { id: 224, name: 'Disney+ Hotstar', logoPath: '/pTucnAZ30AAjeZ7yo6gGXJ362rz.jpg', clearbitDomain: 'hotstar.com' },
  { id: 273, name: 'Pluto TV', logoPath: '/dH6BOrvGZ7Ouz1POPPCwlMu9hh2.jpg', clearbitDomain: 'pluto.tv' },
  { id: 73, name: 'Tubi', logoPath: '/73hZjfAvXUgIXu7yztyWca6q6CL.png', clearbitDomain: 'tubi.tv' },
  { id: 538, name: 'Plex', logoPath: '/wksGl1KhGg0uMP0jdhiTUFktLs.jpg', clearbitDomain: 'plex.tv' },
  { id: 486, name: 'Viaplay', logoPath: '/r8pT5uEFjN3gPwTQ7HePapiUZ4g.jpg', clearbitDomain: 'viaplay.com' },
  { id: 188, name: 'Starz Amazon Channel', logoPath: '/z0h7mBHGXw3a65DqADPAWOTCHE.jpg', clearbitDomain: 'starz.com' },
  { id: 591, name: 'Now TV', logoPath: '/9qlSK3Ru0XP95yUre6kJwyQKtXH.jpg' },
  { id: 130, name: 'DIRECTV', logoPath: '/d1gl0ftq6PZ0o1KQB7U9Vjx0fqn.jpg', clearbitDomain: 'directv.com' },
  { id: 546, name: 'AMC+ Amazon', logoPath: '/z6T8SV14EAnCu6DTFCWleGsWU1o.jpg', clearbitDomain: 'amc.com' },
  { id: 551, name: 'Showtime Amazon', logoPath: '/4kLm7E1HzZKtGjtn3uEwE8BUBxa.jpg', clearbitDomain: 'showtime.com' },
  { id: 577, name: 'BritBox', logoPath: '/x6IedYxZWH6fVjByPj3cF0x7qMq.jpg', clearbitDomain: 'britbox.com' },
  { id: 343, name: 'Vudu', logoPath: '/pTnnSxUiABfYDukSoMuXFEDLRUM.jpg', clearbitDomain: 'vudu.com' },
  { id: 528, name: 'AMC on Demand', logoPath: '/z6T8SV14EAnCu6DTFCWleGsWU1o.jpg', clearbitDomain: 'amc.com' },
  { id: 447, name: 'Filmin', logoPath: '/x6IedYxZWH6fVjByPj3cF0x7qMq.jpg', clearbitDomain: 'filmin.es' },
  { id: 575, name: 'Clarovideo', logoPath: '/21M5CpiOYGOhHj2sVPX0wtBpX9F.jpg' },
  { id: 167, name: 'Claro video', logoPath: '/21M5CpiOYGOhHj2sVPX0wtBpX9F.jpg' },
  { id: 210, name: 'Sky Store', logoPath: '/pTnnSxUiABfYDukSoMuXFEDLRUM.jpg', clearbitDomain: 'sky.com' },
  { id: 578, name: 'Struum', logoPath: '/x6IedYxZWH6fVjByPj3cF0x7qMq.jpg' },
  { id: 582, name: 'Crunchyroll Amazon', logoPath: '/mXeC3AiSCFbHVSqDwo5d7ZnVBaj.jpg', clearbitDomain: 'crunchyroll.com' },
  { id: 701, name: 'Discovery+ Amazon', logoPath: '/wYq2gGMf0x4zghKj7YOFXJRIaQz.jpg', clearbitDomain: 'discoveryplus.com' },
  { id: 885, name: 'YouTube TV', logoPath: '/wFsB7e1Qyxl9t8NraKxDJ5u0F1H.jpg', clearbitDomain: 'tv.youtube.com' },
  { id: 258, name: 'Apple TV+ Amazon', logoPath: '/6uhKBfmtzFqDkR8ZnVuIUsutXbj.jpg', clearbitDomain: 'apple.com' },
  { id: 564, name: 'Kino on Demand', logoPath: '/x6IedYxZWH6fVjByPj3cF0x7qMq.jpg' },
];

/**
 * 去重：1) 相同 logoPath 只保留先出现的一条 2) 相同展示名称只保留一条
 */
function dedupeStreamProviders(list) {
  const seenLogo = new Set();
  const seenName = new Set();
  return list.filter((p) => {
    const lp = (p.logoPath || '').trim();
    if (lp) {
      if (seenLogo.has(lp)) return false;
      seenLogo.add(lp);
    }
    const n = (p.name || '').trim();
    if (n) {
      if (seenName.has(n)) return false;
      seenName.add(n);
    }
    return true;
  });
}

/** 筛选 UI 使用的平台列表（已去重） */
export const STREAM_PROVIDERS = dedupeStreamProviders(STREAM_PROVIDERS_RAW);

export const LS_WATCH_SUBSCRIBED = 'movie_watch_subscribed_ids';
export const LS_WATCH_REGION = 'movie_watch_region';

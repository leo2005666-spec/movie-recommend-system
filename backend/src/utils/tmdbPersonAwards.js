/**
 * TMDB 公开 API 无结构化奖项列表；人物/影片奖项与官网一致的数据来自奖项页 HTML。
 * 人物：https://www.themoviedb.org/person/{id}/awards?language=zh-CN
 * 影片：https://www.themoviedb.org/movie/{id}/awards?language=zh-CN
 */
const cheerio = require('cheerio');

const TMDB_ORIGIN = 'https://www.themoviedb.org';

/**
 * @param {string} html
 * @returns {{
 *   nomination_count: number | null,
 *   win_count: number | null,
 *   summary_text: string,
 *   groups: Array<{
 *     organization_name: string,
 *     organization_path: string,
 *     organization_logo_url: string | null,
 *     entries: Array<object>
 *   }>
 * }}
 */
/** 人物页与影片页奖项区 DOM 结构一致，共用同一解析器 */
function parseTmdbAwardsPageHtml(html) {
  const $ = cheerio.load(html);

  const summaryText = $('p.text-lg.font-semibold').first().text().replace(/\s+/g, ' ').trim();
  let nomination_count = null;
  let win_count = null;
  const m = summaryText.match(/共\s*(\d+)\s*项提名[,\s，]*共\s*(\d+)\s*个奖项/);
  if (m) {
    nomination_count = parseInt(m[1], 10);
    win_count = parseInt(m[2], 10);
  }

  const groups = [];

  $('div.space-y-12 > div').each((_, groupEl) => {
    const $g = $(groupEl);
    const orgLink = $g.find('div.font-semibold.leading-9 a.font-bold').first();
    if (!orgLink.length) return;

    const organization_name = orgLink.text().trim();
    const organization_path = orgLink.attr('href') || '';
    const logoImg = $g.find('div.hidden.md\\:block img.logo').first();
    const organization_logo_url = logoImg.attr('src') || null;

    const entries = [];
    const $cardRoot = $g.find('div.w-full.divide-y').filter((__, el) => {
      const cls = $(el).attr('class') || '';
      return cls.includes('divide-y') && cls.includes('rounded-lg');
    }).first();

    $cardRoot.children('div').each((__, rowEl) => {
      const $row = $(rowEl);
      if (!$row.is('div')) return;
      const rowClass = $row.attr('class') || '';
      if (!rowClass.includes('flex-row')) return;

      const posterA = $row.find('img.poster').first().closest('a');
      const poster_url = $row.find('img.poster').first().attr('src') || null;
      const movieHref = posterA.attr('href') || '';
      const movieMatch = movieHref.match(/\/movie\/(\d+)/);
      const movie_tmdb_id = movieMatch ? parseInt(movieMatch[1], 10) : null;
      const movie_title = posterA.attr('title') || '';

      const ceremonyA = $row.find('[class*="sm:pr-4"] p.mb-1 a, div[class*="pr-4"] p.mb-1 a').first();
      if (!ceremonyA.length) return;
      const ceremony_label = ceremonyA.text().trim();
      const ceremony_path = ceremonyA.attr('href') || '';

      const badgeSpan = $row.find('span.rounded-md.font-semibold').first();
      const badgeClass = badgeSpan.attr('class') || '';
      const is_winner = badgeClass.includes('bg-green-500');
      const categoryA = $row.find('a.font-bold').filter((i, el) => {
        const href = $(el).attr('href') || '';
        return href.includes('/category/');
      }).first();
      const category_name = categoryA.text().trim();
      const category_path = categoryA.attr('href') || '';

      const yearText = $row.find('div.hidden.md\\:block p.font-bold').last().text().trim();

      const shared_with = [];
      $row.find('ul.flex.flex-wrap li, ul.flex.flex-wrap.gap-y-2 li').each((___, li) => {
        const $li = $(li);
        const personA = $li.find('a[href*="/person/"]').last();
        const name = personA.text().trim();
        if (!name) return;
        const phref = personA.attr('href') || '';
        const pid = phref.match(/\/person\/(\d+)/);
        const img = $li.find('img.profile').attr('src') || null;
        shared_with.push({
          tmdb_id: pid ? parseInt(pid[1], 10) : null,
          name,
          profile_thumb: img,
        });
      });

      entries.push({
        ceremony_label,
        ceremony_path,
        category_name,
        category_path,
        is_winner,
        year_label: yearText,
        movie_tmdb_id,
        movie_title,
        poster_url,
        shared_with,
      });
    });

    if (organization_name && entries.length) {
      groups.push({
        organization_name,
        organization_path,
        organization_logo_url,
        entries,
      });
    }
  });

  return {
    nomination_count,
    win_count,
    summary_text: summaryText,
    groups,
    source: 'tmdb_web',
  };
}

async function fetchTmdbAwardsHtml(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovieRecommend/1.0)' },
    signal: AbortSignal.timeout(28000),
    redirect: 'follow',
  });
  if (!r.ok) {
    throw new Error(`TMDB 网页 HTTP ${r.status}`);
  }
  const html = await r.text();
  return parseTmdbAwardsPageHtml(html);
}

async function fetchPersonAwardsFromTmdbWeb(tmdbPersonId) {
  const url = `${TMDB_ORIGIN}/person/${tmdbPersonId}/awards?language=zh-CN`;
  return fetchTmdbAwardsHtml(url);
}

async function fetchMovieAwardsFromTmdbWeb(tmdbMovieId) {
  const url = `${TMDB_ORIGIN}/movie/${tmdbMovieId}/awards?language=zh-CN`;
  return fetchTmdbAwardsHtml(url);
}

function absolutizeTmdbPath(path) {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http')) return path;
  return TMDB_ORIGIN + path;
}

module.exports = {
  parseTmdbAwardsPageHtml,
  parsePersonAwardsHtml: parseTmdbAwardsPageHtml,
  fetchPersonAwardsFromTmdbWeb,
  fetchMovieAwardsFromTmdbWeb,
  absolutizeTmdbPath,
  TMDB_ORIGIN,
};

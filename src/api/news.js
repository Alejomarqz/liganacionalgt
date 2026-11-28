// src/api/news.js
// Noticias oficiales de liganacionalgt.com (WordPress REST), con la misma caché.
import { useMemo } from 'react';
import { useQuery } from './store';

const WP = 'https://liganacionalgt.com/wp-json/wp/v2';

const decode = (s = '') =>
  String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8216;|&#8217;/g, '’')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

async function fetchNews(search, perPage) {
  const url = `${WP}/posts?_embed=1&per_page=${perPage}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export function normalizePost(p) {
  const media = p?._embedded?.['wp:featuredmedia']?.[0];
  return {
    id: p.id,
    title: decode(p?.title?.rendered || ''),
    excerpt: decode(p?.excerpt?.rendered || ''),
    date: p.date ? new Date(p.date) : null,
    image: media?.media_details?.sizes?.medium_large?.source_url || media?.source_url || null,
    link: p.link,
    raw: p, // la pantalla "New" abre la noticia con el objeto original
  };
}

export function useNews(search = '', perPage = 6) {
  const q = useQuery(`news:${search}:${perPage}`, () => fetchNews(search, perPage), { staleTime: 15 * 60000 });
  const posts = useMemo(() => (q.data || []).map(normalizePost), [q.data]);
  return { ...q, posts };
}

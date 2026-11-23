import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../config/site';

/** Hand-rolled so every URL is canonical (no trailing slash) and carries a lastmod. */
export const GET: APIRoute = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const [blog, features, alts] = await Promise.all([getCollection('blog'), getCollection('features'), getCollection('alternatives')]);
  const urls: { loc: string; lastmod: string; priority: string }[] = [
    { loc: '/', lastmod: today, priority: '1.0' },
    { loc: '/pricing', lastmod: today, priority: '0.9' },
    { loc: '/features', lastmod: today, priority: '0.9' },
    { loc: '/blog', lastmod: today, priority: '0.8' },
    { loc: '/alternatives', lastmod: today, priority: '0.7' },
    ...features.map((f) => ({ loc: `/${f.id}`, lastmod: today, priority: f.id === 'ai-coach' || f.id === 'invite-friends' ? '0.9' : '0.7' })),
    ...blog.map((p) => ({ loc: `/blog/${p.id}`, lastmod: (p.data.updated ?? p.data.date).toISOString().slice(0, 10), priority: '0.8' })),
    ...alts.map((a) => ({ loc: `/alternatives/${a.id}`, lastmod: today, priority: '0.6' })),
    { loc: '/support', lastmod: today, priority: '0.4' },
    { loc: '/privacy', lastmod: '2026-10-12', priority: '0.3' },
    { loc: '/terms', lastmod: today, priority: '0.3' },
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${new URL(u.loc, SITE.url).href.replace(/\/$/, u.loc === '/' ? '/' : '')}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

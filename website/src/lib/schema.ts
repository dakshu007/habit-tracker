import { SITE } from '../config/site';

export const faqSchema = (items: { q: string; a: string }[]) =>
  items.length
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        },
      ]
    : [];

export const articleSchema = (o: { title: string; description: string; path: string; image: string; published: Date; modified?: Date }) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: o.title,
  description: o.description,
  mainEntityOfPage: new URL(o.path, SITE.url).href,
  image: new URL(o.image, SITE.url).href,
  datePublished: o.published.toISOString(),
  dateModified: (o.modified ?? o.published).toISOString(),
  inLanguage: 'en-IN',
  author: { '@type': 'Organization', name: 'Habit Tracker team', url: SITE.url },
  publisher: { '@id': `${SITE.url}/#org` },
});

/** Words per minute for reading-time estimates. */
export const readingMinutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 230));

export const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

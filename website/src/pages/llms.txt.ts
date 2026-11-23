import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE, PLANS, TRIAL_DAYS, FREE_HABITS } from '../config/site';

/** Plain-text summary for AI assistants and answer engines (llmstxt.org). */
export const GET: APIRoute = async () => {
  const [features, blog, alts] = await Promise.all([getCollection('features'), getCollection('blog'), getCollection('alternatives')]);
  const lines = [
    `# ${SITE.fullName}`,
    '',
    `> ${SITE.defaultDescription}`,
    '',
    `Habit Tracker is an Android habit tracking app by ${SITE.company}, available in English and Hindi. No account and no ads. Get it on Google Play: ${SITE.playUrl}`,
    '',
    '## Pricing',
    `- ${TRIAL_DAYS}-day free trial of every feature, no card needed.`,
    `- Free plan forever: ${FREE_HABITS} habits with streaks, reminders, challenges, weekly review and backups.`,
    `- Habit Tracker Pro: ${PLANS.map((p) => `${p.name} ${p.price}${p.period}`).join(', ')} (INR, billed by Google Play).`,
    '- Invite 5 friends to earn 3 months of Pro free; invited friends get a 14-day trial.',
    '',
    '## Features',
    ...features.sort((a, b) => a.data.order - b.data.order).map((f) => `- [${f.data.name}](${SITE.url}/${f.id}): ${f.data.lede}`),
    '',
    '## Guides',
    ...blog.map((p) => `- [${p.data.title}](${SITE.url}/blog/${p.id}): ${p.data.description}`),
    '',
    '## Comparisons',
    ...alts.sort((a, b) => a.data.order - b.data.order).map((a) => `- [Habit Tracker vs ${a.data.competitor}](${SITE.url}/alternatives/${a.id})`),
    '',
    '## Pages',
    `- [Pricing](${SITE.url}/pricing)`,
    `- [Privacy policy](${SITE.url}/privacy)`,
    `- [Support](${SITE.url}/support): ${SITE.email}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

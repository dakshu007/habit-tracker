// Validates content front matter and word counts without a full build.
// Usage: node scripts/check-content.mjs [blog|features|alternatives] [file …]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse } from 'yaml';

const ROOT = new URL('..', import.meta.url).pathname;
const ART = new Set(readdirSync(join(ROOT, 'public/img/ill')).filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', '')));
const TINT = ['sky', 'lav', 'peach', 'mint'];
const lucide = await import('lucide-static');
const isIcon = (n) => typeof lucide[n] === 'string';
const FEATURES = existsSync(join(ROOT, 'docs/CONTENT_GUIDE.md'))
  ? [...readFileSync(join(ROOT, 'docs/CONTENT_GUIDE.md'), 'utf8').matchAll(/(?<=[ ,:])\/([a-z0-9-]+)(?=,|\n)/g)].map((m) => m[1])
  : [];

const rules = {
  blog: { words: [1800, 2050], required: ['title', 'description', 'keyword', 'date', 'category', 'art', 'tint', 'faq'] },
  features: { words: [350, 650], required: ['name', 'title', 'description', 'headline', 'lede', 'plan', 'planNote', 'icon', 'art', 'tint', 'category', 'order', 'highlights', 'steps', 'faq', 'related'] },
  alternatives: { words: [700, 1050], required: ['competitor', 'title', 'description', 'headline', 'lede', 'summary', 'theirPricing', 'platforms', 'table', 'reasons', 'theyDoWell', 'considerations', 'verdict', 'lastChecked', 'sources', 'order', 'faq'] },
};

const words = (md) =>
  md
    .replace(/\[\[cta[^\]]*\]\]/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_|`-]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

let failed = 0;
const [only, ...files] = process.argv.slice(2);
for (const col of Object.keys(rules)) {
  if (only && only !== col) continue;
  const dir = join(ROOT, 'src/content', col);
  if (!existsSync(dir)) continue;
  const list = files.length ? files.map((f) => basename(f)) : readdirSync(dir).filter((f) => f.endsWith('.md'));
  for (const f of list) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
    const errs = [];
    let fm = {};
    if (!m) errs.push('missing front matter block');
    else {
      try { fm = parse(m[1]) ?? {}; } catch (e) { errs.push('YAML error: ' + e.message.split('\n')[0]); }
    }
    const r = rules[col];
    for (const k of r.required) if (fm[k] === undefined || fm[k] === '') errs.push(`missing ${k}`);
    if (fm.description && (fm.description.length < 110 || fm.description.length > 170)) errs.push(`description is ${fm.description.length} chars (110-170)`);
    for (const k of ['title', 'seoTitle']) if (col !== 'blog' || k === 'seoTitle') if (fm[k] && fm[k].length > 65) errs.push(`${k} is ${fm[k].length} chars (max 65)`);
    if (fm.art && !ART.has(fm.art)) errs.push(`unknown art "${fm.art}"`);
    if (fm.tint && !TINT.includes(fm.tint)) errs.push(`unknown tint "${fm.tint}"`);
    if (fm.icon && !isIcon(fm.icon)) errs.push(`unknown icon "${fm.icon}"`);
    for (const h of fm.highlights ?? []) if (!isIcon(h.icon)) errs.push(`unknown highlight icon "${h.icon}"`);
    if (col === 'features') for (const s of fm.related ?? []) if (FEATURES.length && !FEATURES.includes(s)) errs.push(`related "${s}" is not a feature slug`);
    if (/—/.test(raw)) errs.push('contains em dashes (—)');
    const body = m ? m[2] : '';
    const n = words(body);
    if (n < r.words[0] || n > r.words[1]) errs.push(`body is ${n} words (${r.words[0]}-${r.words[1]})`);
    const links = [...body.matchAll(/\]\((\/[^)\s#]*)/g)].map((x) => x[1]);
    console.log(`${errs.length ? '✗' : '✓'} ${col}/${f}  ${n} words, ${links.length} internal links${errs.length ? '\n    - ' + errs.join('\n    - ') : ''}`);
    if (errs.length) failed++;
  }
}
process.exit(failed ? 1 : 0);

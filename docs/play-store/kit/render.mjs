// Renders the Play Store graphics from HTML.
//   node render.mjs            -> feature graphic + every screenshot in raw/
// Needs Playwright (npm i -D playwright && npx playwright install chromium).
import { chromium } from 'playwright';
import { existsSync, readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..');
const shots = join(out, 'screenshots');
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

// 1. Feature graphic, 1024 x 500
await page.setViewportSize({ width: 1024, height: 500 });
await page.goto(pathToFileURL(join(here, 'feature-graphic.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(out, 'feature-graphic.png'), type: 'png' });
console.log('feature-graphic.png');

// 2. Screenshots, 1080 x 1920 (9:16), one per entry in captions.json with a matching file in raw/
const captions = JSON.parse(readFileSync(join(here, 'captions.json'), 'utf8'));
const raws = existsSync(join(here, 'raw')) ? readdirSync(join(here, 'raw')) : [];
await page.setViewportSize({ width: 1080, height: 1920 });
for (const [i, c] of captions.entries()) {
  const file = raws.find((f) => f.startsWith(c.file + '.'));
  if (!file) {
    console.log(`skip ${c.file} (no raw/${c.file}.png yet)`);
    continue;
  }
  const url = new URL(pathToFileURL(join(here, 'frame.html')).href);
  url.searchParams.set('img', `raw/${file}`);
  url.searchParams.set('title', c.title);
  url.searchParams.set('sub', c.sub);
  url.searchParams.set('tone', c.tone ?? 'sage');
  await page.goto(url.href);
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((im) => im.decode().catch(() => {}))]));
  const name = `${String(i + 1).padStart(2, '0')}-${c.file}.png`;
  await page.screenshot({ path: join(shots, name), type: 'png' });
  console.log(`screenshots/${name}`);
}
await browser.close();

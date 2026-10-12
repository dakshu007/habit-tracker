// Renders the Play product icons (1024 x 1024, 32-bit PNG) into ../products/.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'products');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
for (const p of ['monthly', 'yearly', 'lifetime']) {
  await page.goto(`${pathToFileURL(join(here, 'product-icon.html')).href}?p=${p}`);
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode())]));
  await page.screenshot({ path: join(out, `${p}.png`), omitBackground: true });
  console.log(`products/${p}.png`);
}
await browser.close();

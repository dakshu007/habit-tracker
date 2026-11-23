// Submits every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam, Naver;
// Bing's index also feeds Yahoo, DuckDuckGo and ChatGPT search).
// Run after each deploy:  NODE_USE_ENV_PROXY=1 node scripts/indexnow.mjs
import { readdirSync } from 'node:fs';

const SITE = 'https://habbittrackz.netlify.app';
const keyFile = readdirSync(new URL('../public', import.meta.url)).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('IndexNow key file (public/<32 hex>.txt) not found');
const key = keyFile.replace('.txt', '');

const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${keyFile}`, urlList }),
});
console.log(`IndexNow: submitted ${urlList.length} URLs → HTTP ${res.status} ${res.statusText}`);
if (res.status >= 400) console.log(await res.text());

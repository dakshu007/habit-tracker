// Netlify build plugin: after every successful production deploy, send every URL
// in the sitemap to IndexNow (Bing, Yandex, Seznam, Naver; Bing also feeds Yahoo,
// DuckDuckGo and ChatGPT search). Never fails the deploy.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://habbittrackz.netlify.app';

export const onSuccess = async ({ constants }) => {
  if (process.env.CONTEXT && process.env.CONTEXT !== 'production') {
    console.log(`IndexNow: skipped (${process.env.CONTEXT} deploy)`);
    return;
  }
  try {
    const dir = constants.PUBLISH_DIR;
    const keyFile = readdirSync(dir).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
    if (!keyFile) return console.log('IndexNow: no key file in publish dir, skipped');
    const xml = readFileSync(join(dir, 'sitemap.xml'), 'utf8');
    const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(SITE).host, key: keyFile.replace('.txt', ''), keyLocation: `${SITE}/${keyFile}`, urlList }),
    });
    console.log(`IndexNow: submitted ${urlList.length} URLs → HTTP ${res.status}`);
  } catch (e) {
    console.log(`IndexNow: failed (${e.message}), deploy is unaffected`);
  }
};

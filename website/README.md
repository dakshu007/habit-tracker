# Habit Tracker website

Marketing site for the Android app, live at https://habbittrackz.netlify.app (Netlify project `habbittrackz`).
Astro 7, fully static. Rebuilt in Nov 2026 from the live site after the original source was lost.

## Run it
```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # writes dist/
```

## Where things live
- `src/config/site.ts`: prices, trial length, Play link, Search Console token. Change prices here only.
- `src/content/blog/*.md`: blog posts → `/blog/<file>`
- `src/content/features/*.md`: feature pages → `/<file>` (e.g. `/ai-coach`)
- `src/content/alternatives/*.md`: comparison pages → `/alternatives/<file>`
- `src/components/home/*`: landing page sections (ported markup; `data-astro-cid-*` attributes match `src/styles/site.css`)
- `src/legal/*.md`: privacy, terms, support
- `docs/app-facts.md`: code-verified app facts. Every claim on the site must match it.
- `docs/CONTENT_GUIDE.md`: voice rules and front matter schemas. Run `node scripts/check-content.mjs` after editing content.

## Deploy
Recommended: in Netlify, link the project to this GitHub repo with **base directory `website`** (build settings come from `netlify.toml`), so every push deploys.
Manual: `npm run build && npx netlify deploy --prod --dir=dist --site=habbittrackz`.

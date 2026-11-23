// Turns a paragraph that is only `[[cta]]` or `[[cta: Heading | Subtext]]` into
// the inline download box, so writers never hand-code the Play link.
const PLAY = 'https://play.google.com/store/apps/details?id=app.mykavo.habittracker';
const RE = /^\[\[cta(?::\s*([^|\]]*?)\s*(?:\|\s*([^\]]*?)\s*)?)?\]\]$/;

const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

export default function rehypeCta({ medium = 'article' } = {}) {
  return (tree, file) => {
    const path = String(file?.path ?? file?.history?.[0] ?? '');
    const from = path.includes('/blog/') ? 'blog' : path.includes('/alternatives/') ? 'compare' : path.includes('/features/') ? 'feature' : medium;
    const href = `${PLAY}&referrer=${encodeURIComponent(`utm_source=website&utm_medium=${from}`)}`;
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === 'element' && child.tagName === 'p' && child.children.length === 1 && child.children[0].type === 'text') {
          const m = RE.exec(child.children[0].value.trim());
          if (m) {
            const heading = m[1] || 'Turn this into a habit that sticks';
            const sub = m[2] || 'Habit Tracker gives every habit an illustrated card, streaks that forgive real life and an AI coach. Free for 7 days on Android.';
            return el('aside', { className: ['inline-cta'] }, [
              el('img', { src: '/img/icon.webp', alt: '', width: 58, height: 58, loading: 'lazy' }),
              el('div', {}, [el('b', {}, [text(heading)]), el('span', {}, [text(sub)])]),
              el('a', { className: ['btn', 'btn-dark'], href, rel: 'noopener', dataDownload: from }, [text('Download free')]),
            ]);
          }
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}

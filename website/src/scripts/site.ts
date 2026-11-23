import Lenis from 'lenis';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animations stay paused until the visitor interacts (keeps first paint calm and cheap).
const go = () => {
  root.classList.add('go');
  for (const e of ['pointermove', 'pointerdown', 'scroll', 'keydown', 'touchstart', 'wheel']) removeEventListener(e, go);
};
for (const e of ['pointermove', 'pointerdown', 'scroll', 'keydown', 'touchstart', 'wheel']) addEventListener(e, go, { passive: true, once: true });
setTimeout(go, 15000);

let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  const raf = (t: number) => {
    lenis!.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

// Same-page anchor links: smooth scroll below the floating nav.
document.querySelectorAll<HTMLAnchorElement>('a[href*="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(url.hash.slice(1));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -90 });
    else target.scrollIntoView({ behavior: 'auto' });
    history.replaceState(null, '', url.hash);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

// Nav background once scrolled; floating download button after the first screen.
const floatCta = document.querySelector<HTMLElement>('.float-cta');
let overFooter = false;
const onScroll = () => {
  root.classList.toggle('scrolled', scrollY > 24);
  floatCta?.classList.toggle('show', scrollY > innerHeight * 0.6 && !overFooter);
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();
const footer = document.querySelector('.footer');
if (footer && floatCta) {
  new IntersectionObserver(([entry]) => {
    overFooter = entry.isIntersecting;
    onScroll();
  }).observe(footer);
}

// Mobile menu.
const nav = document.querySelector('.nav');
const menu = document.querySelector('.menu');
function closeMenu() {
  nav?.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
  menu?.setAttribute('aria-label', 'Open menu');
}
menu?.addEventListener('click', () => {
  const open = !nav?.classList.contains('open');
  nav?.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

// Reveal on scroll.
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// "Try it" slide-to-complete demo.
document.querySelectorAll<HTMLElement>('[data-slide-demo]').forEach((demo) => {
  const range = demo.querySelector<HTMLInputElement>('input[type="range"]')!;
  const reset = demo.querySelector<HTMLButtonElement>('.reset')!;
  let raf = 0;
  const paint = () => demo.style.setProperty('--v', String(Number(range.value) / 100));
  const complete = () => {
    range.value = '100';
    paint();
    demo.classList.add('done');
    range.setAttribute('aria-valuetext', 'Completed');
    reset.hidden = false;
    navigator.vibrate?.(18);
  };
  const springBack = () => {
    if (demo.classList.contains('done')) return;
    cancelAnimationFrame(raf);
    const step = () => {
      const v = Number(range.value);
      if (v <= 0.5) {
        range.value = '0';
        paint();
      } else {
        range.value = String(v * 0.78);
        paint();
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
  };
  range.addEventListener('input', () => {
    if (demo.classList.contains('done')) {
      range.value = '100';
      return;
    }
    cancelAnimationFrame(raf);
    paint();
    if (Number(range.value) >= 96) complete();
  });
  range.addEventListener('change', springBack);
  range.addEventListener('pointerup', springBack);
  range.addEventListener('touchend', springBack, { passive: true });
  reset.addEventListener('click', () => {
    demo.classList.remove('done');
    range.removeAttribute('aria-valuetext');
    range.value = '0';
    paint();
    reset.hidden = true;
    range.focus();
  });
});

// FAQ accordions on content pages: only one open at a time per group.
document.querySelectorAll<HTMLDetailsElement>('details[data-group]').forEach((d) => {
  d.addEventListener('toggle', () => {
    if (!d.open) return;
    document.querySelectorAll<HTMLDetailsElement>(`details[data-group="${d.dataset.group}"]`).forEach((o) => o !== d && (o.open = false));
  });
});

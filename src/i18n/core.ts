import { getLocales } from 'expo-localization';

import { hi } from './hi';

/**
 * Tiny gettext-style i18n: the English string *is* the key, so untranslated
 * text simply falls back to English. Placeholders use {name}.
 *
 *   t('{n} habits to go', { n: 3 })
 *
 * The whole navigation tree remounts on language change (App.tsx keys it), so
 * plain t() calls during render always see the current language.
 */
export type Lang = 'en' | 'hi';

export const LANGUAGES: { id: 'system' | Lang; label: string; native: string }[] = [
  { id: 'system', label: 'System default', native: 'System' },
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

const dictionaries: Record<Lang, Record<string, string>> = { en: {}, hi };

export function resolveLang(pref: 'system' | Lang): Lang {
  if (pref !== 'system') return pref;
  const code = getLocales()[0]?.languageCode ?? 'en';
  return code in dictionaries ? (code as Lang) : 'en';
}

let current: Lang = 'en';

export function setLang(l: Lang) {
  current = l;
}

export function getLang(): Lang {
  return current;
}

export function t(text: string, vars?: Record<string, string | number>): string {
  const out = dictionaries[current][text] ?? text;
  if (!vars) return out;
  return out.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

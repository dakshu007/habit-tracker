import { useHabitStore } from '@/store/useHabitStore';
import { resolveLang, type Lang } from './core';

export * from './core';

/** Resolved language for the current preference (re-renders on change). */
export function useLang(): Lang {
  const pref = useHabitStore((s) => s.settings.language);
  return resolveLang(pref);
}

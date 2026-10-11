import { useMemo } from 'react';

import { useHabitStore } from './useHabitStore';
import { freeHabitIds, useUnlocked } from './useLicense';

/** The habits the free plan keeps usable (first 5 by creation). */
export function useFreeHabitIds(): Set<string> {
  const habits = useHabitStore((s) => s.habits);
  return useMemo(() => freeHabitIds(habits), [habits]);
}

/** Can this habit be logged right now (Pro, trial, or one of the free habits)? */
export function useCanLogHabit(id: string | undefined): boolean {
  const unlocked = useUnlocked();
  const free = useFreeHabitIds();
  return unlocked || (!!id && free.has(id));
}

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import { canLogHabit, isUnlocked } from '@/store/useLicense';
import { useHabitStore } from '@/store/useHabitStore';
import type { RootNav } from './types';

/**
 * For screens that need Pro. With a habit id, the free plan's habits pass too
 * (after the trial, the first 5 habits stay usable); without one, it's Pro only.
 */
export function useRequireUnlock(habitId?: string) {
  const navigation = useNavigation<RootNav>();
  useEffect(() => {
    const ok = habitId ? canLogHabit(useHabitStore.getState().habits, habitId) : isUnlocked();
    if (!ok) navigation.replace('Paywall');
  }, [navigation, habitId]);
}

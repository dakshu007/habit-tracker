import { useEffect } from 'react';
import * as StoreReview from 'expo-store-review';

import { useHabitStore } from '@/store/useHabitStore';
import { perfectDays, totalCompletions } from '@/logic/habits';

const MIN_CHECKINS = 15;
const MIN_PERFECT_DAYS = 3;
const COOLDOWN_DAYS = 120;

/**
 * Ask for a Play Store rating at a happy moment: after real use (15 check-ins
 * and 3 perfect days), right after a perfect-day celebration, at most every
 * 120 days. Google decides whether the sheet actually shows.
 */
export function useRatingPrompt() {
  const celebrateAt = useHabitStore((s) => s.celebrateAt);

  useEffect(() => {
    if (!celebrateAt) return;
    const { habits, logs, extras, markRatingAsked } = useHabitStore.getState();
    const last = extras.rating.askedAt ? new Date(extras.rating.askedAt).getTime() : 0;
    if (Date.now() - last < COOLDOWN_DAYS * 86_400_000) return;
    if (totalCompletions(habits, logs) < MIN_CHECKINS || perfectDays(habits, logs) < MIN_PERFECT_DAYS) return;
    const id = setTimeout(async () => {
      if (!(await StoreReview.hasAction().catch(() => false))) return;
      markRatingAsked();
      StoreReview.requestReview().catch(() => {});
    }, 3500); // let the confetti finish first
    return () => clearTimeout(id);
  }, [celebrateAt]);
}

import { useMemo } from 'react';

import { useHabitStore } from '@/store/useHabitStore';
import { computeAchievements, type Achievement } from './achievements';
import { colorThemes } from '@/data/themes';
import { profileStyles } from '@/data/profileStyles';

/** Ids of unlocked achievements (memoised from the store). */
export function useUnlockedAchievements(): Map<string, Achievement> {
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  return useMemo(() => new Map(computeAchievements({ habits, logs, today, weekStart }).map((a) => [a.id, a])), [habits, logs, today, weekStart]);
}

export function isUnlocked(unlock: string | undefined, all: Map<string, Achievement>): boolean {
  return !unlock || !!all.get(unlock)?.unlocked;
}

/** Rewards an achievement unlocks, for the badge sheet. */
export function rewardsFor(achievementId: string): string[] {
  return [
    ...colorThemes.filter((t) => t.unlock === achievementId).map((t) => `${t.name} habit theme`),
    ...profileStyles.filter((p) => p.unlock === achievementId).map((p) => `${p.name} profile card`),
  ];
}

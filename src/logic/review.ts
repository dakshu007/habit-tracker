import type { Habit, Logs } from '@/data/types';
import { completionRate, dayCompletion, isDoneOn, streakFor } from './habits';
import { dayKey, fromKey, shiftKey, startOfWeek } from '@/utils/date';

export interface WeekReview {
  start: string;
  end: string;
  avg: number; // 0..1
  checkins: number;
  bestDay: { key: string; value: number } | null;
  topStreak: { habit: Habit; days: number } | null;
  prevAvg: number;
  mood: number | null; // 1..4 average
  needsLove: Habit | null; // lowest completion habit this week
}

/** Summary of the most recent finished week (or the current one if `current`). */
export function buildReview(habits: Habit[], logs: Logs, today: string, weekStart: 0 | 1, current = false): WeekReview {
  const thisStart = dayKey(startOfWeek(fromKey(today), weekStart));
  const start = current ? thisStart : shiftKey(thisStart, -7);
  const keys = Array.from({ length: 7 }, (_, i) => shiftKey(start, i)).filter((k) => k <= today);
  const live = habits.filter((h) => !h.archived);

  const avgOf = (ks: string[]) => {
    const vals = ks.map((k) => dayCompletion(live, logs, k)).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  let checkins = 0;
  const moods: number[] = [];
  for (const k of keys) {
    for (const h of live) {
      if (isDoneOn(h, logs, k)) checkins++;
      const m = logs[k]?.[h.id]?.mood;
      if (m) moods.push(m);
    }
  }

  let bestDay: WeekReview['bestDay'] = null;
  for (const k of keys) {
    const v = dayCompletion(live, logs, k);
    if (v !== null && (!bestDay || v > bestDay.value)) bestDay = { key: k, value: v };
  }

  const end = keys[keys.length - 1] ?? start;
  let topStreak: WeekReview['topStreak'] = null;
  for (const h of live) {
    const s = streakFor(h, logs, end, weekStart);
    if (s.current > 0 && (!topStreak || s.current > topStreak.days)) topStreak = { habit: h, days: s.current };
  }

  let needsLove: Habit | null = null;
  let low = 2;
  for (const h of live) {
    if (h.quit) continue;
    const r = completionRate(h, logs, end, 7, weekStart);
    if (r < low) {
      low = r;
      needsLove = h;
    }
  }
  if (low >= 0.85) needsLove = null;

  const prevKeys = Array.from({ length: 7 }, (_, i) => shiftKey(start, i - 7));

  return {
    start,
    end,
    avg: avgOf(keys),
    checkins,
    bestDay,
    topStreak,
    prevAvg: avgOf(prevKeys),
    mood: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
    needsLove,
  };
}

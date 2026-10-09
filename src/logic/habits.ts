import type { Habit, Logs } from '@/data/types';
import { addDays, dayKey, fromKey, shiftKey, startOfWeek, weekKeys } from '@/utils/date';

/* ------------------------------------------------------------------ */
/* Basics                                                              */
/* ------------------------------------------------------------------ */

export function valueOn(logs: Logs, key: string, habitId: string): number {
  return logs[key]?.[habitId]?.value ?? 0;
}

export function lastUpdatedOn(logs: Logs, key: string, habitId: string): string | null {
  return logs[key]?.[habitId]?.at ?? null;
}

export function isDoneOn(h: Habit, logs: Logs, key: string): boolean {
  return valueOn(logs, key, h.id) >= h.goalValue;
}

export function createdKey(h: Habit): string {
  return dayKey(new Date(h.createdAt));
}

/** Whether the habit is due on this specific day (weekly habits: any day counts). */
export function isScheduledOn(h: Habit, key: string): boolean {
  if (h.schedule.kind === 'daily' || h.schedule.kind === 'weekly') return true;
  return h.schedule.days.includes(fromKey(key).getDay() as never);
}

/** Day-level habits ("Today's tasks") due on `key`. */
export function dueOn(habits: Habit[], key: string): Habit[] {
  return habits.filter((h) => !h.archived && h.schedule.kind !== 'weekly' && isScheduledOn(h, key));
}

export function weeklyHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => !h.archived && h.schedule.kind === 'weekly');
}

/** Completed sessions for a weekly habit in the week containing `key`. */
export function weekSessions(h: Habit, logs: Logs, key: string, weekStart: 0 | 1): number {
  return weekKeys(fromKey(key), weekStart).filter((k) => isDoneOn(h, logs, k)).length;
}

export function weeklyTarget(h: Habit): number {
  return h.schedule.kind === 'weekly' ? h.schedule.timesPerWeek : 7;
}

/* ------------------------------------------------------------------ */
/* Streaks                                                             */
/* ------------------------------------------------------------------ */

export interface Streak {
  current: number;
  best: number;
  /** "day" for daily/day-of-week habits, "week" for weekly targets. */
  unit: 'day' | 'week';
}

const MAX_SCAN_DAYS = 3 * 366;

/** Earliest day worth scanning: creation day or the first logged day, whichever is earlier. */
function firstRelevantKey(h: Habit, logs: Logs): string {
  let first = createdKey(h);
  for (const k of Object.keys(logs)) {
    if (k < first && logs[k][h.id]) first = k;
  }
  return first;
}

export function streakFor(h: Habit, logs: Logs, today: string, weekStart: 0 | 1): Streak {
  const start = firstRelevantKey(h, logs);

  if (h.schedule.kind === 'weekly') {
    const target = h.schedule.timesPerWeek;
    const met = (wkStartKey: string) =>
      weekKeys(fromKey(wkStartKey), weekStart).filter((k) => isDoneOn(h, logs, k)).length >= target;

    const thisWeek = dayKey(startOfWeek(fromKey(today), weekStart));
    const firstWeek = dayKey(startOfWeek(fromKey(start), weekStart));

    // Current: this week counts if already met, otherwise it's still open.
    let current = met(thisWeek) ? 1 : 0;
    for (let w = shiftKey(thisWeek, -7); w >= firstWeek; w = shiftKey(w, -7)) {
      if (!met(w)) break;
      current++;
    }
    let best = 0;
    let run = 0;
    for (let w = firstWeek; w <= thisWeek; w = shiftKey(w, 7)) {
      if (met(w)) best = Math.max(best, ++run);
      else if (w !== thisWeek) run = 0;
    }
    return { current, best: Math.max(best, current), unit: 'week' };
  }

  // Day-based: unscheduled days are skipped; today never breaks a streak.
  let current = 0;
  let cursor = fromKey(today);
  for (let i = 0; i < MAX_SCAN_DAYS; i++) {
    const k = dayKey(cursor);
    if (k < start) break;
    if (isScheduledOn(h, k)) {
      if (isDoneOn(h, logs, k)) current++;
      else if (k !== today) break;
    }
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  for (let k = start, i = 0; k <= today && i < MAX_SCAN_DAYS; k = shiftKey(k, 1), i++) {
    if (!isScheduledOn(h, k)) continue;
    if (isDoneOn(h, logs, k)) best = Math.max(best, ++run);
    else if (k !== today) run = 0;
  }
  return { current, best: Math.max(best, current), unit: 'day' };
}

/* ------------------------------------------------------------------ */
/* Rates & aggregates                                                  */
/* ------------------------------------------------------------------ */

/** Share of scheduled opportunities completed over the last `days` days (ending today). */
export function completionRate(h: Habit, logs: Logs, today: string, days: number, weekStart: 0 | 1): number {
  const start = firstRelevantKey(h, logs);
  if (h.schedule.kind === 'weekly') {
    const weeks = Math.max(1, Math.round(days / 7));
    const target = h.schedule.timesPerWeek;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < weeks; i++) {
      const ref = shiftKey(today, -7 * i);
      if (weekKeys(fromKey(ref), weekStart)[6] < start) break;
      sum += Math.min(1, weekSessions(h, logs, ref, weekStart) / target);
      n++;
    }
    return n ? sum / n : 0;
  }
  let due = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const k = shiftKey(today, -i);
    if (k < start) break;
    if (!isScheduledOn(h, k)) continue;
    // Today only counts once it's done (it isn't "missed" yet).
    if (k === today && !isDoneOn(h, logs, k)) continue;
    due++;
    if (isDoneOn(h, logs, k)) done++;
  }
  return due ? done / due : 0;
}

/** Fraction of day-level habits done on `key` (null when nothing was due). */
export function dayCompletion(habits: Habit[], logs: Logs, key: string): number | null {
  const due = dueOn(habits, key).filter((h) => key >= createdKey(h) || logs[key]?.[h.id]);
  if (!due.length) return null;
  return due.filter((h) => isDoneOn(h, logs, key)).length / due.length;
}

export function totalCompletions(habits: Habit[], logs: Logs): number {
  const byId = new Map(habits.map((h) => [h.id, h]));
  let n = 0;
  for (const day of Object.values(logs)) {
    for (const [id, e] of Object.entries(day)) {
      const h = byId.get(id);
      if (h && e.value >= h.goalValue) n++;
    }
  }
  return n;
}

export function perfectDays(habits: Habit[], logs: Logs): number {
  return Object.keys(logs).filter((k) => dayCompletion(habits, logs, k) === 1).length;
}

/** Longest current streak across all habits — the headline "🔥" number. */
export function bestCurrentStreak(habits: Habit[], logs: Logs, today: string, weekStart: 0 | 1) {
  let best: { habit: Habit; streak: Streak } | null = null;
  for (const h of habits) {
    if (h.archived) continue;
    const s = streakFor(h, logs, today, weekStart);
    if (!best || s.current > best.streak.current) best = { habit: h, streak: s };
  }
  return best;
}

/** Per-day completion fractions for the last `n` days (oldest first). */
export function recentDays(habits: Habit[], logs: Logs, today: string, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const k = shiftKey(today, i - (n - 1));
    return { key: k, value: dayCompletion(habits, logs, k) };
  });
}

/* ------------------------------------------------------------------ */
/* XP / levels (light gamification)                                    */
/* ------------------------------------------------------------------ */

export function xpFor(habits: Habit[], logs: Logs): number {
  return totalCompletions(habits, logs) * 10 + perfectDays(habits, logs) * 25;
}

/** Level n needs 100·n(n−1)/2 XP in total: 0, 100, 300, 600, 1000… */
export function levelFor(xp: number) {
  const level = Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
  const floor = (100 * level * (level - 1)) / 2;
  const next = (100 * (level + 1) * level) / 2;
  return { level, into: xp - floor, span: next - floor };
}

export const LEVEL_TITLES = ['Seedling', 'Sprout', 'Bloom', 'Grower', 'Steady', 'Committed', 'Relentless', 'Unstoppable', 'Legend'];

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, level - 1)];
}

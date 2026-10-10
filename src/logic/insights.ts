import type { Habit, Logs } from '@/data/types';
import { createdKey, dayCompletion, isDoneOn, isExcused, isScheduledOn, REST_KEY, valueOn } from '@/logic/habits';
import { shiftKey } from '@/utils/date';

/**
 * Personal insights from the user's own history. Pure functions; every claim
 * needs enough days on both sides so we never "discover" noise.
 */

export type Insight =
  | { kind: 'sleep'; habit: Habit; minutes: number; withDays: number; withoutDays: number }
  | { kind: 'mood'; habit: Habit; diff: number; withMood: number; withoutMood: number }
  | { kind: 'pair'; habit: Habit; other: Habit; withRate: number; withoutRate: number };

const MIN_SAMPLES = 5;
const HOURS = ['hours', 'hour', 'hrs', 'hr', 'h'];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Day keys from `from` to `to` inclusive. */
function span(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = shiftKey(k, 1)) out.push(k);
  return out;
}

/** Days the habit was due and not excused, since it was created (up to `today`, excluding today). */
function dueDays(h: Habit, logs: Logs, days: string[]): string[] {
  const born = createdKey(h);
  return days.filter((k) => k >= born && isScheduledOn(h, k) && !isExcused(h, logs, k));
}

function sleepHabitOf(habits: Habit[]): Habit | undefined {
  const live = habits.filter((h) => !h.archived && HOURS.includes(h.unit.toLowerCase()));
  return live.find((h) => h.phoneSleep) ?? live.find((h) => h.sync === 'sleep-h') ?? live.find((h) => h.artId === 'aura-moon');
}

function dayMood(logs: Logs, k: string): number | null {
  const moods = Object.entries(logs[k] ?? {})
    .filter(([id, e]) => id !== REST_KEY && e.mood)
    .map(([, e]) => e.mood!);
  return moods.length ? mean(moods) : null;
}

/** All insights worth showing, strongest first. Looks back `window` days. */
export function findInsights(habits: Habit[], logs: Logs, today: string, window = 90): Insight[] {
  const days = span(shiftKey(today, -window), shiftKey(today, -1));
  const active = habits.filter((h) => !h.archived && !h.quit && h.schedule.kind !== 'weekly');
  const out: { score: number; insight: Insight }[] = [];

  // 1. Sleep the night after doing a habit ("you sleep 40 min more on days you work out").
  const sleep = sleepHabitOf(habits);
  if (sleep) {
    for (const h of active) {
      if (h.id === sleep.id) continue;
      const withH: number[] = [];
      const without: number[] = [];
      for (const k of dueDays(h, logs, days)) {
        const night = valueOn(logs, shiftKey(k, 1), sleep.id); // sleep is logged on the wake-up day
        if (night <= 0) continue;
        (isDoneOn(h, logs, k) ? withH : without).push(night);
      }
      if (withH.length < MIN_SAMPLES || without.length < MIN_SAMPLES) continue;
      const minutes = Math.round((mean(withH) - mean(without)) * 60);
      if (Math.abs(minutes) >= 15) out.push({ score: Math.abs(minutes) / 5, insight: { kind: 'sleep', habit: h, minutes, withDays: withH.length, withoutDays: without.length } });
    }
  }

  // 2. Mood on days with vs without a habit.
  for (const h of active) {
    const withH: number[] = [];
    const without: number[] = [];
    for (const k of dueDays(h, logs, days)) {
      const m = dayMood(logs, k);
      if (m == null) continue;
      (isDoneOn(h, logs, k) ? withH : without).push(m);
    }
    if (withH.length < MIN_SAMPLES || without.length < 3) continue;
    const diff = mean(withH) - mean(without);
    if (diff >= 0.4) out.push({ score: diff * 6, insight: { kind: 'mood', habit: h, diff, withMood: mean(withH), withoutMood: mean(without) } });
  }

  // 3. Habits that pull each other along.
  for (const a of active) {
    for (const b of active) {
      if (a.id === b.id) continue;
      const both = dueDays(a, logs, days).filter((k) => isScheduledOn(b, k) && k >= createdKey(b));
      const withA = both.filter((k) => isDoneOn(a, logs, k));
      const withoutA = both.filter((k) => !isDoneOn(a, logs, k));
      if (withA.length < MIN_SAMPLES || withoutA.length < MIN_SAMPLES) continue;
      const withRate = withA.filter((k) => isDoneOn(b, logs, k)).length / withA.length;
      const withoutRate = withoutA.filter((k) => isDoneOn(b, logs, k)).length / withoutA.length;
      if (withRate - withoutRate >= 0.25 && withRate >= 0.5) out.push({ score: (withRate - withoutRate) * 8, insight: { kind: 'pair', habit: a, other: b, withRate, withoutRate } });
    }
  }

  // Keep the strongest, at most one pair per "lead" habit.
  out.sort((x, y) => y.score - x.score);
  const seen = new Set<string>();
  return out
    .filter(({ insight }) => {
      // One insight per habit and kind; a pair counts once whichever way round.
      const key = insight.kind === 'pair' ? `pair:${[insight.habit.id, insight.other.id].sort().join('+')}` : `${insight.kind}:${insight.habit.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((x) => x.insight);
}

/* ------------------------------------------------------------------ */
/* Best time of day                                                    */
/* ------------------------------------------------------------------ */

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export interface BestTime {
  habit: Habit;
  part: DayPart;
  /** Share of completions in that part of the day (0–1). */
  share: number;
  /** Typical completion time, minutes after midnight. */
  typical: number;
  samples: number;
}

/**
 * When each habit usually gets finished, from the time of the completing log.
 * Auto-tracked habits are skipped (their times are sync times, not yours).
 */
export function bestTimes(habits: Habit[], logs: Logs, today: string, window = 60): BestTime[] {
  const days = span(shiftKey(today, -window), today);
  const out: BestTime[] = [];
  for (const h of habits) {
    if (h.archived || h.sync || h.phoneSleep || h.quit) continue;
    const mins: number[] = [];
    for (const k of days) {
      const e = logs[k]?.[h.id];
      if (!e || e.value < h.goalValue || !e.at || e.frozen) continue;
      const d = new Date(e.at);
      // Only count completions made on the day itself.
      if (Number.isNaN(d.getTime())) continue;
      mins.push(d.getHours() * 60 + d.getMinutes());
    }
    if (mins.length < 4) continue;
    const counts: Record<DayPart, number[]> = { morning: [], afternoon: [], evening: [], night: [] };
    for (const m of mins) counts[dayPart(Math.floor(m / 60))].push(m);
    const [part, list] = (Object.entries(counts) as [DayPart, number[]][]).sort((a, b) => b[1].length - a[1].length)[0];
    const sorted = [...list].sort((a, b) => a - b);
    out.push({ habit: h, part, share: list.length / mins.length, typical: sorted[Math.floor(sorted.length / 2)], samples: mins.length });
  }
  return out.sort((a, b) => b.share - a.share);
}

/* ------------------------------------------------------------------ */
/* Year in review                                                      */
/* ------------------------------------------------------------------ */

export interface YearReview {
  year: number;
  /** Days covered (Jan 1 → today or Dec 31). */
  days: string[];
  checkins: number;
  perfectDays: number;
  activeDays: number;
  /** Longest run of days where everything due was done (rest days don't break it). */
  longestPerfectRun: number;
  topHabit: { habit: Habit; done: number } | null;
  mostConsistent: { habit: Habit; rate: number } | null;
  bestMonth: { month: number; rate: number } | null;
  /** 0 = Sunday … 6 = Saturday. */
  bestWeekday: { day: number; rate: number } | null;
  moods: [number, number, number, number];
  /** day key → completion (null = nothing due). */
  heat: Record<string, number | null>;
}

export function yearReview(habits: Habit[], logs: Logs, year: number, today: string): YearReview {
  const end = `${year}-12-31` < today ? `${year}-12-31` : today;
  const days = span(`${year}-01-01`, end);
  const heat: Record<string, number | null> = {};
  let perfect = 0;
  let run = 0;
  let longest = 0;
  let active = 0;
  const monthAcc: { sum: number; n: number }[] = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
  const dowAcc: { sum: number; n: number }[] = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  for (const k of days) {
    const f = dayCompletion(habits, logs, k);
    heat[k] = f;
    if (f === 1) {
      perfect++;
      longest = Math.max(longest, ++run);
    } else if (f !== null) run = 0;
    if (f !== null) {
      const d = new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)));
      monthAcc[d.getMonth()].sum += f;
      monthAcc[d.getMonth()].n++;
      dowAcc[d.getDay()].sum += f;
      dowAcc[d.getDay()].n++;
      if (f > 0) active++;
    }
  }

  let checkins = 0;
  const doneBy = new Map<string, number>();
  const moods: [number, number, number, number] = [0, 0, 0, 0];
  for (const k of days) {
    for (const [id, e] of Object.entries(logs[k] ?? {})) {
      if (id === REST_KEY) continue;
      const h = habits.find((x) => x.id === id);
      if (h && e.value >= h.goalValue) {
        checkins++;
        doneBy.set(id, (doneBy.get(id) ?? 0) + 1);
      }
      if (e.mood) moods[e.mood - 1]++;
    }
  }

  const top = [...doneBy.entries()].sort((a, b) => b[1] - a[1])[0];
  const topHabit = top ? { habit: habits.find((h) => h.id === top[0])!, done: top[1] } : null;

  let mostConsistent: YearReview['mostConsistent'] = null;
  for (const h of habits) {
    if (h.schedule.kind === 'weekly' || h.quit) continue;
    const due = dueDays(h, logs, days);
    if (due.length < 14) continue;
    const rate = due.filter((k) => isDoneOn(h, logs, k)).length / due.length;
    if (!mostConsistent || rate > mostConsistent.rate) mostConsistent = { habit: h, rate };
  }

  const bestMonth = bestOf(monthAcc, 7);
  const bestDow = bestOf(dowAcc, 3);

  return {
    year,
    days,
    checkins,
    perfectDays: perfect,
    activeDays: active,
    longestPerfectRun: longest,
    topHabit,
    mostConsistent,
    bestMonth: bestMonth && { month: bestMonth.i, rate: bestMonth.rate },
    bestWeekday: bestDow && { day: bestDow.i, rate: bestDow.rate },
    moods,
    heat,
  };
}

/** Index with the highest average, among buckets with at least `min` days. */
function bestOf(acc: { sum: number; n: number }[], min: number): { i: number; rate: number } | null {
  let bi = -1;
  let br = -1;
  acc.forEach((a, i) => {
    if (a.n < min) return;
    const r = a.sum / a.n;
    if (r > br) {
      br = r;
      bi = i;
    }
  });
  return bi < 0 ? null : { i: bi, rate: br };
}

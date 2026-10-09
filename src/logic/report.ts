import type { Habit, Logs, RunSummary } from '@/data/types';
import { createdKey, dayCompletion, isDoneOn, isExcused, isRestDay, isScheduledOn, REST_KEY, valueOn } from '@/logic/habits';

/** Everything the monthly report shows — pure, so it can be tested. */
export interface MonthReport {
  year: number;
  /** 0–11 */
  month: number;
  /** Day keys from the 1st up to today (or the month's end). */
  days: { key: string; frac: number | null; rest: boolean }[];
  /** Average day completion over days that had something due (0–1). */
  completion: number;
  perfectDays: number;
  restDays: number;
  checkins: number;
  /** Longest run of consecutive perfect days inside the month. */
  bestRun: number;
  habits: HabitRow[];
  /** Mood check-ins: index 0 = low … 3 = great. */
  moods: [number, number, number, number];
  runs: { count: number; metres: number; movingMs: number; longest: number };
}

export interface HabitRow {
  id: string;
  title: string;
  unit: string;
  goal: number;
  done: number;
  due: number;
  rate: number;
  total: number;
}

const pad = (n: number) => `${n}`.padStart(2, '0');
export const monthKey = (year: number, month: number) => `${year}-${pad(month + 1)}`;

export function monthReport(habits: Habit[], logs: Logs, runs: RunSummary[], year: number, month: number, today: string): MonthReport {
  const last = new Date(year, month + 1, 0).getDate();
  const keys: string[] = [];
  for (let d = 1; d <= last; d++) {
    const k = `${year}-${pad(month + 1)}-${pad(d)}`;
    if (k > today) break;
    keys.push(k);
  }

  const days = keys.map((key) => ({ key, frac: dayCompletion(habits, logs, key), rest: isRestDay(logs, key) }));
  const scored = days.filter((d) => d.frac !== null);
  const completion = scored.length ? scored.reduce((s, d) => s + (d.frac ?? 0), 0) / scored.length : 0;

  let bestRun = 0;
  let cur = 0;
  for (const d of days) {
    if (d.frac === 1) bestRun = Math.max(bestRun, ++cur);
    else if (!d.rest) cur = 0;
  }

  const rows: HabitRow[] = habits
    .filter((h) => !h.archived || keys.some((k) => logs[k]?.[h.id]))
    .map((h) => {
      const live = keys.filter((k) => k >= createdKey(h));
      const done = live.filter((k) => isDoneOn(h, logs, k)).length;
      const total = live.reduce((s, k) => s + valueOn(logs, k, h.id), 0);
      let due: number;
      if (h.schedule.kind === 'weekly') due = Math.max(1, Math.round((h.schedule.timesPerWeek * live.length) / 7));
      else due = live.filter((k) => isScheduledOn(h, k) && !isExcused(h, logs, k)).length;
      return { id: h.id, title: h.title, unit: h.unit, goal: h.goalValue, done, due, rate: due ? Math.min(1, done / due) : 0, total: Math.round(total * 100) / 100 };
    })
    .filter((r) => r.due > 0 || r.total > 0)
    .sort((a, b) => b.rate - a.rate);

  const moods: [number, number, number, number] = [0, 0, 0, 0];
  let checkins = 0;
  for (const k of keys) {
    for (const [id, e] of Object.entries(logs[k] ?? {})) {
      if (id === REST_KEY) continue;
      const h = habits.find((x) => x.id === id);
      if (h && e.value >= h.goalValue) checkins++;
      if (e.mood) moods[e.mood - 1]++;
    }
  }

  const from = new Date(year, month, 1).getTime();
  const to = new Date(year, month + 1, 1).getTime();
  const inMonth = runs.filter((r) => r.startedAt >= from && r.startedAt < to);

  return {
    year,
    month,
    days,
    completion,
    perfectDays: days.filter((d) => d.frac === 1).length,
    restDays: days.filter((d) => d.rest).length,
    checkins,
    bestRun,
    habits: rows,
    moods,
    runs: {
      count: inMonth.length,
      metres: inMonth.reduce((s, r) => s + r.distance, 0),
      movingMs: inMonth.reduce((s, r) => s + r.movingMs, 0),
      longest: inMonth.reduce((m, r) => Math.max(m, r.distance), 0),
    },
  };
}

const csvCell = (v: string | number | undefined) => {
  const s = v === undefined ? '' : `${v}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const MOOD = ['', 'low', 'okay', 'good', 'great'];

/** Every log entry in the month as CSV (opens in Sheets / Excel). */
export function monthCsv(habits: Habit[], logs: Logs, year: number, month: number): string {
  const prefix = monthKey(year, month);
  const byId = new Map(habits.map((h) => [h.id, h]));
  const rows = [['Date', 'Habit', 'Value', 'Unit', 'Goal', 'Done', 'Mood', 'Note', 'Source']];
  for (const key of Object.keys(logs).filter((k) => k.startsWith(prefix)).sort()) {
    if (isRestDay(logs, key)) rows.push([key, 'Rest day', '', '', '', '', '', '', '']);
    for (const [id, e] of Object.entries(logs[key])) {
      const h = byId.get(id);
      if (!h) continue;
      rows.push([
        key,
        h.title,
        `${e.value}`,
        h.unit,
        `${h.goalValue}`,
        e.value >= h.goalValue ? 'yes' : 'no',
        e.mood ? MOOD[e.mood] : '',
        e.note ?? '',
        e.frozen ? 'streak freeze' : e.synced ? 'auto' : 'manual',
      ]);
    }
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

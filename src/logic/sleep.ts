/**
 * Sleep from phone use: inside the bedtime window, stretches with the screen
 * off count as sleep. Pure functions — the screen events come from
 * modules/device-signals.
 */

export interface ScreenEvent {
  time: number;
  on: boolean;
}

export interface SleepResult {
  /** Minutes asleep (screen off, in real stretches). */
  minutes: number;
  /** Epoch ms of the first real stretch, or null. */
  asleepAt: number | null;
  /** Epoch ms the last real stretch ended, or null. */
  wokeAt: number | null;
}

/** Glancing at the phone for less than this doesn't end a sleep stretch. */
export const GLANCE_MIN = 2;
/** Screen-off stretches shorter than this aren't sleep (phone just set down). */
export const MIN_STRETCH_MIN = 20;
/** How far before bedtime we look to know whether the screen was already off. */
export const LOOKBACK_MS = 6 * 3_600_000;

const MIN = 60_000;

/**
 * The bedtime window that ends on `dayKey`'s morning (or the same day when
 * bedtime is after midnight). Returns epoch ms [start, end).
 */
export function sleepWindow(dayKey: string, bed: number, wake: number): [number, number] {
  const [y, m, d] = dayKey.split('-').map(Number);
  const end = new Date(y, m - 1, d, 0, wake).getTime();
  const crosses = bed > wake;
  const start = new Date(y, m - 1, d - (crosses ? 1 : 0), 0, bed).getTime();
  return [start, end];
}

/**
 * Sleep inside [start, end) from screen on/off events (any order, may begin
 * before `start`). Returns null when there's no screen data to judge by.
 */
export function detectSleep(events: ScreenEvent[], start: number, end: number): SleepResult | null {
  if (end <= start) return null;
  const evs = [...events].sort((a, b) => a.time - b.time);
  if (!evs.length) return null;

  // Screen state at `start`: the last event before it, else the opposite of the first one after.
  const before = evs.filter((e) => e.time <= start);
  const after = evs.filter((e) => e.time > start && e.time < end);
  let on = before.length ? before[before.length - 1].on : !after[0]?.on;
  if (!before.length && !after.length) return null;

  // Screen-off intervals clipped to the window.
  const offs: [number, number][] = [];
  let since = start;
  for (const e of after) {
    if (e.on === on) continue; // duplicate event
    if (!on) offs.push([since, e.time]);
    on = e.on;
    since = e.time;
  }
  if (!on) offs.push([since, end]);

  // Bridge short glances, then keep only real stretches.
  const merged: [number, number][] = [];
  for (const iv of offs) {
    const last = merged[merged.length - 1];
    if (last && iv[0] - last[1] < GLANCE_MIN * MIN) last[1] = iv[1];
    else merged.push([iv[0], iv[1]]);
  }
  const real = merged.filter(([a, b]) => b - a >= MIN_STRETCH_MIN * MIN);
  if (!real.length) return { minutes: 0, asleepAt: null, wokeAt: null };
  const minutes = Math.round(real.reduce((m, [a, b]) => m + (b - a), 0) / MIN);
  return { minutes, asleepAt: real[0][0], wokeAt: real[real.length - 1][1] };
}

/** Units a sleep habit can be measured in. */
export function sleepValue(unit: string, r: SleepResult, start: number): number {
  const u = unit.toLowerCase();
  if (['hours', 'hour', 'hrs', 'hr', 'h'].includes(u)) return Math.round((r.minutes / 60) * 10) / 10;
  if (['min', 'mins', 'minutes'].includes(u)) return r.minutes;
  // "night"-style habits (e.g. Sleep Early): done if asleep within 30 min of bedtime and slept 3h+.
  return r.asleepAt != null && r.asleepAt - start <= 30 * MIN && r.minutes >= 180 ? 1 : 0;
}

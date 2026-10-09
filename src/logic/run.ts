import type { Habit, Run, RunPoint } from '@/data/types';

/** A raw GPS fix as delivered by the location service. */
export interface Fix {
  lng: number;
  lat: number;
  /** Epoch ms. */
  time: number;
  /** Horizontal accuracy in metres (lower is better). */
  accuracy?: number | null;
}

/** A run being recorded. Lives in the run store so it survives the app being closed. */
export interface LiveRun {
  id: string;
  habitId?: string;
  startedAt: number;
  status: 'running' | 'paused';
  points: RunPoint[];
  gaps: number[];
  distance: number;
  /** Moving time banked before the current stretch, ms. */
  movingMs: number;
  /** Epoch ms the current stretch started (null while paused). */
  resumedAt: number | null;
  splits: number[];
  /** The next accepted fix starts a new stretch (first fix, or after a pause). */
  fresh: boolean;
}

/** Fixes worse than this are GPS noise. */
export const MAX_ACCURACY_M = 30;
/** Ignore jitter while standing still. */
export const MIN_STEP_M = 3;
/** Faster than ~43 km/h on foot is a GPS jump. */
export const MAX_SPEED_MS = 12;

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function newLiveRun(id: string, now: number, habitId?: string): LiveRun {
  return { id, habitId, startedAt: now, status: 'running', points: [], gaps: [], distance: 0, movingMs: 0, resumedAt: now, splits: [], fresh: true };
}

/** Moving time so far, ms. */
export function movingTime(run: Pick<LiveRun, 'movingMs' | 'resumedAt' | 'status'>, now: number): number {
  return run.movingMs + (run.status === 'running' && run.resumedAt ? Math.max(0, now - run.resumedAt) : 0);
}

/**
 * Fold new GPS fixes into a live run: drops inaccurate fixes, standing-still
 * jitter and impossible jumps; adds distance and records kilometre splits.
 * Returns the same object when nothing changed.
 */
export function addFixes(run: LiveRun, fixes: Fix[]): LiveRun {
  if (run.status !== 'running' || !run.resumedAt) return run;
  let next: LiveRun | null = null;
  for (const f of [...fixes].sort((a, b) => a.time - b.time)) {
    const cur: LiveRun = next ?? run;
    if (f.time < (cur.resumedAt ?? 0) - 1000) continue; // stale fix from before (re)start
    if (f.accuracy != null && f.accuracy > MAX_ACCURACY_M) continue;
    const t = Math.round((f.time - cur.startedAt) / 100) / 10;
    const point: RunPoint = [round6(f.lng), round6(f.lat), t];

    if (cur.fresh || !cur.points.length) {
      next = {
        ...cur,
        points: [...cur.points, point],
        gaps: cur.points.length ? [...cur.gaps, cur.points.length] : cur.gaps,
        fresh: false,
      };
      continue;
    }
    const last = cur.points[cur.points.length - 1];
    const d = haversine(last[0], last[1], point[0], point[1]);
    const dt = point[2] - last[2];
    if (d < MIN_STEP_M) continue;
    if (dt <= 0 || d / dt > MAX_SPEED_MS) continue;

    const distance = cur.distance + d;
    const splits = [...cur.splits];
    const moving = cur.movingMs + Math.max(0, f.time - (cur.resumedAt ?? f.time));
    while (Math.floor(distance / 1000) > splits.length) splits.push(moving);
    next = { ...cur, points: [...cur.points, point], distance, splits };
  }
  return next ?? run;
}

export function pauseRun(run: LiveRun, now: number): LiveRun {
  if (run.status !== 'running') return run;
  return { ...run, status: 'paused', movingMs: movingTime(run, now), resumedAt: null };
}

export function resumeRun(run: LiveRun, now: number): LiveRun {
  if (run.status !== 'paused') return run;
  return { ...run, status: 'running', resumedAt: now, fresh: true };
}

export function finishRun(run: LiveRun, now: number): Run {
  return {
    id: run.id,
    habitId: run.habitId,
    startedAt: run.startedAt,
    endedAt: now,
    movingMs: movingTime(run, now),
    distance: Math.round(run.distance),
    points: run.points,
    gaps: run.gaps,
    splits: run.splits,
  };
}

/* ------------------------------------------------------------------ */
/* Pace & formatting                                                   */
/* ------------------------------------------------------------------ */

/** Seconds per km, or null when there isn't enough distance yet. */
export function paceSecPerKm(ms: number, metres: number): number | null {
  if (metres < 20 || ms <= 0) return null;
  return ms / 1000 / (metres / 1000);
}

/** Pace over roughly the last `windowSec` seconds of the current stretch. */
export function currentPace(points: RunPoint[], gaps: number[], windowSec = 30): number | null {
  if (points.length < 2) return null;
  const start = gaps.length ? gaps[gaps.length - 1] : 0;
  const end = points.length - 1;
  const lastT = points[end][2];
  let d = 0;
  let i = end;
  while (i > start && lastT - points[i - 1][2] <= windowSec) {
    d += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    i--;
  }
  const dt = lastT - points[i][2];
  if (d < 15 || dt <= 0) return null;
  return dt / (d / 1000);
}

/** "5:42" per km; "–:––" when unknown. */
export function fmtPace(secPerKm: number | null): string {
  if (secPerKm == null || !isFinite(secPerKm) || secPerKm > 3600) return '–:––';
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${`${s % 60}`.padStart(2, '0')}`;
}

/** "12:05" or "1:02:05". */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = `${s % 60}`.padStart(2, '0');
  return h ? `${h}:${`${m}`.padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "3.42" (km, two decimals). */
export function fmtKm(metres: number): string {
  return (Math.floor(metres / 10) / 100).toFixed(2);
}

/** Per-kilometre split durations (ms), plus the partial last one. */
export function splitDurations(run: Pick<Run, 'splits' | 'movingMs' | 'distance'>): { km: number; ms: number; partial?: number }[] {
  const out: { km: number; ms: number; partial?: number }[] = run.splits.map((at, i) => ({ km: i + 1, ms: at - (run.splits[i - 1] ?? 0) }));
  const rest = run.distance - run.splits.length * 1000;
  if (rest >= 100) {
    const ms = run.movingMs - (run.splits[run.splits.length - 1] ?? 0);
    out.push({ km: run.splits.length + 1, ms: ms / (rest / 1000), partial: rest / 1000 });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Map geometry                                                        */
/* ------------------------------------------------------------------ */

/** Points split into stretches (pauses break the line). */
export function stretches(points: RunPoint[], gaps: number[]): RunPoint[][] {
  const cuts = [0, ...gaps, points.length];
  const out: RunPoint[][] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const s = points.slice(cuts[i], cuts[i + 1]);
    if (s.length) out.push(s);
  }
  return out;
}

/**
 * The route as short line pieces, each tagged with `rel` = its speed relative
 * to the run's average (≈0.7 slow … ≈1.3 fast), for pace colouring on the map.
 */
export function routeGeoJSON(points: RunPoint[], gaps: number[], chunk = 6): GeoJSON.FeatureCollection<GeoJSON.LineString, { rel: number }> {
  const parts: { coords: number[][]; d: number; dt: number }[] = [];
  let totalD = 0;
  let totalT = 0;
  for (const s of stretches(points, gaps)) {
    for (let i = 0; i < s.length - 1; i += chunk) {
      const piece = s.slice(i, Math.min(s.length, i + chunk + 1));
      let d = 0;
      for (let j = 1; j < piece.length; j++) d += haversine(piece[j - 1][0], piece[j - 1][1], piece[j][0], piece[j][1]);
      const dt = piece[piece.length - 1][2] - piece[0][2];
      parts.push({ coords: piece.map((p) => [p[0], p[1]]), d, dt });
      totalD += d;
      totalT += dt;
    }
  }
  const avg = totalT > 0 ? totalD / totalT : 0;
  return {
    type: 'FeatureCollection',
    features: parts.map((p) => ({
      type: 'Feature',
      properties: { rel: avg > 0 && p.dt > 0 ? Math.round((p.d / p.dt / avg) * 100) / 100 : 1 },
      geometry: { type: 'LineString', coordinates: p.coords },
    })),
  };
}

/** Where each whole kilometre was reached along the route. */
export function kmMarkers(points: RunPoint[], gaps: number[]): { km: number; at: [number, number] }[] {
  const out: { km: number; at: [number, number] }[] = [];
  let d = 0;
  for (const s of stretches(points, gaps)) {
    for (let i = 1; i < s.length; i++) {
      d += haversine(s[i - 1][0], s[i - 1][1], s[i][0], s[i][1]);
      if (Math.floor(d / 1000) > out.length) out.push({ km: out.length + 1, at: [s[i][0], s[i][1]] });
    }
  }
  return out;
}

/** [west, south, east, north], or null for an empty route. */
export function bounds(points: RunPoint[]): [number, number, number, number] | null {
  if (!points.length) return null;
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [lng, lat] of points) {
    w = Math.min(w, lng);
    e = Math.max(e, lng);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  // Keep a tiny route from zooming in absurdly far.
  const pad = 0.0015;
  if (e - w < pad) {
    w -= pad / 2;
    e += pad / 2;
  }
  if (n - s < pad) {
    s -= pad / 2;
    n += pad / 2;
  }
  return [w, s, e, n];
}

/** An SVG path of the route scaled into a w×h box (for list thumbnails). */
export function sketchPath(points: RunPoint[], gaps: number[], w: number, h: number, inset = 6, maxPoints = 300): string {
  const b = bounds(points);
  if (!b) return '';
  const [west, south, east, north] = b;
  // Equirectangular projection, corrected for latitude so shapes aren't squashed.
  const k = Math.cos(rad((south + north) / 2));
  const spanX = (east - west) * k;
  const spanY = north - south;
  const scale = Math.min((w - inset * 2) / spanX, (h - inset * 2) / spanY);
  const ox = (w - spanX * scale) / 2;
  const oy = (h - spanY * scale) / 2;
  const step = Math.max(1, Math.ceil(points.length / maxPoints));
  return stretches(points, gaps)
    .map((s) =>
      s
        .filter((_, i) => i % step === 0 || i === s.length - 1)
        .map((p, i) => `${i ? 'L' : 'M'}${(ox + (p[0] - west) * k * scale).toFixed(1)} ${(oy + (north - p[1]) * scale).toFixed(1)}`)
        .join(' '),
    )
    .join(' ');
}

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

const DISTANCE_UNITS: Record<string, number> = { km: 1000, kms: 1000, kilometres: 1000, kilometers: 1000, mi: 1609.344, mile: 1609.344, miles: 1609.344, m: 1, metres: 1, meters: 1 };
const TIME_UNITS: Record<string, number> = { min: 60_000, mins: 60_000, minutes: 60_000, hr: 3_600_000, hrs: 3_600_000, hour: 3_600_000, hours: 3_600_000 };
const RUN_SOURCES = new Set(['run-km', 'run-min', 'walk-km', 'walk-min', 'distance']);

/** Habits a GPS run can count towards: distance habits, and time habits that track running/walking. */
export function canLogRun(h: Habit): boolean {
  if (h.archived || h.quit) return false;
  const u = h.unit.toLowerCase();
  if (u in DISTANCE_UNITS) return true;
  return u in TIME_UNITS && (RUN_SOURCES.has(h.sync ?? '') || /run|jog|walk/i.test(h.title));
}

/** Best default habit for a run: one auto-tracking running, then any running/distance habit. */
export function defaultRunHabit(habits: Habit[]): Habit | undefined {
  const ok = habits.filter(canLogRun);
  return ok.find((h) => h.sync === 'run-km') ?? ok.find((h) => /run|jog/i.test(h.title)) ?? ok.find((h) => h.sync === 'run-min') ?? ok[0];
}

/** A finished run converted into the habit's unit (rounded), or 0 if it doesn't apply. */
export function runAmountFor(h: Habit, run: Pick<Run, 'distance' | 'movingMs'>): number {
  const u = h.unit.toLowerCase();
  if (u in DISTANCE_UNITS) return Math.round((run.distance / DISTANCE_UNITS[u]) * 100) / 100;
  if (u in TIME_UNITS) return Math.round((run.movingMs / TIME_UNITS[u]) * 100) / 100;
  return 0;
}

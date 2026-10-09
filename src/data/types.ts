/** 0 = Sunday … 6 = Saturday (matches Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * When a habit is due.
 *  - daily:  every day
 *  - days:   only on the listed weekdays
 *  - weekly: N sessions any time during the week (shown under "Weekly tasks")
 */
export type Schedule =
  | { kind: 'daily' }
  | { kind: 'days'; days: Weekday[] }
  | { kind: 'weekly'; timesPerWeek: number };

export interface Reminder {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface Habit {
  id: string;
  title: string;
  subtitle: string;
  /** Celebratory copy shown on the slide control once complete. */
  doneLabel: string;

  goalValue: number;
  /** Free-form unit label: min, km, laps, glasses, pages… */
  unit: string;
  /** Amount added by a single "+" tap in the progress card. */
  step: number;

  /** Key into the art registry (illustration or aura cover). */
  artId: string;
  /** Key into the color-theme registry. */
  themeId: string;

  schedule: Schedule;
  reminder: Reminder;

  createdAt: string;
  archived: boolean;

  /** Auto-fill progress from Health Connect (see services/health). */
  sync?: HealthSource;
  /** "Quit a bad habit" mode: the daily slide confirms a clean day. */
  quit?: QuitInfo;
  /** Set when the habit was started from a challenge. */
  challenge?: { id: string; startDay: string; days: number; closed?: boolean; passed?: boolean };
}

export type HealthSource =
  | 'steps'
  | 'distance'
  | 'run-km'
  | 'run-min'
  | 'walk-km'
  | 'walk-min'
  | 'bike-km'
  | 'bike-min'
  | 'swim-min'
  | 'yoga-min'
  | 'dance-min'
  | 'workout-min'
  | 'floors'
  | 'sleep-h';

export interface QuitInfo {
  /** Money (or time) saved per clean day, in the user's currency. */
  costPerDay: number;
  currency: string;
  /** Day keys where the user reported a slip; the clean counter restarts after the latest. */
  slips: string[];
}

/** Progress for one habit on one day. */
export interface LogEntry {
  value: number;
  /** ISO timestamp of the last update. */
  at: string;
  /** 1 (low) … 4 (great), from the post-completion check-in. */
  mood?: 1 | 2 | 3 | 4;
  note?: string;
  /** A streak freeze covered this missed day. */
  frozen?: boolean;
  /** Value came from Health Connect. */
  synced?: boolean;
}

/** A sequence of habits played back one card after another. */
export interface Routine {
  id: string;
  name: string;
  habitIds: string[];
}

/** A finished challenge, kept as a trophy. */
export interface ChallengeTrophy {
  id: string;
  title: string;
  days: number;
  completedAt: string;
}

/** dayKey (YYYY-MM-DD) → habitId → entry. */
export type Logs = Record<string, Record<string, LogEntry>>;

/** A running focus timer for a minute-based habit. */
export interface ActiveTimer {
  habitId: string;
  day: string;
  /** Epoch ms the current run started. */
  startedAt: number;
}

/** Resolved color set for a habit (from its theme). */
export interface HabitColors {
  accent: string;
  bgTop: string;
  cardTint: string;
}

/** One GPS fix on a run: [longitude, latitude, seconds since the run started]. */
export type RunPoint = [number, number, number];

/** A finished GPS run, stored only on the phone. */
export interface Run {
  id: string;
  /** Habit the run was logged to, if any. */
  habitId?: string;
  /** Amount added to that habit (in the habit's unit). */
  logged?: number;
  /** Epoch ms. */
  startedAt: number;
  endedAt: number;
  /** Moving time (pauses excluded), ms. */
  movingMs: number;
  /** Metres. */
  distance: number;
  points: RunPoint[];
  /** Indices into `points` where a new stretch starts (after a pause). */
  gaps: number[];
  /** Cumulative moving time (ms) when each whole kilometre was reached. */
  splits: number[];
}

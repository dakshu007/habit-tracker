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
}

/** Progress for one habit on one day. */
export interface LogEntry {
  value: number;
  /** ISO timestamp of the last update. */
  at: string;
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

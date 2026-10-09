import { t } from '@/i18n/core';
/** Local date helpers (no external deps). All keys are local-time YYYY-MM-DD. */

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** YYYY-MM-DD key in local time. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a dayKey back into a local-midnight Date. */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

export function shiftKey(key: string, n: number): string {
  return dayKey(addDays(fromKey(key), n));
}

/** Start of the week containing `ref` (weekStart: 0 = Sunday, 1 = Monday). */
export function startOfWeek(ref: Date, weekStart: 0 | 1 = 1): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/** The 7 day keys of the week containing `ref`. */
export function weekKeys(ref: Date, weekStart: 0 | 1 = 1): string[] {
  const s = startOfWeek(ref, weekStart);
  return Array.from({ length: 7 }, (_, i) => dayKey(addDays(s, i)));
}

/** Weekday order for headers, honouring the week start. */
export function weekdayOrder(weekStart: 0 | 1 = 1): number[] {
  return Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7);
}

export interface StripDay {
  label: string;
  dayOfMonth: number;
  key: string;
  isToday: boolean;
  isFuture: boolean;
}

/** A rolling window of days around today for the date wheel. */
export function stripDays(pastDays = 60, futureDays = 14, now: Date = new Date()): StripDay[] {
  const todayK = dayKey(now);
  return Array.from({ length: pastDays + futureDays + 1 }, (_, i) => {
    const date = addDays(now, i - pastDays);
    const key = dayKey(date);
    return {
      label: DAY_LABELS[date.getDay()],
      dayOfMonth: date.getDate(),
      key,
      isToday: key === todayK,
      isFuture: key > todayK,
    };
  });
}

/** Grid of a month padded to whole weeks; out-of-month cells are null. */
export function monthGrid(year: number, month: number, weekStart: 0 | 1 = 1): (string | null)[] {
  const first = new Date(year, month, 1);
  const count = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() - weekStart + 7) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let i = 1; i <= count; i++) cells.push(dayKey(new Date(year, month, i)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${`${minute}`.padStart(2, '0')} ${ampm}`;
}

/** "Today at 2:47 PM" / "Yesterday at …" / "Mon at …" / "12 Mar at …". */
export function formatLastUpdated(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const time = formatTime(d.getHours(), d.getMinutes());
  const k = dayKey(d);
  const today = dayKey(now);
  if (k === today) return t('Today at {time}', { time });
  if (k === shiftKey(today, -1)) return t('Yesterday at {time}', { time });
  if (k > shiftKey(today, -7)) return t('{day} at {time}', { day: t(DAY_LABELS[d.getDay()]), time });
  return t('{date} at {time}', { date: `${d.getDate()} ${t(MONTH_LABELS[d.getMonth()].slice(0, 3))}`, time });
}

/** "Today", "Yesterday", "Tomorrow" or "Wed, 12 Mar". */
export function relativeDayLabel(key: string, now: Date = new Date()): string {
  const today = dayKey(now);
  if (key === today) return t('Today');
  if (key === shiftKey(today, -1)) return t('Yesterday');
  if (key === shiftKey(today, 1)) return t('Tomorrow');
  const d = fromKey(key);
  return `${t(DAY_LABELS[d.getDay()])}, ${d.getDate()} ${t(MONTH_LABELS[d.getMonth()].slice(0, 3))}`;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

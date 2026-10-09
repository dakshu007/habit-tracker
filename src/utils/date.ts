/** Local date helpers (no external deps). */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface WeekDay {
  label: string; // 'Mon'
  dayOfMonth: number; // 15
  date: Date;
  isToday: boolean;
}

/** YYYY-MM-DD key in local time (for the daily-reset comparison). */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday-based start of the week containing `ref`. */
function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = d.getDay(); // 0 Sun .. 6 Sat
  const diff = dow === 0 ? -6 : 1 - dow; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

/** The 5 weekdays (Mon–Fri) of the week containing `ref`. */
export function weekdaysMonToFri(ref: Date = new Date()): WeekDay[] {
  const monday = startOfWeekMonday(ref);
  const todayKey = dayKey(ref);
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      label: DAY_LABELS[date.getDay()],
      dayOfMonth: date.getDate(),
      date,
      isToday: dayKey(date) === todayKey,
    };
  });
}

export interface MonthDay {
  label: string; // 'Mon'
  dayOfMonth: number; // 15
  date: Date;
  isToday: boolean;
  key: string; // YYYY-MM-DD
}

/** Every day of the month containing `ref`, in order. */
export function daysInMonth(ref: Date = new Date()): MonthDay[] {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  const todayKey = dayKey(ref);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const key = dayKey(date);
    return {
      label: DAY_LABELS[date.getDay()],
      dayOfMonth: date.getDate(),
      date,
      isToday: key === todayKey,
      key,
    };
  });
}

/** "Today at 2:47 PM" / "Mon at 2:47 PM" — matches the Figma "Last updated" line. */
export function formatLastUpdated(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = `${d.getMinutes()}`.padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const time = `${h}:${m} ${ampm}`;
  const when = dayKey(d) === dayKey(now) ? 'Today' : DAY_LABELS[d.getDay()];
  return `${when} at ${time}`;
}

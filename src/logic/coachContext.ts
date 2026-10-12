import type { Habit, Logs } from '@/data/types';
import { isDoneOn, isScheduledOn, scheduleLabel, streakFor, valueOn } from '@/logic/habits';
import { shiftKey } from '@/utils/date';

const DAYS = 14;

/**
 * A compact plain-text summary of the user's habits for the AI coach: goals,
 * schedules, streaks and the last 14 days. Only this summary is sent (no notes,
 * no name unless set, no location or health raw data).
 */
export function coachContext(habits: Habit[], logs: Logs, today: string, weekStart: 0 | 1, name: string): string {
  const live = habits.filter((h) => !h.archived);
  if (!live.length) return 'No habits yet.';
  const keys = Array.from({ length: DAYS }, (_, i) => shiftKey(today, i - (DAYS - 1)));
  const lines = live.map((h) => {
    const s = streakFor(h, logs, today, weekStart);
    // Oldest → today: ✓ done, · scheduled but missed, - not scheduled.
    const strip = keys.map((k) => (isDoneOn(h, logs, k) ? '✓' : isScheduledOn(h, k) ? '·' : '-')).join('');
    const todayValue = valueOn(logs, today, h.id);
    const moods = keys.map((k) => logs[k]?.[h.id]?.mood).filter((m): m is 1 | 2 | 3 | 4 => !!m);
    const mood = moods.length ? `, mood after it avg ${(moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)}/4` : '';
    return `- ${h.title}${h.quit ? ' (quitting)' : ''}: goal ${h.goalValue} ${h.unit}, ${scheduleLabel(h.schedule)}; streak ${s.current} ${s.unit}s (best ${s.best}); today ${todayValue}/${h.goalValue}; last ${DAYS} days ${strip}${mood}`;
  });
  return [name ? `Name: ${name}` : '', `Habits (last ${DAYS} days, oldest first; ✓ done, · missed, - not scheduled):`, ...lines].filter(Boolean).join('\n');
}

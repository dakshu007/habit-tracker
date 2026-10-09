import type { Habit, Logs } from './types';
import { templates, habitFromTemplate } from './templates';
import { isDoneOn } from '@/logic/habits';
import { fromKey, shiftKey } from '@/utils/date';

export interface Challenge {
  id: string;
  title: string;
  blurb: string;
  days: 7 | 21 | 30;
  templateKey: string;
}

/** A finish counts as "completed" with at least this share of days done. */
export const PASS_RATE = 0.8;

export const challenges: Challenge[] = [
  { id: 'hydrate-7', title: '7-Day Hydration Reset', blurb: 'Eight glasses a day for a week. Feel the difference by day three.', days: 7, templateKey: 'water' },
  { id: 'detox-7', title: '7-Day Screen Detox', blurb: 'One screen-free hour every day. Reclaim your evenings.', days: 7, templateKey: 'detox' },
  { id: 'read-21', title: '21 Days of Reading', blurb: 'Ten pages a day — about two books by the end.', days: 21, templateKey: 'read' },
  { id: 'calm-21', title: '21 Days of Calm', blurb: 'Ten quiet minutes a day to build a lasting meditation habit.', days: 21, templateKey: 'meditate' },
  { id: 'run-21', title: '21-Day Running Start', blurb: 'Build the running habit, one easy run at a time.', days: 21, templateKey: 'run' },
  { id: 'walk-30', title: '30-Day Walking Streak', blurb: '8,000 steps a day for a month. Simple, powerful.', days: 30, templateKey: 'walk' },
  { id: 'journal-30', title: '30 Days of Journaling', blurb: 'One entry a day. Clearer head, calmer heart.', days: 30, templateKey: 'journal' },
  { id: 'fit-30', title: '30-Day Fitness Kickoff', blurb: 'Thirty minutes of movement, three days a week.', days: 30, templateKey: 'workout' },
];

export function getChallenge(id: string) {
  return challenges.find((c) => c.id === id);
}

export function habitForChallenge(c: Challenge, today: string): Habit {
  const tpl = templates.find((x) => x.key === c.templateKey)!;
  return { ...habitFromTemplate(tpl), challenge: { id: c.id, startDay: today, days: c.days } };
}

export interface ChallengeProgress {
  day: number; // 1-based day of the challenge (clamped)
  doneDays: number;
  dueDays: number;
  finished: boolean; // time is up
  passed: boolean;
  frac: number; // elapsed share 0..1
}

export function challengeProgress(h: Habit, logs: Logs, today: string): ChallengeProgress | null {
  if (!h.challenge) return null;
  const { startDay, days } = h.challenge;
  const lastDay = shiftKey(startDay, days - 1);
  const elapsed = Math.round((fromKey(today).getTime() - fromKey(startDay).getTime()) / 86_400_000) + 1;
  let doneDays = 0;
  let dueDays = 0;
  for (let i = 0; i < days; i++) {
    const k = shiftKey(startDay, i);
    if (k > today) break;
    if (h.schedule.kind === 'days' && !h.schedule.days.includes(fromKey(k).getDay() as never)) continue;
    dueDays++;
    if (isDoneOn(h, logs, k)) doneDays++;
  }
  const totalDue =
    h.schedule.kind === 'days' ? Array.from({ length: days }, (_, i) => shiftKey(startDay, i)).filter((k) => (h.schedule as { days: number[] }).days.includes(fromKey(k).getDay())).length : days;
  const finished = today > lastDay;
  return {
    day: Math.max(1, Math.min(days, elapsed)),
    doneDays,
    dueDays,
    finished,
    passed: finished && doneDays / Math.max(1, totalDue) >= PASS_RATE,
    frac: Math.max(0, Math.min(1, elapsed / days)),
  };
}

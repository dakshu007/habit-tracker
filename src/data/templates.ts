import { t as tr } from '@/i18n/core';
import type { Habit, HealthSource, Schedule } from './types';

/** A ready-made habit the user can start from (onboarding + editor). */
export interface HabitTemplate {
  key: string;
  title: string;
  subtitle: string;
  doneLabel: string;
  goalValue: number;
  unit: string;
  step: number;
  artId: string;
  themeId: string;
  schedule: Schedule;
  /** Default Health Connect source (user still has to switch auto-track on). */
  sync?: HealthSource;
  /** Quit-mode template: daily cost saved. */
  quitCost?: number;
}

const daily: Schedule = { kind: 'daily' };

export const templates: HabitTemplate[] = [
  // The six original Figma activities.
  { key: 'cycling', title: 'Cycling', subtitle: 'Boosts heart health and fitness.', doneLabel: 'Done! Great ride.', goalValue: 6, unit: 'km', step: 0.5, artId: 'cycling', themeId: 'sky', schedule: daily, sync: 'bike-km' },
  { key: 'swimming', title: 'Swimming', subtitle: 'Full-body, joint-friendly.', doneLabel: 'Done! Great laps.', goalValue: 10, unit: 'laps', step: 1, artId: 'swimming', themeId: 'lagoon', schedule: daily },
  { key: 'dancing', title: 'Dancing', subtitle: 'Lifts your mood.', doneLabel: 'Done! Nice moves.', goalValue: 15, unit: 'min', step: 5, artId: 'dancing', themeId: 'coral', schedule: daily },
  { key: 'gardening', title: 'Gardening', subtitle: 'Calm and active.', doneLabel: 'Done! Well grown.', goalValue: 20, unit: 'min', step: 5, artId: 'gardening', themeId: 'azure', schedule: daily },
  { key: 'cleaning', title: 'Cleaning', subtitle: 'Clears your space.', doneLabel: 'Done! Spotless work.', goalValue: 20, unit: 'min', step: 5, artId: 'cleaning', themeId: 'slate', schedule: daily },
  { key: 'stairs', title: 'Staircase Climbing', subtitle: 'Builds leg strength.', doneLabel: 'Done! Look how high you got.', goalValue: 10, unit: 'floors', step: 1, artId: 'staircase-climbing', themeId: 'lavender', schedule: daily, sync: 'floors' },

  // Everyday habits with generated aura covers.
  { key: 'run', title: 'Running', subtitle: 'Every stride counts.', doneLabel: 'Done! Runner’s high.', goalValue: 5, unit: 'km', step: 0.5, artId: 'aura-shoe', themeId: 'sunset', schedule: daily, sync: 'run-km' },
  { key: 'read', title: 'Read', subtitle: 'A few pages a day adds up.', doneLabel: 'Done! Chapter closed.', goalValue: 10, unit: 'pages', step: 1, artId: 'aura-book', themeId: 'sunset', schedule: daily },
  { key: 'water', title: 'Drink Water', subtitle: 'Stay sharp and hydrated.', doneLabel: 'Done! Fully hydrated.', goalValue: 8, unit: 'glasses', step: 1, artId: 'aura-drop', themeId: 'lagoon', schedule: daily },
  { key: 'meditate', title: 'Meditate', subtitle: 'Quiet the noise.', doneLabel: 'Done! Calm achieved.', goalValue: 10, unit: 'min', step: 1, artId: 'aura-lotus', themeId: 'lavender', schedule: daily },
  { key: 'walk', title: 'Walk', subtitle: 'Fresh air, clear head.', doneLabel: 'Done! Miles behind you.', goalValue: 8000, unit: 'steps', step: 500, artId: 'aura-steps', themeId: 'mint', schedule: daily, sync: 'steps' },
  { key: 'workout', title: 'Workout', subtitle: 'Stronger every session.', doneLabel: 'Done! Beast mode.', goalValue: 30, unit: 'min', step: 5, artId: 'aura-dumbbell', themeId: 'rose', schedule: daily },
  { key: 'journal', title: 'Journal', subtitle: 'Write it down, let it go.', doneLabel: 'Done! Thoughts captured.', goalValue: 1, unit: 'entry', step: 1, artId: 'aura-pen', themeId: 'lemon', schedule: daily },
  { key: 'sleep', title: 'Sleep Early', subtitle: 'In bed before 11.', doneLabel: 'Done! Sweet dreams.', goalValue: 1, unit: 'night', step: 1, artId: 'aura-moon', themeId: 'indigo', schedule: daily },
  { key: 'study', title: 'Learn Something', subtitle: 'Feed your curiosity.', doneLabel: 'Done! Brain gains.', goalValue: 30, unit: 'min', step: 5, artId: 'aura-bulb', themeId: 'lemon', schedule: daily },
  { key: 'detox', title: 'Screen-free Hour', subtitle: 'Be where your feet are.', doneLabel: 'Done! Present and calm.', goalValue: 60, unit: 'min', step: 15, artId: 'aura-phone', themeId: 'forest', schedule: daily },
  { key: 'sleep8', title: 'Sleep 8 Hours', subtitle: 'Rest is part of the plan.', doneLabel: 'Done! Well rested.', goalValue: 8, unit: 'hours', step: 0.5, artId: 'aura-moon', themeId: 'indigo', schedule: daily, sync: 'sleep-h' },
  { key: 'eat', title: 'Eat Greens', subtitle: 'Fuel that feels good.', doneLabel: 'Done! Nourished.', goalValue: 3, unit: 'servings', step: 1, artId: 'aura-leaf', themeId: 'forest', schedule: daily },

  // Quit a bad habit — the daily slide confirms a clean day.
  { key: 'quit-smoke', title: 'Quit Smoking', subtitle: 'Every clean day adds up.', doneLabel: 'Clean day logged. Proud of you.', goalValue: 1, unit: 'day', step: 1, artId: 'aura-heart', themeId: 'mint', schedule: daily, quitCost: 150 },
  { key: 'quit-junk', title: 'No Junk Food', subtitle: 'Fuel, not filler.', doneLabel: 'Clean day logged. Proud of you.', goalValue: 1, unit: 'day', step: 1, artId: 'aura-leaf', themeId: 'forest', schedule: daily, quitCost: 100 },
  { key: 'quit-scroll', title: 'Less Doomscrolling', subtitle: 'Get your evenings back.', doneLabel: 'Clean day logged. Proud of you.', goalValue: 1, unit: 'day', step: 1, artId: 'aura-phone', themeId: 'indigo', schedule: daily, quitCost: 0 },
];

/** The habits a brand-new user gets if they skip picking. */
export function newHabitId(): string {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function habitFromTemplate(t: HabitTemplate): Habit {
  return {
    id: newHabitId(),
    // Saved in the user's language at creation time (habit text is user data afterwards).
    title: tr(t.title),
    subtitle: tr(t.subtitle),
    doneLabel: tr(t.doneLabel),
    goalValue: t.goalValue,
    unit: t.unit,
    step: t.step,
    artId: t.artId,
    themeId: t.themeId,
    schedule: t.schedule,
    reminder: { enabled: false, hour: 8, minute: 0 },
    createdAt: new Date().toISOString(),
    archived: false,
    quit: t.quitCost !== undefined ? { costPerDay: t.quitCost, currency: '₹', slips: [] } : undefined,
  };
}

export function blankHabit(): Habit {
  return {
    id: newHabitId(),
    title: '',
    subtitle: '',
    doneLabel: 'Done! Nicely done.',
    goalValue: 1,
    unit: 'times',
    step: 1,
    artId: 'aura-flame',
    themeId: 'sky',
    schedule: { kind: 'daily' },
    reminder: { enabled: false, hour: 8, minute: 0 },
    createdAt: new Date().toISOString(),
    archived: false,
  };
}

export const UNIT_SUGGESTIONS = ['times', 'min', 'hours', 'km', 'steps', 'pages', 'glasses', 'laps', 'floors', 'reps'];

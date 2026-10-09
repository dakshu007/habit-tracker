import type { Habit, Schedule } from './types';

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
}

const daily: Schedule = { kind: 'daily' };

export const templates: HabitTemplate[] = [
  // The six original Figma activities.
  { key: 'cycling', title: 'Cycling', subtitle: 'Boosts heart health and fitness.', doneLabel: 'Done! Great ride.', goalValue: 6, unit: 'km', step: 0.5, artId: 'cycling', themeId: 'sky', schedule: daily },
  { key: 'swimming', title: 'Swimming', subtitle: 'Full-body, joint-friendly.', doneLabel: 'Done! Great laps.', goalValue: 10, unit: 'laps', step: 1, artId: 'swimming', themeId: 'lagoon', schedule: { kind: 'weekly', timesPerWeek: 3 } },
  { key: 'dancing', title: 'Dancing', subtitle: 'Lifts your mood.', doneLabel: 'Done! Nice moves.', goalValue: 15, unit: 'min', step: 5, artId: 'dancing', themeId: 'coral', schedule: daily },
  { key: 'gardening', title: 'Gardening', subtitle: 'Calm and active.', doneLabel: 'Done! Well grown.', goalValue: 20, unit: 'min', step: 5, artId: 'gardening', themeId: 'azure', schedule: { kind: 'weekly', timesPerWeek: 2 } },
  { key: 'cleaning', title: 'Cleaning', subtitle: 'Clears your space.', doneLabel: 'Done! Spotless work.', goalValue: 20, unit: 'min', step: 5, artId: 'cleaning', themeId: 'slate', schedule: daily },
  { key: 'stairs', title: 'Staircase Climbing', subtitle: 'Builds leg strength.', doneLabel: 'Done! Look how high you got.', goalValue: 10, unit: 'floors', step: 1, artId: 'staircase-climbing', themeId: 'lavender', schedule: daily },

  // Everyday habits with generated aura covers.
  { key: 'run', title: 'Running', subtitle: 'Every stride counts.', doneLabel: 'Done! Runner’s high.', goalValue: 5, unit: 'km', step: 0.5, artId: 'aura-shoe', themeId: 'sunset', schedule: { kind: 'days', days: [1, 3, 5, 6] } },
  { key: 'read', title: 'Read', subtitle: 'A few pages a day adds up.', doneLabel: 'Done! Chapter closed.', goalValue: 10, unit: 'pages', step: 1, artId: 'aura-book', themeId: 'sunset', schedule: daily },
  { key: 'water', title: 'Drink Water', subtitle: 'Stay sharp and hydrated.', doneLabel: 'Done! Fully hydrated.', goalValue: 8, unit: 'glasses', step: 1, artId: 'aura-drop', themeId: 'lagoon', schedule: daily },
  { key: 'meditate', title: 'Meditate', subtitle: 'Quiet the noise.', doneLabel: 'Done! Calm achieved.', goalValue: 10, unit: 'min', step: 1, artId: 'aura-lotus', themeId: 'lavender', schedule: daily },
  { key: 'walk', title: 'Walk', subtitle: 'Fresh air, clear head.', doneLabel: 'Done! Miles behind you.', goalValue: 8000, unit: 'steps', step: 500, artId: 'aura-steps', themeId: 'mint', schedule: daily },
  { key: 'workout', title: 'Workout', subtitle: 'Stronger every session.', doneLabel: 'Done! Beast mode.', goalValue: 30, unit: 'min', step: 5, artId: 'aura-dumbbell', themeId: 'rose', schedule: { kind: 'days', days: [1, 3, 5] } },
  { key: 'journal', title: 'Journal', subtitle: 'Write it down, let it go.', doneLabel: 'Done! Thoughts captured.', goalValue: 1, unit: 'entry', step: 1, artId: 'aura-pen', themeId: 'lemon', schedule: daily },
  { key: 'sleep', title: 'Sleep Early', subtitle: 'In bed before 11.', doneLabel: 'Done! Sweet dreams.', goalValue: 1, unit: 'night', step: 1, artId: 'aura-moon', themeId: 'indigo', schedule: daily },
  { key: 'study', title: 'Learn Something', subtitle: 'Feed your curiosity.', doneLabel: 'Done! Brain gains.', goalValue: 30, unit: 'min', step: 5, artId: 'aura-bulb', themeId: 'lemon', schedule: daily },
  { key: 'detox', title: 'Screen-free Hour', subtitle: 'Be where your feet are.', doneLabel: 'Done! Present and calm.', goalValue: 60, unit: 'min', step: 15, artId: 'aura-phone', themeId: 'forest', schedule: daily },
  { key: 'eat', title: 'Eat Greens', subtitle: 'Fuel that feels good.', doneLabel: 'Done! Nourished.', goalValue: 3, unit: 'servings', step: 1, artId: 'aura-leaf', themeId: 'forest', schedule: daily },
];

/** The habits a brand-new user gets if they skip picking. */
export const DEFAULT_TEMPLATE_KEYS = ['run', 'water', 'read', 'meditate'];

export function newHabitId(): string {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function habitFromTemplate(t: HabitTemplate): Habit {
  return {
    id: newHabitId(),
    title: t.title,
    subtitle: t.subtitle,
    doneLabel: t.doneLabel,
    goalValue: t.goalValue,
    unit: t.unit,
    step: t.step,
    artId: t.artId,
    themeId: t.themeId,
    schedule: t.schedule,
    reminder: { enabled: false, hour: 8, minute: 0 },
    createdAt: new Date().toISOString(),
    archived: false,
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

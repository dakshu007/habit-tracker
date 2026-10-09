import type { Task } from './types';

/**
 * Seed activities. Cycling carries REAL values harvested from the Figma Home
 * frame. Staircase Climbing + Swimming also have a few confirmed values
 * (goal/unit) visible in the stacked cards. Everything marked TODO is a
 * placeholder to be replaced with exact hex/values when its frame is read.
 */

// A neutral seed timestamp; the store overwrites lastUpdated on real updates.
const SEED_TS = '2026-06-14T14:47:00.000Z';

export const seedTasks: Task[] = [
  {
    id: 'cleaning',
    title: 'Cleaning',
    subtitle: 'Clears your space.', // ✓ Figma
    doneLabel: 'Done! Spotless work.', // TODO: confirm from Figma
    goalValue: 20, // ✓ Figma
    unit: 'min',
    accentColor: '#5E86A4', // ✓ Figma (Goal badge slate blue)
    bgGradientTop: '#98B6CA', // ✓ Figma (screen gradient top)
    cardTint: '#BCD0DE', // ✓ Figma (card bg)
    currentValue: 20, // seeded complete to mirror Figma's "1 done today" (= goalValue)
    status: 'done',
    lastUpdated: SEED_TS,
    isDaily: true,
  },
  {
    id: 'cycling',
    title: 'Cycling',
    subtitle: 'Boosts heart health and fitness.', // ✓ Figma
    doneLabel: 'Done! Great ride.', // TODO: confirm from Figma
    goalValue: 6,
    unit: 'km', // ✓ Figma
    accentColor: '#056EBE', // ✓ Figma (Goal badge blue)
    bgGradientTop: '#6FB7ED', // ✓ Figma (screen gradient top)
    cardTint: '#E6F1FB', // ✓ Figma (card bg)
    currentValue: 4.8, // ✓ Figma (progress card)
    status: 'inProgress', // ✓ Figma
    lastUpdated: SEED_TS,
    isDaily: true,
  },
  {
    id: 'dancing',
    title: 'Dancing',
    subtitle: 'Lifts your mood.', // ✓ Figma
    doneLabel: 'Done! Nice moves.', // TODO: confirm from Figma
    goalValue: 15, // ✓ Figma
    unit: 'min',
    accentColor: '#FDA7A4', // ✓ Figma (Goal badge coral)
    bgGradientTop: '#EBA3A0', // ✓ Figma (screen gradient top)
    cardTint: '#EABFBE', // ✓ Figma (card bg)
    currentValue: 0,
    status: 'inProgress',
    lastUpdated: SEED_TS,
    isDaily: true,
  },
  {
    id: 'gardening',
    title: 'Gardening',
    subtitle: 'Calm and active.', // ✓ Figma
    doneLabel: 'Done! Well grown.', // TODO: confirm from Figma
    goalValue: 20, // ✓ Figma
    unit: 'min',
    accentColor: '#4394D3', // ✓ Figma (Goal badge)
    bgGradientTop: '#76B1DE', // ✓ Figma (screen gradient top)
    cardTint: '#F9F2EC', // ✓ Figma (card bg)
    currentValue: 0,
    status: 'inProgress',
    lastUpdated: SEED_TS,
    isDaily: true,
  },
  {
    id: 'staircase-climbing',
    title: 'Staircase Climbing',
    subtitle: 'Builds leg strength.', // ✓ Figma
    doneLabel: 'Done! Look how high you got.', // ✓ Figma
    goalValue: 10,
    unit: 'floors', // ✓ Figma
    accentColor: '#B280FF', // ✓ Figma (Goal badge purple)
    bgGradientTop: '#C9AEFC', // ✓ Figma (screen gradient top)
    cardTint: '#FCF5FC', // ✓ Figma (card bg)
    currentValue: 0,
    status: 'inProgress',
    lastUpdated: SEED_TS,
    isDaily: true,
  },
  {
    id: 'swimming',
    title: 'Swimming',
    subtitle: 'Full-body, joint-friendly.', // ✓ Figma
    doneLabel: 'Done! Great laps.', // TODO: confirm from Figma
    goalValue: 10,
    unit: 'laps', // ✓ Figma
    accentColor: '#3BB5FA', // ✓ Figma (Goal badge)
    bgGradientTop: '#7BC1CC', // ✓ Figma (screen gradient top)
    cardTint: '#7DD0FF', // ✓ Figma (card bg)
    currentValue: 0,
    status: 'inProgress',
    lastUpdated: SEED_TS,
    isDaily: true,
  },
];

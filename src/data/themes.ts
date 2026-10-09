import type { HabitColors } from './types';

export interface ColorTheme extends HabitColors {
  id: string;
  name: string;
  /** Achievement id that unlocks this theme (premium reward). */
  unlock?: string;
}

/**
 * Habit color themes. The first six are the exact Figma sets the original
 * activities used; the rest extend the same recipe (saturated accent, lighter
 * gradient top, soft card tint) so custom habits feel native to the design.
 */
export const colorThemes: ColorTheme[] = [
  { id: 'sky', name: 'Sky', accent: '#056EBE', bgTop: '#6FB7ED', cardTint: '#E6F1FB' },
  { id: 'slate', name: 'Slate', accent: '#5E86A4', bgTop: '#98B6CA', cardTint: '#BCD0DE' },
  { id: 'coral', name: 'Coral', accent: '#F2817D', bgTop: '#EBA3A0', cardTint: '#EABFBE' },
  { id: 'azure', name: 'Azure', accent: '#4394D3', bgTop: '#76B1DE', cardTint: '#F9F2EC' },
  { id: 'lavender', name: 'Lavender', accent: '#9B6BF2', bgTop: '#C9AEFC', cardTint: '#FCF5FC' },
  { id: 'lagoon', name: 'Lagoon', accent: '#1F9FE6', bgTop: '#7BC1CC', cardTint: '#BFE6FF' },
  { id: 'mint', name: 'Mint', accent: '#1BA37A', bgTop: '#7FD3B4', cardTint: '#E3F7EF' },
  { id: 'sunset', name: 'Sunset', accent: '#F07B3F', bgTop: '#FFB38A', cardTint: '#FFF0E6' },
  { id: 'lemon', name: 'Lemon', accent: '#D49A00', bgTop: '#F5D06B', cardTint: '#FFF8E0' },
  { id: 'rose', name: 'Rose', accent: '#E0457B', bgTop: '#F59AB8', cardTint: '#FDEAF1' },
  { id: 'forest', name: 'Forest', accent: '#3E8E41', bgTop: '#94C98F', cardTint: '#EAF5E7' },
  { id: 'indigo', name: 'Indigo', accent: '#4F5BD5', bgTop: '#9AA3F0', cardTint: '#EEF0FF' },
  // Rewards — earned through achievements.
  { id: 'ember', name: 'Ember', accent: '#E8590C', bgTop: '#FF9F68', cardTint: '#FFE8DA', unlock: 'streak7' },
  { id: 'gold', name: 'Gold', accent: '#B8860B', bgTop: '#F2D27A', cardTint: '#FFF6DC', unlock: 'level5' },
  { id: 'holo', name: 'Holo', accent: '#8E6CFF', bgTop: '#9FE3F5', cardTint: '#F3E9FF', unlock: 'perfect7' },
  { id: 'midnight', name: 'Midnight', accent: '#5865F2', bgTop: '#7C83D9', cardTint: '#E6E8FF', unlock: 'night' },
];

const byId = Object.fromEntries(colorThemes.map((t) => [t.id, t]));

export function getTheme(id: string): ColorTheme {
  return byId[id] ?? colorThemes[0];
}

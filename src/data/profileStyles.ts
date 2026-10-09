/** Gradient presets for the profile card. */
export interface ProfileStyle {
  id: string;
  name: string;
  colors: [string, string, string];
  /** Achievement id that unlocks this style (premium reward). */
  unlock?: string;
}

export const profileStyles: ProfileStyle[] = [
  { id: 'aurora', name: 'Aurora', colors: ['#6CC3F7', '#5E8BF5', '#9A72F4'] },
  { id: 'sunset', name: 'Sunset', colors: ['#FFC48A', '#F59A7B', '#E0638C'] },
  { id: 'lagoon', name: 'Lagoon', colors: ['#7FE0D6', '#3BB5E8', '#3D7BE0'] },
  { id: 'meadow', name: 'Meadow', colors: ['#B9E68A', '#5CC48E', '#2E9C8A'] },
  { id: 'lavender', name: 'Lavender', colors: ['#E3C6FF', '#B48CF7', '#7E6CF0'] },
  { id: 'peach', name: 'Peach', colors: ['#FFE1C2', '#FFB8A0', '#F59AB8'] },
  { id: 'midnight', name: 'Midnight', colors: ['#4B4F7A', '#2B2D4A', '#1C1B22'] },
  { id: 'graphite', name: 'Graphite', colors: ['#8A8F98', '#5A5E66', '#34363C'] },
  { id: 'gold', name: 'Gold', colors: ['#FFE9A8', '#E8B84A', '#B8860B'], unlock: 'level5' },
  { id: 'holo', name: 'Holo', colors: ['#9FE3F5', '#C7A6FF', '#FF9AD5'], unlock: 'perfect7' },
  { id: 'ember', name: 'Ember', colors: ['#FFC48A', '#FF7A2F', '#C2410C'], unlock: 'streak30' },
];

export function getProfileStyle(id?: string): ProfileStyle {
  return profileStyles.find((p) => p.id === id) ?? profileStyles[0];
}

import type { ImageSourcePropType } from 'react-native';

import type { GlyphName } from '@/components/ui/glyphs';

/**
 * Card artwork — hand-drawn illustrations (WebP, 1074px wide).
 *  - `bg`:    the illustration's bottom-edge color, used to fill the card below
 *             the art so there's no visible seam.
 *  - `glyph`: line icon used where a bitmap is too heavy (small UI, fallbacks).
 *
 * Ids are persisted on habits, so they never change (the `aura-*` ids predate
 * the illustrations and are kept for compatibility).
 * Resolved at render time and never persisted (Metro asset ids aren't portable).
 */
export interface Art {
  id: string;
  name: string;
  source: ImageSourcePropType;
  /** Center-cropped 216px square for small tiles and widgets. */
  thumb: ImageSourcePropType;
  bg: string;
  glyph: GlyphName;
}

export const artList: Art[] = [
  { id: 'cycling', name: 'Cycling', source: require('../assets/illustrations/cycling.webp'), thumb: require('../assets/illustrations/thumbs/cycling.webp'), bg: '#F5FAFD', glyph: 'steps' },
  { id: 'swimming', name: 'Swimming', source: require('../assets/illustrations/swimming.webp'), thumb: require('../assets/illustrations/thumbs/swimming.webp'), bg: '#7DD0FF', glyph: 'drop' },
  { id: 'dancing', name: 'Dancing', source: require('../assets/illustrations/dancing.webp'), thumb: require('../assets/illustrations/thumbs/dancing.webp'), bg: '#EABFBE', glyph: 'music' },
  { id: 'gardening', name: 'Gardening', source: require('../assets/illustrations/gardening.webp'), thumb: require('../assets/illustrations/thumbs/gardening.webp'), bg: '#F7F0E9', glyph: 'leaf' },
  { id: 'cleaning', name: 'Cleaning', source: require('../assets/illustrations/cleaning.webp'), thumb: require('../assets/illustrations/thumbs/cleaning.webp'), bg: '#BCD0DE', glyph: 'sun' },
  { id: 'staircase-climbing', name: 'Stairs', source: require('../assets/illustrations/staircase-climbing.webp'), thumb: require('../assets/illustrations/thumbs/staircase-climbing.webp'), bg: '#FDF5FC', glyph: 'steps' },
  { id: 'aura-shoe', name: 'Running', source: require('../assets/illustrations/running.webp'), thumb: require('../assets/illustrations/thumbs/running.webp'), bg: '#F7FCFA', glyph: 'shoe' },
  { id: 'aura-steps', name: 'Walking', source: require('../assets/illustrations/walking.webp'), thumb: require('../assets/illustrations/thumbs/walking.webp'), bg: '#FAFBF6', glyph: 'steps' },
  { id: 'aura-dumbbell', name: 'Workout', source: require('../assets/illustrations/workout.webp'), thumb: require('../assets/illustrations/thumbs/workout.webp'), bg: '#F6F8FB', glyph: 'dumbbell' },
  { id: 'aura-drop', name: 'Water', source: require('../assets/illustrations/water.webp'), thumb: require('../assets/illustrations/thumbs/water.webp'), bg: '#F8FDFE', glyph: 'drop' },
  { id: 'aura-book', name: 'Reading', source: require('../assets/illustrations/reading.webp'), thumb: require('../assets/illustrations/thumbs/reading.webp'), bg: '#FDFBF9', glyph: 'book' },
  { id: 'aura-lotus', name: 'Mindful', source: require('../assets/illustrations/mindful.webp'), thumb: require('../assets/illustrations/thumbs/mindful.webp'), bg: '#FDFCFF', glyph: 'lotus' },
  { id: 'aura-moon', name: 'Sleep', source: require('../assets/illustrations/sleep.webp'), thumb: require('../assets/illustrations/thumbs/sleep.webp'), bg: '#D6D1EF', glyph: 'moon' },
  { id: 'aura-sun', name: 'Morning', source: require('../assets/illustrations/morning.webp'), thumb: require('../assets/illustrations/thumbs/morning.webp'), bg: '#FFF9F4', glyph: 'sun' },
  { id: 'aura-pen', name: 'Journal', source: require('../assets/illustrations/journal.webp'), thumb: require('../assets/illustrations/thumbs/journal.webp'), bg: '#F5FAF6', glyph: 'pen' },
  { id: 'aura-leaf', name: 'Healthy', source: require('../assets/illustrations/healthy.webp'), thumb: require('../assets/illustrations/thumbs/healthy.webp'), bg: '#F9FBF1', glyph: 'leaf' },
  { id: 'aura-heart', name: 'Self-care', source: require('../assets/illustrations/self-care.webp'), thumb: require('../assets/illustrations/thumbs/self-care.webp'), bg: '#FEF9FA', glyph: 'heart' },
  { id: 'aura-music', name: 'Music', source: require('../assets/illustrations/music.webp'), thumb: require('../assets/illustrations/thumbs/music.webp'), bg: '#F9F9FD', glyph: 'music' },
  { id: 'aura-bulb', name: 'Learning', source: require('../assets/illustrations/learning.webp'), thumb: require('../assets/illustrations/thumbs/learning.webp'), bg: '#F6FAFD', glyph: 'bulb' },
  { id: 'aura-code', name: 'Coding', source: require('../assets/illustrations/coding.webp'), thumb: require('../assets/illustrations/thumbs/coding.webp'), bg: '#F8F9FD', glyph: 'code' },
  { id: 'aura-phone', name: 'Digital detox', source: require('../assets/illustrations/digital-detox.webp'), thumb: require('../assets/illustrations/thumbs/digital-detox.webp'), bg: '#F5FAF8', glyph: 'phoneOff' },
  { id: 'aura-flame', name: 'Anything', source: require('../assets/illustrations/anything.webp'), thumb: require('../assets/illustrations/thumbs/anything.webp'), bg: '#FBFAFC', glyph: 'flame' },
];

const byId = Object.fromEntries(artList.map((a) => [a.id, a]));

export function getArt(id: string): Art {
  return byId[id] ?? byId['aura-flame'];
}

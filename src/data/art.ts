import type { ImageSourcePropType } from 'react-native';

import type { GlyphName } from '@/components/ui/glyphs';

/**
 * Card artwork. Two kinds:
 *  - `image`: the hand-drawn Figma illustrations (@3x PNG)
 *  - `aura`:  a generated cover (soft gradient scene + frosted glyph) so any
 *             custom habit gets on-brand art without needing a new drawing.
 *
 * Resolved at render time and never persisted (Metro asset ids aren't portable).
 */
export type Art =
  | { id: string; name: string; kind: 'image'; source: ImageSourcePropType }
  | { id: string; name: string; kind: 'aura'; glyph: GlyphName };

export const artList: Art[] = [
  { id: 'cycling', name: 'Cycling', kind: 'image', source: require('../assets/illustrations/cycling.png') },
  { id: 'swimming', name: 'Swimming', kind: 'image', source: require('../assets/illustrations/swimming.png') },
  { id: 'dancing', name: 'Dancing', kind: 'image', source: require('../assets/illustrations/dancing.png') },
  { id: 'gardening', name: 'Gardening', kind: 'image', source: require('../assets/illustrations/gardening.png') },
  { id: 'cleaning', name: 'Cleaning', kind: 'image', source: require('../assets/illustrations/cleaning.png') },
  {
    id: 'staircase-climbing',
    name: 'Stairs',
    kind: 'image',
    source: require('../assets/illustrations/staircase-climbing.png'),
  },
  { id: 'aura-book', name: 'Reading', kind: 'aura', glyph: 'book' },
  { id: 'aura-drop', name: 'Water', kind: 'aura', glyph: 'drop' },
  { id: 'aura-lotus', name: 'Mindful', kind: 'aura', glyph: 'lotus' },
  { id: 'aura-moon', name: 'Sleep', kind: 'aura', glyph: 'moon' },
  { id: 'aura-sun', name: 'Morning', kind: 'aura', glyph: 'sun' },
  { id: 'aura-pen', name: 'Journal', kind: 'aura', glyph: 'pen' },
  { id: 'aura-dumbbell', name: 'Workout', kind: 'aura', glyph: 'dumbbell' },
  { id: 'aura-shoe', name: 'Running', kind: 'aura', glyph: 'shoe' },
  { id: 'aura-steps', name: 'Walking', kind: 'aura', glyph: 'steps' },
  { id: 'aura-leaf', name: 'Healthy', kind: 'aura', glyph: 'leaf' },
  { id: 'aura-heart', name: 'Self-care', kind: 'aura', glyph: 'heart' },
  { id: 'aura-music', name: 'Music', kind: 'aura', glyph: 'music' },
  { id: 'aura-bulb', name: 'Learning', kind: 'aura', glyph: 'bulb' },
  { id: 'aura-code', name: 'Coding', kind: 'aura', glyph: 'code' },
  { id: 'aura-phone', name: 'Digital detox', kind: 'aura', glyph: 'phoneOff' },
  { id: 'aura-flame', name: 'Anything', kind: 'aura', glyph: 'flame' },
];

const byId = Object.fromEntries(artList.map((a) => [a.id, a]));

export function getArt(id: string): Art {
  return byId[id] ?? byId['aura-flame'];
}

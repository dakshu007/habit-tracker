import type { ImageSourcePropType } from 'react-native';

/**
 * Activity illustrations exported from Figma (@3x PNG), keyed by task id.
 * Resolved at render time (not stored in the persisted task data, which would
 * serialise non-portable Metro asset ids). Add a task's art here and it shows
 * automatically; a missing id falls back to the labeled placeholder.
 */
export const illustrations: Record<string, ImageSourcePropType> = {
  cleaning: require('./cleaning.png'),
  cycling: require('./cycling.png'),
  dancing: require('./dancing.png'),
  gardening: require('./gardening.png'),
  'staircase-climbing': require('./staircase-climbing.png'),
  swimming: require('./swimming.png'),
};

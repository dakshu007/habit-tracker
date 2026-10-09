import { memo } from 'react';
import { Image, View } from 'react-native';

import { getArt } from '@/data/art';
import type { HabitColors } from '@/data/types';

interface HabitArtProps {
  artId: string;
  /** Kept for call-site compatibility; illustrations carry their own colors. */
  colors?: HabitColors;
  /**
   * - card:  fit to width, anchored to the top; the card fills below with the art's edge color
   * - thumb: centered square crop for small tiles (legacy `compact`)
   * - full:  fills the frame edge to edge (size the frame to artAspect() to show all of it)
   */
  mode?: 'card' | 'thumb' | 'full';
  compact?: boolean;
}

/** Habit illustration; fills its parent. */
export const HabitArt = memo(function HabitArt({ artId, mode, compact }: HabitArtProps) {
  const art = getArt(artId);
  const m = mode ?? (compact ? 'thumb' : 'card');

  if (m === 'thumb') {
    return (
      <View style={{ flex: 1, backgroundColor: art.bg, overflow: 'hidden' }}>
        <Image source={art.thumb} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }

  if (m === 'full') {
    return (
      <View style={{ flex: 1, backgroundColor: art.bg, overflow: 'hidden' }}>
        <Image source={art.source} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: art.bg, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: artAspect(artId) }}>
        <Image source={art.source} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      </View>
    </View>
  );
});

/** The illustration's natural width / height. */
export function artAspect(artId: string): number {
  const meta = Image.resolveAssetSource(getArt(artId).source);
  return meta?.width && meta?.height ? meta.width / meta.height : 1;
}

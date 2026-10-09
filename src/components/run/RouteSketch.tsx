import { useMemo } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { sketchPath } from '@/logic/run';
import type { RunPoint } from '@/data/types';

/** The route's shape as a small drawing — no map tiles, so lists stay fast and offline. */
export function RouteSketch({ points, gaps, size = 64, stroke = 3.2 }: { points: RunPoint[]; gaps: number[]; size?: number; stroke?: number }) {
  const d = useMemo(() => sketchPath(points, gaps, size, size, stroke + 4), [points, gaps, size, stroke]);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="route" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4C8DF6" />
          <Stop offset="0.6" stopColor="#8E7CF5" />
          <Stop offset="1" stopColor="#FF8A3D" />
        </LinearGradient>
      </Defs>
      <Path d={d} stroke="url(#route)" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

import { View } from 'react-native';

import { hexToRgba } from '@/theme/color';
import { useTheme } from '@/theme/ThemeContext';

/** A heatmap square: empty track → accent at full strength when complete. */
export function heatColor(value: number | null, accent: string, track: string): string {
  if (value === null || value <= 0) return track;
  return hexToRgba(accent, 0.25 + 0.75 * Math.min(1, value));
}

export function HeatCell({ value, accent, size }: { value: number | null; accent: string; size: number }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: heatColor(value, accent, theme.progressTrack),
      }}
    />
  );
}

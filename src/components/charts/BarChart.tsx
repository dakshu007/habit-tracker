import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeContext';
import { useMotion } from '@/theme/motion';

export interface Bar {
  label: string;
  /** 0..1 fill (null = nothing scheduled, renders a ghost bar). */
  value: number | null;
  highlight?: boolean;
  caption?: string;
}

interface BarChartProps {
  bars: Bar[];
  height?: number;
  from: string;
  to: string;
}

function BarCol({ bar, i, height, from, to }: { bar: Bar; i: number; height: number; from: string; to: string }) {
  const { theme } = useTheme();
  const m = useMotion();
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(i * 40 * m.speed, withSpring(bar.value ?? 0, m.ui));
  }, [bar.value, h, i, m]);
  const style = useAnimatedStyle(() => ({ height: Math.max(bar.value ? 8 : 0, h.value * height) }));

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
      {bar.caption ? (
        <Txt variant="micro" color="secondary" style={{ textTransform: 'none' }}>
          {bar.caption}
        </Txt>
      ) : null}
      <View style={{ height, width: '62%', maxWidth: 30, justifyContent: 'flex-end', borderRadius: 10, backgroundColor: theme.progressTrack, overflow: 'hidden' }}>
        <Animated.View style={[{ width: '100%', borderRadius: 10, overflow: 'hidden' }, style]}>
          <LinearGradient colors={[to, from]} style={{ flex: 1 }} />
        </Animated.View>
      </View>
      <Txt variant="axisLabel" color={bar.highlight ? 'primary' : 'secondary'}>
        {bar.label}
      </Txt>
    </View>
  );
}

/** Rounded vertical bars with a springy staggered grow-in. */
export function BarChart({ bars, height = 110, from, to }: BarChartProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      {bars.map((b, i) => (
        <BarCol key={`${b.label}${i}`} bar={b} i={i} height={height} from={from} to={to} />
      ))}
    </View>
  );
}

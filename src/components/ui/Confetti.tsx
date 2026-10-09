import { useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { Txt } from './Txt';
import { GlassSurface } from './Glass';
import { useHabitStore } from '@/store/useHabitStore';
import { haptic } from '@/utils/haptics';
import { useMotion } from '@/theme/motion';

const COLORS = ['#FF986D', '#A3D9FF', '#34C759', '#B280FF', '#FFD36B', '#F59AB8', '#6FB7ED'];
const COUNT = 46;
const DURATION = 2600;

function Piece({ i, w, h }: { i: number; w: number; h: number }) {
  const cfg = useMemo(
    () => ({
      x: Math.random() * w,
      drift: (Math.random() - 0.5) * 160,
      delay: Math.random() * 300,
      size: 6 + Math.random() * 7,
      spin: (Math.random() - 0.5) * 900,
      color: COLORS[i % COLORS.length],
      round: Math.random() > 0.6,
    }),
    [i, w],
  );
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(cfg.delay, withTiming(1, { duration: DURATION - cfg.delay, easing: Easing.out(Easing.quad) }));
  }, [t, cfg.delay]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [
      { translateX: cfg.x + cfg.drift * t.value },
      { translateY: -40 + t.value * (h * 0.85) },
      { rotate: `${cfg.spin * t.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: cfg.size,
          height: cfg.round ? cfg.size : cfg.size * 0.45,
          borderRadius: cfg.round ? cfg.size : 2,
          backgroundColor: cfg.color,
        },
        style,
      ]}
    />
  );
}

/** Full-screen confetti + "Perfect day" badge whenever every habit for a day gets done. */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  const celebrateAt = useHabitStore((s) => s.celebrateAt);
  const m = useMotion();
  const pieces = m.id === 'off' ? 0 : m.id === 'minimal' ? 18 : COUNT;
  const [burst, setBurst] = useState(0);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (!celebrateAt || celebrateAt < mountedAt.current) return;
    haptic.success();
    setBurst(celebrateAt);
    const id = setTimeout(() => setBurst(0), DURATION + 200);
    return () => clearTimeout(id);
  }, [celebrateAt]);

  if (!burst) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60 }}>
      {Array.from({ length: pieces }, (_, i) => (
        <Piece key={`${burst}-${i}`} i={i} w={width} h={height} />
      ))}
      <Animated.View
        entering={m.enter === 'none' ? undefined : ZoomIn.springify().damping(m.ui.damping).stiffness(m.ui.stiffness).mass(m.ui.mass)}
        exiting={m.enter === 'none' ? undefined : FadeOut}
        style={{ position: 'absolute', top: height * 0.38, alignSelf: 'center' }}
      >
        <GlassSurface radius={28} elevation={12} fill="rgba(255,255,255,0.9)">
          <Animated.View entering={FadeIn.delay(120)} style={{ paddingHorizontal: 26, paddingVertical: 18, alignItems: 'center', gap: 2 }}>
            <Txt variant="display" color="#1C1B22">
              🎉
            </Txt>
            <Txt variant="h2" color="#1C1B22">
              Perfect day!
            </Txt>
            <Txt variant="small" color="#8A8A95">
              Every habit done. Keep the streak alive.
            </Txt>
          </Animated.View>
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

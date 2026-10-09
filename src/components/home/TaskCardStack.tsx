import { createContext, useContext, useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useNavigation } from '@react-navigation/native';

import { TaskCard, CARD_ASPECT } from './TaskCard';
import { useDeviceTilt } from './useDeviceTilt';
import { spacing } from '@/theme/tokens';
import { useHabitStore, useActiveHabit, useVisibleHabits } from '@/store/useHabitStore';
import { haptic } from '@/utils/haptics';
import type { Habit } from '@/data/types';
import type { RootNav } from '@/navigation/types';
import { useMotion } from '@/theme/motion';

/** Shares the carousel's live position with the background so the tint morphs mid-swipe. */
export const CarouselContext = createContext<{ pos: SharedValue<number> } | null>(null);

/**
 * Smooth, infinitely-cycling horizontal carousel. Every card is mounted once
 * and keyed by id; a single continuous `pos` shared value (card units,
 * unbounded) drives each card's wrapped slot, so the deck loops both ways.
 *
 *  - Drag / fling to move between cards; tap → next.
 *  - Long-press → habit details.
 */

const TILT_DEG = 7;

interface CarouselCardProps {
  habit: Habit;
  index: number;
  len: number;
  pos: SharedValue<number>;
  pressScale: SharedValue<number>;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  step: number;
  width: number;
}

function CarouselCard({ habit, index, len, pos, pressScale, tiltX, tiltY, step, width }: CarouselCardProps) {
  // 1 on the centred card, 0 by one card away — gyro effects only live on the active card.
  const weight = useDerivedValue(() => {
    const half = len / 2;
    const rel = ((((index - pos.value + half) % len) + len) % len) - half;
    return Math.max(0, 1 - Math.abs(rel));
  });
  const wTiltX = useDerivedValue(() => tiltX.value * weight.value);
  const wTiltY = useDerivedValue(() => tiltY.value * weight.value);

  const style = useAnimatedStyle(() => {
    const half = len / 2;
    const rel = len === 1 ? 0 : ((((index - pos.value + half) % len) + len) % len) - half;
    const mag = Math.abs(rel);
    const press = 1 - (1 - pressScale.value) * interpolate(mag, [0, 1], [1, 0], Extrapolation.CLAMP);
    const swipeTilt = interpolate(rel, [-1, 0, 1], [14, 0, -14], Extrapolation.CLAMP);
    return {
      transform: [
        { perspective: 900 },
        { translateX: rel * step },
        { rotateX: `${-wTiltY.value * TILT_DEG}deg` },
        { rotateY: `${swipeTilt + wTiltX.value * TILT_DEG}deg` },
        { scale: interpolate(mag, [0, 1], [1, 0.92], Extrapolation.CLAMP) * press },
      ],
      opacity: interpolate(mag, [0, 1, 1.6], [1, 0.85, 0], Extrapolation.CLAMP),
      zIndex: Math.round(100 - mag * 10),
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width }, style]}>
      <TaskCard habit={habit} width={width} tiltX={wTiltX} tiltY={wTiltY} />
    </Animated.View>
  );
}

export function TaskCardStack({ focused }: { focused: boolean }) {
  const { width: screenW } = useWindowDimensions();
  const width = screenW - spacing.screenX * 2;
  const frontH = Math.round(width * CARD_ASPECT);
  const navigation = useNavigation<RootNav>();

  const active = useActiveHabit();
  const visible = useVisibleHabits();
  const setActive = useHabitStore((s) => s.setActive);
  const motion = useHabitStore((s) => s.settings.motion);
  const m = useMotion();
  const SPRING = m.card;

  const ids = visible.map((t) => t.id);
  const len = visible.length;
  const activeIndex = Math.max(0, active ? ids.indexOf(active.id) : 0);
  const step = width;
  const swipeable = len > 1;

  const sync = useContext(CarouselContext);
  const localPos = useSharedValue(activeIndex);
  const pos = sync?.pos ?? localPos;
  const startPos = useSharedValue(activeIndex);
  const pressScale = useSharedValue(1);
  const { tiltX, tiltY } = useDeviceTilt(motion && focused);

  // Follow external active changes (filter/day switches, rehydration) via the shortest wrapped path.
  useEffect(() => {
    if (len === 0) return;
    const current = pos.value;
    const base = Math.round((current - activeIndex) / len) * len + activeIndex;
    if (Math.abs(base - current) > 0.001) pos.value = withSpring(base, SPRING);
  }, [activeIndex, len, pos]);

  const commit = (target: number) => {
    const idx = ((target % len) + len) % len;
    const id = ids[idx];
    if (id && id !== active?.id) {
      haptic.tick();
      setActive(id);
    }
  };

  const openDetail = () => {
    if (!active) return;
    haptic.medium();
    navigation.navigate('HabitDetail', { id: active.id });
  };

  const snapTo = (target: number) => {
    'worklet';
    pos.value = withSpring(target, SPRING, (finished) => {
      if (finished) scheduleOnRN(commit, target);
    });
  };

  const pan = Gesture.Pan()
    .enabled(swipeable)
    .activeOffsetX([-14, 14])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      startPos.value = pos.value;
      pressScale.value = withTiming(m.pressScale, { duration: 120 });
    })
    .onUpdate((e) => {
      pos.value = startPos.value - e.translationX / step;
    })
    .onEnd((e) => {
      const projected = pos.value - (e.velocityX / step) * 0.12;
      snapTo(Math.round(projected));
    })
    .onFinalize(() => {
      pressScale.value = withSpring(1, m.release);
    });

  const longPress = Gesture.LongPress()
    .minDuration(380)
    .onBegin(() => {
      pressScale.value = withTiming(Math.min(1, m.pressScale - 0.02), { duration: 300 });
    })
    .onStart(() => {
      scheduleOnRN(openDetail);
    })
    .onFinalize(() => {
      pressScale.value = withSpring(1, m.release);
    });

  const tap = Gesture.Tap()
    .enabled(swipeable)
    .maxDistance(10)
    .onEnd((_e, success) => {
      if (success) snapTo(Math.round(pos.value) + 1);
    });

  const gesture = Gesture.Exclusive(pan, longPress, tap);

  return (
    <View style={{ width, height: frontH, alignSelf: 'center' }}>
      {visible.map((habit, i) => (
        <CarouselCard
          key={habit.id}
          habit={habit}
          index={i}
          len={len}
          pos={pos}
          pressScale={pressScale}
          tiltX={tiltX}
          tiltY={tiltY}
          step={step}
          width={width}
        />
      ))}

      {/* Swipe / tap / long-press surface over the art (keeps the slide control free). */}
      <GestureDetector gesture={gesture}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.round(frontH * 0.6), zIndex: 1000 }} />
      </GestureDetector>
    </View>
  );
}

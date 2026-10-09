import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { TaskCard, CARD_ASPECT } from './TaskCard';
import { useCarouselSync } from './carouselSync';
import { useDeviceTilt } from './useDeviceTilt';
import { spacing } from '@/theme/tokens';
import { useTaskStore, useActiveTask, useVisibleTasks } from '@/store/useTaskStore';
import type { Task } from '@/data/types';

/**
 * Smooth, infinitely-cycling horizontal carousel. Every card is mounted once
 * and keyed by id, so changing the active task never remounts a card (no image
 * reload / flicker). A single continuous `pos` shared value (in card units,
 * unbounded) drives every card; each card's on-screen slot is computed with
 * wrap-around modular maths, so the deck loops endlessly in both directions.
 *
 *  - Drag LEFT  → next card (slides in from the right).
 *  - Drag RIGHT → previous card (slides in from the left).
 *  - Flick or cross the half-way point to commit; otherwise it springs back.
 *  - Tap the card → next. Last → first and first → last wrap seamlessly.
 *
 * The wrap discontinuity for any card happens ~len/2 cards away (off-screen),
 * so it's never visible. Adjacent cards peek ~16px at the screen edges.
 */

const SPRING = { damping: 20, stiffness: 160, mass: 0.6 } as const;

// Subtle gyroscope tilt magnitude for the active card (degrees).
const TILT_DEG = 7;

interface CarouselCardProps {
  task: Task;
  index: number;
  len: number;
  pos: SharedValue<number>;
  pressScale: SharedValue<number>;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  step: number;
  width: number;
}

function CarouselCard({ task, index, len, pos, pressScale, tiltX, tiltY, step, width }: CarouselCardProps) {
  // Centring weight: 1 on the active card, fading to 0 by one card away, so the
  // gyro effect only lives on the active task and dissolves as you swipe.
  const weight = useDerivedValue(() => {
    const half = len / 2;
    const rel = (((index - pos.value + half) % len) + len) % len - half;
    return Math.max(0, 1 - Math.abs(rel));
  });
  // Tilt weighted by centring — shared with TaskCard for parallax + glare.
  const wTiltX = useDerivedValue(() => tiltX.value * weight.value);
  const wTiltY = useDerivedValue(() => tiltY.value * weight.value);

  const style = useAnimatedStyle(() => {
    const half = len / 2;
    // Nearest wrapped offset from the centre, in (-half, half].
    const rel = (((index - pos.value + half) % len) + len) % len - half;
    const mag = Math.abs(rel);
    // Press feedback only bites on the centred card; neighbours stay put.
    const press = 1 - (1 - pressScale.value) * interpolate(mag, [0, 1], [1, 0], Extrapolation.CLAMP);
    // Swipe tilt (off-centre travel) + gyro tilt (active card only), blended.
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
      <TaskCard task={task} width={width} tiltX={wTiltX} tiltY={wTiltY} />
    </Animated.View>
  );
}

export function TaskCardStack() {
  const { width: screenW } = useWindowDimensions();
  const width = screenW - spacing.screenX * 2;
  const frontH = Math.round(width * CARD_ASPECT);

  const active = useActiveTask();
  const visible = useVisibleTasks();
  const setActive = useTaskStore((s) => s.setActive);

  const ids = visible.map((t) => t.id);
  const len = visible.length;
  const activeIndex = Math.max(0, ids.indexOf(active.id));
  const step = width; // cards sit one screen apart; ~16px peek via screen padding
  const swipeable = len > 1;

  // Position is owned by HomeScreen (shared with the background) when present;
  // fall back to a local value if the stack is ever rendered standalone.
  const sync = useCarouselSync();
  const localPos = useSharedValue(activeIndex);
  const pos = sync?.pos ?? localPos;
  const startPos = useSharedValue(activeIndex);
  // Press feedback for the centred card (0.97 while touched, springs back).
  const pressScale = useSharedValue(1);
  // Live device tilt (gyroscope) → drives the active card's 3D reaction.
  const { tiltX, tiltY } = useDeviceTilt();

  // Follow external active-task changes (e.g. async store rehydration), taking
  // the shortest wrapped path. A no-op after our own commits.
  useEffect(() => {
    const current = pos.value;
    const base = Math.round((current - activeIndex) / len) * len + activeIndex;
    if (Math.abs(base - current) > 0.001) {
      pos.value = withSpring(base, SPRING);
    }
  }, [activeIndex, len, pos]);

  const commit = (target: number) => {
    const idx = ((target % len) + len) % len;
    const id = ids[idx];
    if (id && id !== active.id) setActive(id);
  };

  const snapTo = (target: number) => {
    'worklet';
    pos.value = withSpring(target, SPRING, (finished) => {
      if (finished) runOnJS(commit)(target);
    });
  };

  const pan = Gesture.Pan()
    .enabled(swipeable)
    .activeOffsetX([-16, 16])
    .failOffsetY([-16, 16])
    .onBegin(() => {
      startPos.value = pos.value;
      pressScale.value = withTiming(0.97, { duration: 120 });
    })
    .onUpdate((e) => {
      pos.value = startPos.value - e.translationX / step;
    })
    .onEnd((e) => {
      // Velocity nudges the snap toward the fling direction.
      const projected = pos.value - (e.velocityX / step) * 0.12;
      snapTo(Math.round(projected));
    })
    .onFinalize(() => {
      pressScale.value = withSpring(1, { damping: 12, stiffness: 220 });
    });

  const tap = Gesture.Tap()
    .enabled(swipeable)
    .maxDistance(10)
    .onBegin(() => {
      pressScale.value = withTiming(0.96, { duration: 100 });
    })
    .onEnd((_e, success) => {
      if (success) snapTo(Math.round(pos.value) + 1);
    })
    .onFinalize(() => {
      pressScale.value = withSpring(1, { damping: 12, stiffness: 220 });
    });

  const gesture = Gesture.Exclusive(pan, tap);

  return (
    <View style={{ width, height: frontH, alignSelf: 'center' }}>
      {visible.map((task, i) => (
        <CarouselCard
          key={task.id}
          task={task}
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

      {/* Swipe/tap surface over the illustration (keeps the slide control free) */}
      <GestureDetector gesture={gesture}>
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.round(frontH * 0.62), zIndex: 1000 }}
        />
      </GestureDetector>
    </View>
  );
}

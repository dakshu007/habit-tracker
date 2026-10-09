import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptic } from '@/utils/haptics';

import { Txt } from '@/components/ui/Txt';
import { CheckIcon, ChevronsRight } from '@/components/ui/icons';
import { useTheme } from '@/theme/ThemeContext';
import { palette, radius } from '@/theme/tokens';

const TRACK_H = 62;
const KNOB = 50;
const MARGIN = 6;
const THRESHOLD = 0.6; // fraction of travel needed to commit

interface SlideToCompleteProps {
  done: boolean;
  onComplete: () => void;
  /** Celebratory copy shown once complete (per-task, from Figma). */
  doneLabel?: string;
  /** Locked (future days): shows the label but can't be dragged. */
  disabled?: boolean;
  idleLabel?: string;
}

/**
 * Slide-to-complete control. Drag the knob past the threshold to complete:
 * the knob springs to the end and flips to a green filled check, and the copy
 * switches to the celebratory done label. An already-done task renders settled
 * at the end. Built on gesture-handler + reanimated worklets.
 *
 * On completion it celebrates: a success haptic fires, a ring bursts out of the
 * knob, and the check pops. The celebration runs whenever `done` flips from
 * false → true (gesture, daily reset undo, or external completion alike).
 */
export function SlideToComplete({ done, onComplete, doneLabel = 'Done!', disabled = false, idleLabel = "Slide when you're done" }: SlideToCompleteProps) {
  const { theme } = useTheme();
  const x = useSharedValue(0);
  const startX = useSharedValue(0);
  const maxX = useSharedValue(0);
  const progress = useSharedValue(done ? 1 : 0); // 0 = in-progress, 1 = done
  const ring = useSharedValue(0); // 0..1 burst progress
  const checkPop = useSharedValue(1); // check scale

  const prevDone = useRef(done);

  // Fire the celebration on a false → true transition.
  const celebrate = () => {
    haptic.success();
    ring.value = 0;
    ring.value = withTiming(1, { duration: 620 });
    checkPop.value = withSequence(
      withTiming(0.6, { duration: 80 }),
      withTiming(1.35, { duration: 140 }),
      withSpring(1, { damping: 8, stiffness: 240 }),
    );
  };

  // Keep the knob in sync when `done` changes from outside a gesture
  // (daily reset, external completion, etc.), and celebrate on completion.
  useEffect(() => {
    if (done) {
      x.value = withTiming(maxX.value, { duration: 160 });
      progress.value = withTiming(1, { duration: 160 });
      if (!prevDone.current) celebrate();
    } else {
      x.value = withSpring(0, { damping: 18, stiffness: 200 });
      progress.value = withTiming(0, { duration: 160 });
    }
    prevDone.current = done;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const onLayout = (w: number) => {
    const max = Math.max(0, w - KNOB - MARGIN * 2);
    maxX.value = max;
    if (done) {
      x.value = max; // settle instantly on mount when already complete
      progress.value = 1;
    }
  };

  const pan = Gesture.Pan()
    .enabled(!done && !disabled)
    .activeOffsetX(8)
    .onBegin(() => {
      startX.value = x.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      x.value = next < 0 ? 0 : next > maxX.value ? maxX.value : next;
    })
    .onEnd(() => {
      if (maxX.value > 0 && x.value > maxX.value * THRESHOLD) {
        x.value = withTiming(maxX.value, { duration: 140 });
        progress.value = withTiming(1, { duration: 140 });
        scheduleOnRN(onComplete);
      } else {
        x.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [palette.white, palette.success]),
  }));

  const chevronStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkPop.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : (1 - ring.value) * 0.6,
    transform: [{ scale: 1 + ring.value * 1.4 }],
  }));

  return (
    <View
      onLayout={(e) => onLayout(e.nativeEvent.layout.width)}
      style={{
        height: TRACK_H,
        borderRadius: radius.slideTrack,
        backgroundColor: theme.slideTrack,
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Label — position + color + copy depend on state */}
      <View
        style={{
          position: 'absolute',
          left: done ? 18 : 68,
          right: done ? 62 : 44,
          top: 0,
          bottom: 0,
          justifyContent: 'center',
        }}
        pointerEvents="none"
      >
        <Txt variant="slideLabel" color={done ? 'success' : disabled ? 'secondary' : 'primary'} numberOfLines={1}>
          {done ? doneLabel : idleLabel}
        </Txt>
      </View>

      {/* Chevron affordance on the right (fades out as it completes) */}
      <Animated.View
        style={[{ position: 'absolute', right: 18, top: 0, bottom: 0, justifyContent: 'center' }, chevronStyle]}
        pointerEvents="none"
      >
        <ChevronsRight size={18} color={palette.inkMuted} />
      </Animated.View>

      {/* Draggable knob */}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: MARGIN,
              width: KNOB,
              height: KNOB,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
            },
            knobStyle,
          ]}
        >
          {/* Celebration burst ring */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                width: KNOB,
                height: KNOB,
                borderRadius: radius.full,
                borderWidth: 2.5,
                borderColor: palette.success,
              },
              ringStyle,
            ]}
          />
          <Animated.View style={checkStyle}>
            <CheckIcon size={24} color={done ? palette.white : palette.inkMuted} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

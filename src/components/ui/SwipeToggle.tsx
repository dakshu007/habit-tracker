import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Txt } from './Txt';
import { useTheme } from '@/theme/ThemeContext';
import { useMotion } from '@/theme/motion';
import { palette } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';

interface SwipeToggleProps<T extends string> {
  options: [{ key: T; label: string }, { key: T; label: string }];
  value: T;
  onChange: (v: T) => void;
  width?: number;
}

const PAD = 4;
const H = 40;

/**
 * Two-option switch you can swipe: drag the white knob across (it follows the
 * finger and snaps to the nearer side) or simply tap a side.
 */
export function SwipeToggle<T extends string>({ options, value, onChange, width = 132 }: SwipeToggleProps<T>) {
  const { theme, isDark } = useTheme();
  const m = useMotion();
  const knobW = (width - PAD * 2) / 2;
  const travel = knobW;
  const index = value === options[1].key ? 1 : 0;

  const x = useSharedValue(index * travel);
  const start = useSharedValue(0);
  const [hover, setHover] = useState(index);

  useEffect(() => {
    x.value = withSpring(index * travel, m.ui);
    setHover(index);
  }, [index, travel, x, m.ui]);

  const commit = (i: number) => {
    setHover(i);
    if (i !== index) {
      haptic.tick();
      onChange(options[i].key);
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-4, 4])
    .onBegin(() => {
      start.value = x.value;
    })
    .onUpdate((e) => {
      x.value = Math.max(0, Math.min(travel, start.value + e.translationX));
    })
    .onEnd((e) => {
      const projected = x.value + e.velocityX * 0.05;
      const i = projected > travel / 2 ? 1 : 0;
      x.value = withSpring(i * travel, m.ui);
      scheduleOnRN(commit, i);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const i = e.x > width / 2 ? 1 : 0;
    x.value = withSpring(i * travel, m.ui);
    scheduleOnRN(commit, i);
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const leftLabel = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, travel], [1, 0.45]) }));
  const rightLabel = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, travel], [0.45, 1]) }));

  const off = isDark ? '#B0B3B7' : palette.inkMuted;

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessibilityRole="switch"
        accessibilityLabel={`${options[0].label} or ${options[1].label}`}
        accessibilityState={{ checked: index === 1 }}
        style={{ width, height: H, borderRadius: H / 2, backgroundColor: theme.segmentTrack, padding: PAD, flexDirection: 'row' }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PAD,
              left: PAD,
              width: knobW,
              height: H - PAD * 2,
              borderRadius: (H - PAD * 2) / 2,
              backgroundColor: '#FFFFFF',
              boxShadow: '0px 2px 6px rgba(0,0,0,0.15)',
            },
            knobStyle,
          ]}
        />
        {options.map((o, i) => (
          <Animated.View key={o.key} pointerEvents="none" style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, i === 0 ? leftLabel : rightLabel]}>
            <Txt variant="label" numberOfLines={1} color={hover === i ? palette.ink : off}>
              {o.label}
            </Txt>
          </Animated.View>
        ))}
      </View>
    </GestureDetector>
  );
}

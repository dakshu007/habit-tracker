import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeContext';
import { palette, radius } from '@/theme/tokens';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
}

const PAD = 6;
const SPRING = { damping: 18, stiffness: 210, mass: 0.7 } as const;

/**
 * Surface-track segmented control (Now / Today / Week). The active segment is a
 * white pill with dark text in BOTH themes (per Figma); it slides smoothly
 * between options with a spring. Inactive labels dim.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { theme, isDark } = useTheme();
  const inactiveColor = isDark ? '#B0B3B7' : palette.ink;

  const [trackW, setTrackW] = useState(0);
  const n = options.length;
  const segW = trackW > 0 ? (trackW - PAD * 2) / n : 0;
  const index = Math.max(0, options.findIndex((o) => o.key === value));

  const idx = useSharedValue(index);
  useEffect(() => {
    idx.value = withSpring(index, SPRING);
  }, [index, idx]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: PAD + idx.value * segW }] }));

  return (
    <View
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        backgroundColor: theme.segmentTrack,
        padding: PAD,
        borderRadius: radius.segmentTrack,
      }}
    >
      {/* Sliding active pill */}
      {segW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PAD,
              bottom: PAD,
              left: 0,
              width: segW,
              borderRadius: radius.pill,
              backgroundColor: theme.segmentActiveBg,
            },
            indicatorStyle,
          ]}
        />
      )}

      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: radius.pill,
            }}
          >
            {/* Active label is always dark (white pill); inactive is themed + dimmed. */}
            <Txt
              variant="segmentLabel"
              color={active ? palette.ink : inactiveColor}
              style={{ opacity: active ? 1 : 0.4 }}
            >
              {opt.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

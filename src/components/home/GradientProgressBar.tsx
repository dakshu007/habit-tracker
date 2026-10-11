import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeContext';
import { palette, radius } from '@/theme/tokens';
import { useMotion } from '@/theme/motion';
import { useTabFocused } from '@/navigation/MainTabs';

const BAR_H = 12;
const MARKER_W = 12;
const MARKER_H = 10;
const SHEEN_W = 48;

interface GradientProgressBarProps {
  /** Progress fraction 0..1. */
  fraction: number;
  minLabel: string;
  maxLabel: string;
}

/**
 * Progress bar from Figma: grey groove with a fixed orange→blue gradient fill
 * (stop ~84%) and an upward triangular marker at the fill end, with min/max
 * labels beneath. The gradient is design-fixed (not the task accent).
 *
 * The fill animates: it springs from its previous value to the new fraction
 * (and grows from empty on mount), the marker tracks the fill end, and a soft
 * highlight sweeps across the filled portion on a gentle loop.
 */
export function GradientProgressBar({ fraction, minLabel, maxLabel }: GradientProgressBarProps) {
  const { theme } = useTheme();
  const m = useMotion();
  const FILL_SPRING = m.ui;
  const [trackW, setTrackW] = useState(0);

  const clamped = Math.max(0, Math.min(1, fraction));

  // Animated progress 0..1, springs toward the target whenever it changes.
  const f = useSharedValue(0);
  useEffect(() => {
    f.value = withSpring(clamped, FILL_SPRING);
  }, [clamped, f]);

  // Looping sheen position 0..1.
  const sweep = useSharedValue(0);
  // Loop only while Home is on screen: a running loop under the glass tab bar
  // makes it re-blur every frame, which slows taps on mid-range phones.
  const focused = useTabFocused('Home');
  const sheenOn = m.id !== 'off' && m.id !== 'minimal';
  useEffect(() => {
    if (!sheenOn || !focused) return;
    sweep.value = withRepeat(
      withTiming(1, { duration: 1600 * m.speed, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(sweep);
      sweep.value = 0;
    };
  }, [sweep, sheenOn, focused, m.speed]);

  const maskStyle = useAnimatedStyle(() => ({ width: f.value * trackW }));
  const markerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.max(0, Math.min(trackW - MARKER_W, f.value * trackW - MARKER_W / 2)) },
    ],
  }));
  const sheenStyle = useAnimatedStyle(() => {
    const fillW = f.value * trackW;
    return {
      opacity: sheenOn && fillW > SHEEN_W ? 0.5 : 0,
      transform: [{ translateX: -SHEEN_W + sweep.value * (fillW + SHEEN_W) }],
    };
  });

  return (
    <View style={{ gap: 4 }}>
      {/* bar + marker */}
      <View>
        <View
          onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
          style={{
            height: BAR_H,
            borderRadius: radius.progressBar,
            backgroundColor: theme.progressTrack,
            overflow: 'hidden',
          }}
        >
          {/* Animated reveal mask: clips a full-width gradient so colour stops
              stay fixed while the fill grows. */}
          <Animated.View style={[{ height: BAR_H, overflow: 'hidden', borderRadius: radius.pill }, maskStyle]}>
            {trackW > 0 && (
              <LinearGradient
                colors={[palette.progressFillFrom, palette.progressFillTo]}
                locations={[0, palette.progressFillStop]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ width: trackW, height: BAR_H }}
              />
            )}
            {/* Soft highlight that sweeps across the fill */}
            <Animated.View
              style={[{ position: 'absolute', top: 0, bottom: 0, width: SHEEN_W }, sheenStyle]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </Animated.View>
        </View>

        {/* upward triangular position marker at the fill end */}
        {trackW > 0 && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: BAR_H,
                left: 0,
                width: 0,
                height: 0,
                borderLeftWidth: MARKER_W / 2,
                borderRightWidth: MARKER_W / 2,
                borderBottomWidth: MARKER_H,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: theme.textPrimary,
              },
              markerStyle,
            ]}
          />
        )}
      </View>

      {/* min / max */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: MARKER_H }}>
        <Txt variant="axisLabel" color="secondary">
          {minLabel}
        </Txt>
        <Txt variant="axisLabel" color="secondary">
          {maxLabel}
        </Txt>
      </View>
    </View>
  );
}

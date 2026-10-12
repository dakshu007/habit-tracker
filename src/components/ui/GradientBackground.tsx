import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, type ReactNode } from 'react';
import { useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeContext';
import { hexToRgb, hexToRgba } from '@/theme/color';

interface GradientBackgroundProps {
  /** Per-visible-task accent colors, in carousel order. */
  colors: string[];
  /** Live carousel position (card units); drives the real-time color morph. */
  pos: SharedValue<number>;
  children?: ReactNode;
  style?: ViewStyle;
  /** Fill the whole screen (onboarding) instead of fading into the base, so white text stays readable. */
  full?: boolean;
}

/**
 * Screen background: a theme-base color with the active task's accent tinting
 * the top and fading into the base. The accent is interpolated around the
 * carousel ring from `pos`, so dragging a card morphs the tint frame-by-frame
 * on the UI thread (and eases with the snap spring) — Apple-smooth, never late.
 *
 * From Figma the gradient covers ~764 of 1206 (≈0.634) of the frame height.
 */
const GRADIENT_HEIGHT_RATIO = 764 / 1206;

export function GradientBackground({ colors, pos, children, style, full }: GradientBackgroundProps) {
  const { theme, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const gradientHeight = Math.round(height * GRADIENT_HEIGHT_RATIO);

  const rgb = useMemo(() => colors.map(hexToRgb), [colors]);

  // Interpolate the accent around the (wrapped) carousel ring as `pos` moves.
  const accentStyle = useAnimatedStyle(() => {
    const n = rgb.length;
    if (n === 0) return { backgroundColor: 'transparent' };
    if (n === 1) return { backgroundColor: `rgb(${rgb[0].r}, ${rgb[0].g}, ${rgb[0].b})` };

    const p = ((pos.value % n) + n) % n;
    const lo = Math.floor(p) % n;
    const hi = (lo + 1) % n;
    const t = p - Math.floor(p);
    const a = rgb[lo];
    const b = rgb[hi];
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return { backgroundColor: `rgb(${r}, ${g}, ${bl})` };
  }, [rgb]);

  if (full) {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.screenBase }, style]}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, accentStyle]} />
        {/* Light at the top, the full color behind the text at the bottom. */}
        <LinearGradient
          colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0)', isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.12)']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
        {isDark && <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' }} />}
        {children}
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: theme.screenBase }, style]}>
      {/* Solid animated accent tint (dark mode dims it, per the Figma frame). */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: gradientHeight,
            opacity: isDark ? 0.2 : 1,
          },
          accentStyle,
        ]}
      />
      {/* Fade the accent down into the screen base. Same-color α0→α1 (not
          "transparent") avoids the transparent-black smear on iOS. */}
      <LinearGradient
        colors={[hexToRgba(theme.screenBase, 0), theme.screenBase]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: gradientHeight }}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type View as RNView, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeContext';
import { haptic } from '@/utils/haptics';
import { Txt } from './Txt';
import { useMotion } from '@/theme/motion';

/* ------------------------------------------------------------------ */
/* Blur target plumbing                                                */
/* ------------------------------------------------------------------ */
/**
 * Android's real-time blur (expo-blur `dimezisBlurViewSdk31Plus`) samples a
 * `BlurTargetView`. The app content lives inside one target; chrome floating
 * above it (tab bar, sheets, toasts) blurs that target via this context.
 * A BlurView must never sit inside its own target, so in-screen glass cards
 * use the frosted (non-sampling) recipe instead.
 */
export const BlurTargetContext = createContext<RefObject<RNView | null> | null>(null);

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}

/* ------------------------------------------------------------------ */
/* GlassSurface                                                        */
/* ------------------------------------------------------------------ */

interface GlassSurfaceProps {
  children?: ReactNode;
  radius?: number;
  /** Sample the blur target (only for chrome that floats above app content). */
  blur?: boolean;
  intensity?: number;
  /** Override the translucent fill. */
  fill?: string;
  /** Drop shadow strength (0 = none). */
  elevation?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function GlassSurface({
  children,
  radius = 24,
  blur = false,
  intensity = 40,
  fill,
  elevation = 0,
  style,
  contentStyle,
}: GlassSurfaceProps) {
  const { theme, isDark } = useTheme();
  const target = useBlurTarget();
  const sampled = blur && target;

  const gloss = isDark
    ? (['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)'] as const)
    : (['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)'] as const);

  return (
    <View
      style={[
        { borderRadius: radius },
        elevation > 0 && {
          boxShadow: `0px ${elevation}px ${elevation * 2.5}px rgba(0,0,0,${isDark ? 0.4 : 0.13})`,
        },
        style,
      ]}
    >
      <View
        style={[
          {
            borderRadius: radius,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.glassRim,
          },
          contentStyle,
        ]}
      >
        {sampled ? (
          <BlurView
            blurTarget={target}
            blurMethod="dimezisBlurViewSdk31Plus"
            tint={isDark ? 'dark' : 'light'}
            intensity={intensity}
            style={fillAbs}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[
            fillAbs,
            {
              backgroundColor:
                fill ?? (sampled ? (isDark ? 'rgba(40,40,48,0.42)' : 'rgba(255,255,255,0.38)') : theme.glassFill),
            },
          ]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={gloss}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%' }}
        />
        {children}
      </View>
    </View>
  );
}

const fillAbs = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/* ------------------------------------------------------------------ */
/* PressableScale                                                      */
/* ------------------------------------------------------------------ */

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  /** Skip the default light haptic. */
  silent?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable that eases down on touch — the app's universal tap feel. Layout
 * styles (flex, size, margins) apply to the pressable itself so it can grow
 * inside rows; depth and spring come from the motion preset.
 */
export function PressableScale({ children, style, scaleTo = 0.96, silent, onPress, disabled, ...rest }: PressableScaleProps) {
  const m = useMotion();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  // Presets scale the requested depth (minimal/off barely move).
  const depth = 1 - (1 - scaleTo) * ((1 - m.pressScale) / 0.04);
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        s.value = withTiming(Math.min(1, depth), { duration: 90 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, m.release);
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (!silent) haptic.light();
        onPress?.(e);
      }}
      style={[style, anim, disabled && { opacity: 0.45 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/* ------------------------------------------------------------------ */
/* GlassButton                                                         */
/* ------------------------------------------------------------------ */

interface GlassButtonProps {
  onPress?: () => void;
  children: ReactNode;
  size?: number;
  accessibilityLabel: string;
  blur?: boolean;
  fill?: string;
  style?: StyleProp<ViewStyle>;
}

/** Round frosted icon button. */
export function GlassButton({ onPress, children, size = 44, accessibilityLabel, blur, fill, style }: GlassButtonProps) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} scaleTo={0.9} style={style}>
      <GlassSurface radius={size / 2} blur={blur} fill={fill} contentStyle={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </GlassSurface>
    </PressableScale>
  );
}

/* ------------------------------------------------------------------ */
/* Primary button                                                      */
/* ------------------------------------------------------------------ */

interface ButtonProps {
  label: string;
  onPress: () => void;
  color?: string;
  variant?: 'solid' | 'glass' | 'ghost';
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, color, variant = 'solid', disabled, icon, style }: ButtonProps) {
  const { theme, isDark } = useTheme();
  const bg = color ?? (isDark ? '#FFFFFF' : '#1C1B22');
  const fg = variant === 'solid' ? (color ? '#FFFFFF' : isDark ? '#1C1B22' : '#FFFFFF') : (color ?? theme.textPrimary);

  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, paddingHorizontal: 22 }}>
      {icon}
      <Txt variant="button" color={fg}>
        {label}
      </Txt>
    </View>
  );

  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={style}>
      {variant === 'solid' ? (
        <View style={{ borderRadius: 30, backgroundColor: bg, overflow: 'hidden' }}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }}
          />
          {inner}
        </View>
      ) : variant === 'glass' ? (
        <GlassSurface radius={30}>{inner}</GlassSurface>
      ) : (
        inner
      )}
    </PressableScale>
  );
}

import { useEffect, type ReactNode } from 'react';
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Txt } from './Txt';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { spacing } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';
import { useEnter, useMotion } from '@/theme/motion';

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Tints the soft wash at the top of the screen. */
  accent?: string;
  right?: ReactNode;
  left?: ReactNode;
  children: ReactNode;
  /** Extra bottom padding for the floating tab bar. */
  tabBar?: boolean;
  scroll?: boolean;
}

/** Standard page: tinted top wash, large title, scrolling content. */
export function Screen({ title, subtitle, accent = '#6FB7ED', right, left, children, tabBar = true, scroll = true }: ScreenProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const enter = useEnter();

  const header = (
    <Animated.View entering={enter(0)} style={{ gap: 14 }}>
      {left}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="display">{title}</Txt>
          {subtitle ? (
            <Txt variant="body" color="secondary">
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right}
      </View>
    </Animated.View>
  );

  const content = { paddingTop: insets.top + 14, paddingHorizontal: spacing.screenX, paddingBottom: insets.bottom + (tabBar ? 120 : 40), gap: 18 };

  return (
    <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
      <LinearGradient
        pointerEvents="none"
        colors={[hexToRgba(accent, isDark ? 0.28 : 0.4), hexToRgba(accent, 0)]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
      />
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={content} keyboardShouldPersistTaps="handled">
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, content]}>
          {header}
          {children}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Card + Section                                                      */
/* ------------------------------------------------------------------ */

export function Card({ children, style, delay = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  const { theme, isDark } = useTheme();
  const enter = useEnter();
  return (
    <Animated.View
      entering={enter(delay)}
      style={[
        {
          backgroundColor: isDark ? theme.cardElevated : '#FFFFFF',
          borderRadius: 28,
          padding: 18,
          borderWidth: 1,
          borderColor: theme.hairline,
          boxShadow: isDark ? undefined : '0px 10px 30px rgba(28,27,34,0.06)',
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: -4, paddingHorizontal: 4 }}>
      <Txt variant="micro" color="secondary">
        {children}
      </Txt>
      {right}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

export function Toggle({ value, onChange, color = '#34C759' }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
  const { theme } = useTheme();
  const m = useMotion();
  const t = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    t.value = withSpring(value ? 1 : 0, m.ui);
  }, [value, t, m.ui]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(t.value, [0, 1], [theme.progressTrack, color]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: 3 + t.value * 20 }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => {
        haptic.tick();
        onChange(!value);
      }}
      hitSlop={8}
    >
      <Animated.View style={[{ width: 51, height: 31, borderRadius: 16, justifyContent: 'center' }, track]}>
        <Animated.View
          style={[{ width: 25, height: 25, borderRadius: 13, backgroundColor: '#FFFFFF', boxShadow: '0px 2px 4px rgba(0,0,0,0.18)' }, knob]}
        />
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

interface RowProps {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
}

/** Settings-style row with a tinted icon tile. */
export function Row({ icon, iconBg = '#6FB7ED', title, subtitle, right, onPress, last, danger }: RowProps) {
  const { theme } = useTheme();
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.hairline,
      }}
    >
      {icon ? (
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: hexToRgba(iconBg, 0.16), alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="h3" color={danger ? 'danger' : 'primary'}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="small" color="secondary">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressRow onPress={onPress} danger={danger}>
      {body}
    </PressRow>
  );
}

/**
 * Press feedback for rows: a soft rounded highlight that fades in inside the
 * card (the stock Android ripple drew a hard-edged rectangle that looked broken).
 */
function PressRow({ onPress, danger, children }: { onPress: () => void; danger?: boolean; children: ReactNode }) {
  const { theme, isDark } = useTheme();
  const on = useSharedValue(0);
  const hl = useAnimatedStyle(() => ({ opacity: on.value }));
  const tint = danger ? hexToRgba(theme.danger, isDark ? 0.14 : 0.08) : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(28,27,34,0.045)';
  return (
    <Pressable
      onPressIn={() => {
        on.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        on.value = withTiming(0, { duration: 220 });
      }}
      onPress={() => {
        haptic.light();
        onPress();
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 4, bottom: 4, left: -10, right: -10, borderRadius: 16, backgroundColor: tint }, hl]}
      />
      {children}
    </Pressable>
  );
}

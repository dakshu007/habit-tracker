import { useEffect, type ReactNode } from 'react';
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Txt } from './Txt';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { spacing } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';

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

  const header = (
    <Animated.View entering={FadeInDown.duration(380).springify().damping(16)} style={{ gap: 14 }}>
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
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(380).springify().damping(17)}
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
  const t = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    t.value = withSpring(value ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [value, t]);
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
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      android_ripple={{ color: theme.hairline, borderless: false }}
    >
      {body}
    </Pressable>
  );
}

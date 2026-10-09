import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { TAB_ICONS, type TabName } from './TabIcons';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

const ROW_PAD = 4;
const GAP = 10;
const PILL_SPRING = { damping: 18, stiffness: 220, mass: 0.7 } as const;

// Whether genuine Apple Liquid Glass (iOS 26+) is available on this device.
// Evaluated once; everything else falls back to a hand-built frosted material.
// Guarded so a runtime without the native module simply uses the fallback.
let LIQUID = false;
try {
  LIQUID = isLiquidGlassAvailable();
} catch {
  LIQUID = false;
}

/**
 * Floating bottom tab bar.
 *
 *  - On iOS 26+ it renders ACTUAL Apple Liquid Glass via `expo-glass-effect`:
 *    a `GlassView` bar and a separate glass "lens" for the active tab, wrapped
 *    in a `GlassContainer` so the two fluidly merge as the lens springs across.
 *  - Everywhere else it falls back to a tuned `expo-blur` glass (gloss + streak
 *    + bevel) that approximates the look.
 *
 * In both modes the icons live in an overlay above the glass, the active
 * indicator springs between tabs, and the selected icon bounces.
 */
export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [rowW, setRowW] = useState(0);
  const count = state.routes.length;
  const slotW = rowW > 0 ? (rowW - ROW_PAD * 2 - GAP * (count - 1)) / count : 0;

  // Continuous index drives the active indicator; springs on every tab change.
  const indexSV = useSharedValue(state.index);
  useEffect(() => {
    indexSV.value = withSpring(state.index, PILL_SPRING);
  }, [state.index, indexSV]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ROW_PAD + indexSV.value * (slotW + GAP) }],
  }));

  const iconActive = isDark ? '#FFFFFF' : '#1C1B22';
  const iconInactive = isDark ? 'rgba(255,255,255,0.66)' : 'rgba(28,27,34,0.72)';

  // The tappable icon buttons (overlaid above the glass in both modes).
  const buttons = state.routes.map((route, index) => {
    const focused = state.index === index;
    const Icon = TAB_ICONS[route.name as TabName];
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        Haptics.selectionAsync();
        navigation.navigate(route.name);
      }
    };
    return (
      <TabButton key={route.key} focused={focused} onPress={onPress} accessibilityLabel={route.name}>
        <Icon color={focused ? iconActive : iconInactive} size={24} filled={focused} />
      </TabButton>
    );
  });

  const row = (
    <View
      onLayout={(e) => setRowW(e.nativeEvent.layout.width)}
      pointerEvents="box-none"
      style={{ flexDirection: 'row', alignItems: 'center', gap: GAP, padding: ROW_PAD }}
    >
      {buttons}
    </View>
  );

  /* ------------------------- Real Liquid Glass (iOS 26) ------------------- */
  if (LIQUID) {
    const cs = isDark ? ('dark' as const) : ('light' as const);
    // Light, clear glass like the reference: the `clear` style is far lighter
    // than `regular`, and a white tint lifts it brighter still.
    const barTint = isDark ? 'rgba(70,70,80,0.28)' : 'rgba(255,255,255,0.32)';
    // Active indicator: solid grey with a hint of translucency (not glass/blur),
    // so the glass bar barely shows through for a subtle glassy feel.
    const pillFill = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';
    return (
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: spacing.screenX,
          right: spacing.screenX,
          bottom: Math.max(insets.bottom, 10),
        }}
      >
        <View>
          {/* Glass layers fill the bar bounds, behind the icon overlay. */}
          <GlassContainer
            spacing={22}
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.tabBar }}
          >
            <GlassView
              glassEffectStyle="clear"
              tintColor={barTint}
              colorScheme={cs}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.tabBar }}
            />
            {slotW > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    top: ROW_PAD,
                    left: 0,
                    width: slotW,
                    height: slotW,
                    borderRadius: slotW / 2,
                    backgroundColor: pillFill,
                  },
                  pillStyle,
                ]}
              />
            )}
          </GlassContainer>
          {row}
        </View>
      </View>
    );
  }

  /* ------------------------- Frosted fallback ----------------------------- */
  return <FrostedBar isDark={isDark} insets={insets} slotW={slotW} pillStyle={pillStyle} row={row} />;
}

/* ====================================================================== */
/* Fallback: tuned expo-blur "liquid glass" (gloss + streak + bevel)      */
/* ====================================================================== */

interface FrostedBarProps {
  isDark: boolean;
  insets: { bottom: number };
  slotW: number;
  pillStyle: { transform: { translateX: number }[] };
  row: React.ReactNode;
}

function FrostedBar({ isDark, insets, slotW, pillStyle, row }: FrostedBarProps) {
  const glass = isDark
    ? {
        tint: 'dark' as const,
        intensity: 40,
        fill: 'rgba(255,255,255,0.07)',
        rim: 'rgba(255,255,255,0.28)',
        defEdge: 'rgba(0,0,0,0.5)',
        gloss: ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'] as const,
        streak: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)'] as const,
        pill: 'rgba(255,255,255,0.34)',
      }
    : {
        tint: 'light' as const,
        intensity: 34,
        fill: 'rgba(255,255,255,0.14)',
        rim: 'rgba(255,255,255,0.95)',
        defEdge: 'rgba(0,0,0,0.10)',
        gloss: ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)'] as const,
        streak: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0)'] as const,
        pill: 'rgba(0,0,0,0.07)',
      };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: spacing.screenX,
        right: spacing.screenX,
        bottom: Math.max(insets.bottom, 10),
      }}
    >
      <View
        style={{
          borderRadius: radius.tabBar,
          borderWidth: 1,
          borderColor: glass.defEdge,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: isDark ? 0.45 : 0.22,
          shadowRadius: 24,
          elevation: 14,
        }}
      >
        <View
          style={{
            borderRadius: radius.tabBar - 1,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: glass.rim,
          }}
        >
          <BlurView
            tint={glass.tint}
            intensity={glass.intensity}
            experimentalBlurMethod="dimezisBlurView"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: glass.fill }} />
          <LinearGradient
            colors={glass.gloss}
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '64%' }}
            pointerEvents="none"
          />
          <LinearGradient
            colors={glass.streak}
            locations={[0.08, 0.3, 0.6]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents="none"
          />

          {/* Active pill sits behind the icon overlay (rendered before `row`). */}
          {slotW > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: ROW_PAD,
                  left: 0,
                  width: slotW,
                  height: slotW,
                  borderRadius: slotW / 2,
                  backgroundColor: glass.pill,
                },
                pillStyle,
              ]}
            />
          )}
          {row}
        </View>
      </View>
    </View>
  );
}

interface TabButtonProps {
  focused: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}

/** A single tab: press-scales its icon, and bounces when it becomes active. */
function TabButton({ focused, onPress, accessibilityLabel, children }: TabButtonProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withTiming(1.18, { duration: 130 }),
        withSpring(1, { damping: 9, stiffness: 240 }),
      );
    }
  }, [focused, scale]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.86, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 260 });
      }}
      style={{
        flex: 1,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </Pressable>
  );
}

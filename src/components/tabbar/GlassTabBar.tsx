import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { TAB_ICONS } from './TabIcons';
import { useBlurTarget } from '@/components/ui/Glass';
import { useTheme } from '@/theme/ThemeContext';
import { useMotion } from '@/theme/motion';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';
import type { TabName } from '@/navigation/types';

const ROW_PAD = 5;
const GAP = 8;
const MOVE_SLOP = 6;
const HOLD_MS = 140;

interface GlassTabBarProps {
  tabs: TabName[];
  active: TabName;
  onChange: (t: TabName) => void;
}

/**
 * Floating "liquid glass" tab bar for Android: a real-time blur of the app
 * content (expo-blur sampling the BlurTargetView) layered with a translucent
 * fill, top gloss, diagonal light streak, bright rim and an outer definition
 * edge.
 *
 * One gesture drives it: tap a tab, or hold and sweep — the glass lens lifts,
 * follows your finger with a tick per tab, and releasing picks the tab under it.
 */
export function GlassTabBar({ tabs, active, onChange }: GlassTabBarProps) {
  const { isDark } = useTheme();
  const m = useMotion();
  const target = useBlurTarget();
  const insets = useSafeAreaInsets();

  const [rowW, setRowW] = useState(0);
  const count = tabs.length;
  const slotW = rowW > 0 ? (rowW - ROW_PAD * 2 - GAP * (count - 1)) / count : 0;
  const index = tabs.indexOf(active);

  const idx = useSharedValue(index); // lens position, in tab units
  const lift = useSharedValue(0); // 0 resting → 1 picked up
  const stretch = useSharedValue(1);
  const startX = useSharedValue(0);
  const dragging = useSharedValue(false);
  const hovered = useSharedValue(index);

  useEffect(() => {
    if (dragging.value) return;
    idx.value = withSpring(index, m.ui);
    hovered.value = index;
    if (m.pop) stretch.value = withSequence(withTiming(1.16, { duration: 110 }), withSpring(1, m.release));
  }, [index, idx, stretch, hovered, dragging, m]);

  const select = (i: number) => {
    const t = tabs[i];
    if (!t) return;
    if (t !== active) {
      haptic.tick();
      onChange(t);
    }
  };
  const tick = () => haptic.tick();
  const pickUp = () => haptic.medium();

  const toIndex = (x: number) => {
    'worklet';
    const raw = (x - ROW_PAD - slotW / 2) / (slotW + GAP);
    return Math.max(0, Math.min(count - 1, raw));
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .enabled(slotW > 0)
    .onBegin((e) => {
      startX.value = e.x;
      dragging.value = false;
      lift.value = withDelay(HOLD_MS, withTiming(1, { duration: 160 }));
    })
    .onUpdate((e) => {
      if (!dragging.value && (Math.abs(e.x - startX.value) > MOVE_SLOP || lift.value > 0.5)) {
        dragging.value = true;
        lift.value = withTiming(1, { duration: 120 });
        scheduleOnRN(pickUp);
      }
      if (!dragging.value) return;
      const f = toIndex(e.x);
      idx.value = f;
      const h = Math.round(f);
      if (h !== hovered.value) {
        hovered.value = h;
        scheduleOnRN(tick);
      }
    })
    .onEnd((e) => {
      const target = Math.round(toIndex(e.x));
      idx.value = withSpring(target, m.ui);
      hovered.value = target;
      scheduleOnRN(select, target);
    })
    .onFinalize(() => {
      dragging.value = false;
      lift.value = withSpring(0, m.release);
    });

  const lensStyle = useAnimatedStyle(() => {
    const s = 1 + lift.value * 0.16;
    return {
      transform: [
        { translateX: ROW_PAD + idx.value * (slotW + GAP) },
        { scaleX: s * stretch.value },
        { scaleY: s * (2 - stretch.value) },
      ],
      opacity: 1,
    };
  });

  const g = isDark
    ? {
        tint: 'dark' as const,
        fill: 'rgba(30,30,38,0.45)',
        rim: 'rgba(255,255,255,0.22)',
        edge: 'rgba(0,0,0,0.5)',
        gloss: ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)'] as const,
        streak: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)'] as const,
        lens: 'rgba(255,255,255,0.16)',
        lensRim: 'rgba(255,255,255,0.3)',
        on: '#FFFFFF',
        off: 'rgba(255,255,255,0.6)',
      }
    : {
        tint: 'light' as const,
        fill: 'rgba(255,255,255,0.42)',
        rim: 'rgba(255,255,255,0.95)',
        edge: 'rgba(0,0,0,0.08)',
        gloss: ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)'] as const,
        streak: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'] as const,
        lens: 'rgba(255,255,255,0.85)',
        lensRim: 'rgba(255,255,255,1)',
        on: '#1C1B22',
        off: 'rgba(28,27,34,0.62)',
      };

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: spacing.screenX + 4, right: spacing.screenX + 4, bottom: Math.max(insets.bottom, 12) + 4 }}
    >
      <View
        style={{
          borderRadius: radius.tabBar,
          borderWidth: 1,
          borderColor: g.edge,
          boxShadow: `0px 14px 30px rgba(0,0,0,${isDark ? 0.5 : 0.18})`,
        }}
      >
        <View style={{ borderRadius: radius.tabBar - 1, overflow: 'hidden', borderWidth: 1, borderColor: g.rim }}>
          {target ? <BlurView blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus" tint={g.tint} intensity={60} style={abs} /> : null}
          <View style={[abs, { backgroundColor: g.fill }]} />
          <LinearGradient colors={g.gloss} locations={[0, 0.45, 1]} style={[abs, { bottom: '38%' }]} pointerEvents="none" />
          <LinearGradient
            colors={g.streak}
            locations={[0.1, 0.32, 0.6]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={abs}
            pointerEvents="none"
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
                  backgroundColor: g.lens,
                  borderWidth: 1,
                  borderColor: g.lensRim,
                  boxShadow: '0px 4px 12px rgba(0,0,0,0.10)',
                },
                lensStyle,
              ]}
            />
          )}

          <GestureDetector gesture={gesture}>
            <View
              onLayout={(e) => setRowW(e.nativeEvent.layout.width)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: GAP, padding: ROW_PAD }}
            >
              {tabs.map((name) => {
                const Icon = TAB_ICONS[name];
                const focused = name === active;
                return (
                  <TabSlot key={name} focused={focused} label={name} pop={m.pop} onActivate={() => onChange(name)}>
                    <Icon color={focused ? g.on : g.off} size={24} filled={focused} />
                  </TabSlot>
                );
              })}
            </View>
          </GestureDetector>
        </View>
      </View>
    </View>
  );
}

const abs = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

interface TabSlotProps {
  focused: boolean;
  label: string;
  pop: boolean;
  onActivate: () => void;
  children: React.ReactNode;
}

/** One tab icon: bounces when it becomes active; screen readers can activate it directly. */
function TabSlot({ focused, label, pop, onActivate, children }: TabSlotProps) {
  const m = useMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (focused && pop) scale.value = withSequence(withTiming(1.16, { duration: 120 }), withSpring(1, m.release));
  }, [focused, pop, scale, m.release]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View
      accessible
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && onActivate()}
      style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={style}>{children}</Animated.View>
    </View>
  );
}

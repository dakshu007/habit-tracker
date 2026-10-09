import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { TAB_ICONS } from './TabIcons';
import { useBlurTarget } from '@/components/ui/Glass';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';
import type { TabName } from '@/navigation/types';

const ROW_PAD = 5;
const GAP = 8;
const PILL_SPRING = { damping: 17, stiffness: 210, mass: 0.7 } as const;

interface GlassTabBarProps {
  tabs: TabName[];
  active: TabName;
  onChange: (t: TabName) => void;
}

/**
 * Floating "liquid glass" tab bar for Android: a real-time blur of the app
 * content (expo-blur sampling the BlurTargetView) layered with a translucent
 * fill, top gloss, diagonal light streak, bright rim and an outer definition
 * edge — the same stack Apple's material uses, rebuilt by hand. A glossy lens
 * springs (with a little stretch) between tabs; the selected icon bounces.
 */
export function GlassTabBar({ tabs, active, onChange }: GlassTabBarProps) {
  const { isDark } = useTheme();
  const target = useBlurTarget();
  const insets = useSafeAreaInsets();

  const [rowW, setRowW] = useState(0);
  const count = tabs.length;
  const slotW = rowW > 0 ? (rowW - ROW_PAD * 2 - GAP * (count - 1)) / count : 0;
  const index = tabs.indexOf(active);

  const idx = useSharedValue(index);
  const stretch = useSharedValue(1);
  useEffect(() => {
    idx.value = withSpring(index, PILL_SPRING);
    stretch.value = withSequence(withTiming(1.22, { duration: 110 }), withSpring(1, { damping: 10, stiffness: 200 }));
  }, [index, idx, stretch]);

  const lensStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ROW_PAD + idx.value * (slotW + GAP) }, { scaleX: stretch.value }, { scaleY: 2 - stretch.value }],
  }));

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
          {target ? (
            <BlurView
              blurTarget={target}
              blurMethod="dimezisBlurViewSdk31Plus"
              tint={g.tint}
              intensity={60}
              style={abs}
            />
          ) : null}
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

          <View
            onLayout={(e) => setRowW(e.nativeEvent.layout.width)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: GAP, padding: ROW_PAD }}
          >
            {tabs.map((name) => {
              const Icon = TAB_ICONS[name];
              const focused = name === active;
              return (
                <TabButton
                  key={name}
                  focused={focused}
                  label={name}
                  onPress={() => {
                    if (!focused) {
                      haptic.tick();
                      onChange(name);
                    }
                  }}
                >
                  <Icon color={focused ? g.on : g.off} size={24} filled={focused} />
                </TabButton>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const abs = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

function TabButton({ focused, onPress, label, children }: { focused: boolean; onPress: () => void; label: string; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (focused) scale.value = withSequence(withTiming(1.18, { duration: 130 }), withSpring(1, { damping: 9, stiffness: 240 }));
  }, [focused, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.86, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 260 });
      }}
      style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={style}>{children}</Animated.View>
    </Pressable>
  );
}

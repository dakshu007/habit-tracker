import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { BackHandler, View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

import { BlurTargetContext } from '@/components/ui/Glass';
import { OverlayHost, useOverlay } from '@/components/ui/Overlay';
import { Confetti } from '@/components/ui/Confetti';
import { GlassTabBar } from '@/components/tabbar/GlassTabBar';
import { HomeScreen } from '@/screens/HomeScreen';
import { StatsScreen } from '@/screens/StatsScreen';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { RemindersScreen } from '@/screens/RemindersScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { useTheme } from '@/theme/ThemeContext';
import { useMotion } from '@/theme/motion';
import { useChallengeWatcher } from '@/components/challenge/ChallengeWatcher';
import { useRatingPrompt } from '@/services/rating';
import type { TabName } from './types';

const TABS: TabName[] = ['Home', 'Stats', 'Calendar', 'Reminders', 'Profile'];
// memo: switching tabs re-renders the host, but the screens themselves
// shouldn't redo their work (that was most of the tap-to-switch delay).
const SCREENS: Record<TabName, ComponentType> = {
  Home: memo(HomeScreen),
  Stats: memo(StatsScreen),
  Calendar: memo(CalendarScreen),
  Reminders: memo(RemindersScreen),
  Profile: memo(ProfileScreen),
};

/** Distance a scene travels while cross-fading between neighbouring tabs. */
const SHIFT = 28;

interface TabsApi {
  active: TabName;
  /** False while a stack screen (editor, detail) covers the tabs. */
  visible: boolean;
  go: (t: TabName) => void;
}

const TabsContext = createContext<TabsApi>({ active: 'Home', visible: true, go: () => {} });

export const useTabs = () => useContext(TabsContext);
/** True when `name` is the selected tab and the tab layer is on screen. */
export const useTabFocused = (name: TabName) => {
  const { active, visible } = useContext(TabsContext);
  return visible && active === name;
};

/**
 * Custom tab host. All tab scenes live inside one BlurTargetView so the
 * floating glass chrome (tab bar, sheets, confetti) can live-blur them on
 * Android. Scenes mount lazily and stay alive.
 * Transitions slide in the direction of travel.
 */
export function MainTabs() {
  const { theme } = useTheme();
  const m = useMotion();
  const visible = useIsFocused();
  const target = useRef<View>(null);
  const [active, setActive] = useState<TabName>('Home');
  const [mounted, setMounted] = useState<Set<TabName>>(() => new Set(['Home']));
  useChallengeWatcher();
  useRatingPrompt();
  const activeIndex = TABS.indexOf(active);

  const go = useCallback((t: TabName) => {
    setMounted((cur) => (cur.has(t) ? cur : new Set(cur).add(t)));
    setActive(t);
  }, []);

  // Build the other tabs once Home has settled, one at a time, so the first
  // visit to each is instant without slowing Home's first paint.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    TABS.slice(1).forEach((tab, i) => {
      timers.push(setTimeout(() => setMounted((cur) => (cur.has(tab) ? cur : new Set(cur).add(tab))), 2500 + i * 700));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const api = useMemo(() => ({ active, visible, go }), [active, visible, go]);

  // Android back: close an open sheet first, then return to Home, then exit.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (useOverlay.getState().node) return false; // OverlayHost handles it
      if (active !== 'Home') {
        go('Home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [active, visible, go]);

  return (
    <BlurTargetContext.Provider value={target}>
      <TabsContext.Provider value={api}>
        <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
          <BlurTargetView ref={target} style={{ flex: 1, backgroundColor: theme.screenBase }}>
            {TABS.map((name, i) => {
              if (!mounted.has(name)) return null;
              const Screen = SCREENS[name];
              return (
                <Scene key={name} offset={i - activeIndex} speed={m.speed}>
                  <Screen />
                </Scene>
              );
            })}
          </BlurTargetView>
          <GlassTabBar tabs={TABS} active={active} onChange={go} />
          <Confetti />
          <OverlayHost />
        </View>
      </TabsContext.Provider>
    </BlurTargetContext.Provider>
  );
}

interface SceneProps {
  /** Position relative to the active tab (0 = active, ±n = neighbours). */
  offset: number;
  speed: number;
  children: React.ReactNode;
}

function Scene({ offset, speed, children }: SceneProps) {
  const isActive = offset === 0;
  const timing = { duration: Math.max(1, 170 * speed), easing: Easing.out(Easing.cubic) };
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(isActive ? 1 : 0, timing),
    transform: [{ translateX: withTiming(isActive ? 0 : Math.sign(offset) * SHIFT, timing) }],
  }));
  return (
    <Animated.View
      pointerEvents={isActive ? 'auto' : 'none'}
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: isActive ? 1 : 0 }, style]}
    >
      {children}
    </Animated.View>
  );
}

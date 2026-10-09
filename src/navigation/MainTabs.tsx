import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from 'react';
import { BackHandler, View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
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
import type { TabName } from './types';

const TABS: TabName[] = ['Home', 'Stats', 'Calendar', 'Reminders', 'Profile'];
const SCREENS: Record<TabName, ComponentType> = {
  Home: HomeScreen,
  Stats: StatsScreen,
  Calendar: CalendarScreen,
  Reminders: RemindersScreen,
  Profile: ProfileScreen,
};

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
 * Android. Scenes mount lazily, stay alive, and cross-fade with a small lift.
 */
export function MainTabs() {
  const { theme } = useTheme();
  const visible = useIsFocused();
  const target = useRef<View>(null);
  const [active, setActive] = useState<TabName>('Home');
  const [mounted, setMounted] = useState<Set<TabName>>(() => new Set(['Home']));

  const go = (t: TabName) => {
    setMounted((m) => (m.has(t) ? m : new Set(m).add(t)));
    setActive(t);
  };

  // Android back: close an open sheet first, then return to Home, then exit.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (useOverlay.getState().node) return false; // OverlayHost handles it
      if (active !== 'Home') {
        setActive('Home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [active, visible]);

  return (
    <BlurTargetContext.Provider value={target}>
      <TabsContext.Provider value={{ active, visible, go }}>
        <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
          <BlurTargetView ref={target} style={{ flex: 1, backgroundColor: theme.screenBase }}>
            {TABS.map((name) => {
              if (!mounted.has(name)) return null;
              const Screen = SCREENS[name];
              return (
                <Scene key={name} active={name === active}>
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

function Scene({ active, children }: { active: boolean; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(active ? 1 : 0, { duration: 220 }),
    transform: [{ translateY: withTiming(active ? 0 : 10, { duration: 220 }) }],
  }));
  return (
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: active ? 1 : 0 }, style]}
    >
      {children}
    </Animated.View>
  );
}

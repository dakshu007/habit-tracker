import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from 'react';
import { BackHandler, View, useWindowDimensions } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
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
import { useHabitStore } from '@/store/useHabitStore';
import { haptic } from '@/utils/haptics';
import type { TabName } from './types';

const TABS: TabName[] = ['Home', 'Stats', 'Calendar', 'Reminders', 'Profile'];
const SCREENS: Record<TabName, ComponentType> = {
  Home: HomeScreen,
  Stats: StatsScreen,
  Calendar: CalendarScreen,
  Reminders: RemindersScreen,
  Profile: ProfileScreen,
};

/** Distance a scene travels while cross-fading between neighbouring tabs. */
const SHIFT = 42;
/** Swipe commit thresholds. */
const SWIPE_DIST = 70;
const SWIPE_VEL = 550;

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
 *
 * Swipe left/right anywhere on a screen to move between tabs (inner horizontal
 * gestures — cards, date wheel, chips, toggles — claim their touches first).
 * Transitions slide in the direction of travel.
 */
export function MainTabs() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const m = useMotion();
  const swipeTabs = useHabitStore((s) => s.settings.swipeTabs);
  const visible = useIsFocused();
  const target = useRef<View>(null);
  const [active, setActive] = useState<TabName>('Home');
  const [mounted, setMounted] = useState<Set<TabName>>(() => new Set(['Home']));
  const drag = useSharedValue(0);
  const activeIndex = TABS.indexOf(active);

  const go = (t: TabName) => {
    setMounted((cur) => (cur.has(t) ? cur : new Set(cur).add(t)));
    setActive(t);
  };

  const step = (dir: 1 | -1) => {
    const next = TABS[activeIndex + dir];
    if (!next) return;
    haptic.tick();
    go(next);
  };

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
  }, [active, visible]);

  const atStart = activeIndex === 0;
  const atEnd = activeIndex === TABS.length - 1;

  const swipe = Gesture.Pan()
    .enabled(swipeTabs)
    .activeOffsetX([-26, 26])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      const blocked = (e.translationX > 0 && atStart) || (e.translationX < 0 && atEnd);
      // Follow the finger with resistance; rubber-band at the ends.
      drag.value = e.translationX * (blocked ? 0.08 : 0.35);
    })
    .onEnd((e) => {
      const goNext = e.translationX < -SWIPE_DIST || e.velocityX < -SWIPE_VEL;
      const goPrev = e.translationX > SWIPE_DIST || e.velocityX > SWIPE_VEL;
      if (goNext && !atEnd) scheduleOnRN(step, 1);
      else if (goPrev && !atStart) scheduleOnRN(step, -1);
    })
    .onFinalize(() => {
      drag.value = withSpring(0, m.card);
    });

  return (
    <BlurTargetContext.Provider value={target}>
      <TabsContext.Provider value={{ active, visible, go }}>
        <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
          <BlurTargetView ref={target} style={{ flex: 1, backgroundColor: theme.screenBase }}>
            <GestureDetector gesture={swipe}>
              <View style={{ flex: 1 }}>
                {TABS.map((name, i) => {
                  if (!mounted.has(name)) return null;
                  const Screen = SCREENS[name];
                  return (
                    <Scene key={name} offset={i - activeIndex} drag={drag} width={width} speed={m.speed}>
                      <Screen />
                    </Scene>
                  );
                })}
              </View>
            </GestureDetector>
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
  drag: SharedValue<number>;
  width: number;
  speed: number;
  children: React.ReactNode;
}

function Scene({ offset, drag, speed, children }: SceneProps) {
  const isActive = offset === 0;
  const timing = { duration: Math.max(1, 260 * speed), easing: Easing.out(Easing.cubic) };
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(isActive ? 1 : 0, timing),
    transform: [
      { translateX: withTiming(isActive ? 0 : Math.sign(offset) * SHIFT, timing) },
      { translateX: isActive ? drag.value : 0 },
    ],
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

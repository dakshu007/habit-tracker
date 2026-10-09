import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';

import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useHabitStore } from '@/store/useHabitStore';
import { setupNotifications, startNotificationSync } from '@/services/notifications';
import { startWidgetSync } from '@/widget/sync';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 350, fade: true });

/** Wait for the persisted store so we never flash onboarding at returning users. */
function useHydrated() {
  const [hydrated, setHydrated] = useState(() => useHabitStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return useHabitStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);
  return hydrated;
}

/** Keep "today" correct across midnight and app resumes. */
function useDayRollover() {
  useEffect(() => {
    const rollover = () => useHabitStore.getState().rollover();
    rollover();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && rollover());
    const id = setInterval(rollover, 30_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);
}

function Root() {
  const { theme, isDark } = useTheme();
  const motionOff = useHabitStore((s) => s.settings.motionPreset === 'off');

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.screenBase).catch(() => {});
    if (Platform.OS === 'android') NavigationBar.setStyle(isDark ? 'dark' : 'light');
  }, [theme.screenBase, isDark]);

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme: NavTheme = {
    ...base,
    colors: { ...base.colors, background: theme.screenBase, card: theme.screenBase, text: theme.textPrimary },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {/* "Off" animation style: Reanimated jumps every animation to its end state. */}
      <ReducedMotionConfig mode={motionOff ? ReduceMotion.Always : ReduceMotion.System} />
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  const hydrated = useHydrated();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const ready = hydrated && fontsLoaded;

  useDayRollover();

  useEffect(() => {
    if (!hydrated) return;
    setupNotifications().catch(() => {});
    const stopNotifications = startNotificationSync();
    const stopWidget = startWidgetSync();
    return () => {
      stopNotifications();
      stopWidget();
    };
  }, [hydrated]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

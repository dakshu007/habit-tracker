import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
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
import { DarkTheme, DefaultTheme, NavigationContainer, type LinkingOptions, type Theme as NavTheme } from '@react-navigation/native';

import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import type { RootStackParamList } from '@/navigation/types';
import { useHabitStore } from '@/store/useHabitStore';
import { setupNotifications, startNotificationSync, startNotificationTaps } from '@/services/notifications';
import { startWidgetSync } from '@/widget/sync';
import { startHealthSync } from '@/services/health';
import { useLiveRun } from '@/store/useRunStore';
import { startPhoneSleepSync } from '@/services/phoneSleep';
import { setLang, useLang } from '@/i18n';

/**
 * Crash reporting: active only when a Sentry DSN is provided at build time
 * (GitHub secret SENTRY_DSN → EXPO_PUBLIC_SENTRY_DSN). No PII is sent.
 */
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN, sendDefaultPii: false, tracesSampleRate: 0.1, enabled: !__DEV__ });
}

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 350, fade: true });

/** Deep links: the home-screen widget opens habittracker://complete/<habitId>. */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['habittracker://'],
  config: {
    initialRouteName: 'Main',
    screens: {
      Main: '',
      QuickComplete: 'complete/:id',
      Review: 'review',
      QuickLog: 'quick-log',
      Run: 'run',
      VoiceLog: 'voice',
      Challenges: 'join/:code',
    },
  },
};

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
  const lang = useLang();
  setLang(lang); // before children render, so every t() sees it

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
    <NavigationContainer key={lang} theme={navTheme} linking={linking}>
      {/* "Off" animation style: Reanimated jumps every animation to its end state. */}
      <ReducedMotionConfig mode={motionOff ? ReduceMotion.Always : ReduceMotion.System} />
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

function App() {
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
    const stopTaps = startNotificationTaps();
    const stopHealth = startHealthSync();
    const stopSleep = startPhoneSleepSync();
    useHabitStore.getState().applyFreezes();
    useLiveRun.getState().load(); // a run left recording shows on Home
    return () => {
      stopNotifications();
      stopWidget();
      stopTaps();
      stopHealth();
      stopSleep();
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

export default SENTRY_DSN ? Sentry.wrap(App) : App;

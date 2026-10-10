import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, ToastAndroid, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Location from 'expo-location';
import type { LngLat } from '@maplibre/maplibre-react-native';

import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { CloseIcon } from '@/components/ui/icons';
import { Navigation, Pause, Play, Square } from '@/components/ui/lucide';
import { RUN_BLUE, RunMap } from '@/components/run/RunMap';
import { useHabitStore } from '@/store/useHabitStore';
import { useLiveRun, useRunStore } from '@/store/useRunStore';
import { isUnlocked } from '@/store/useLicense';
import { canLogRun, currentPace, defaultRunHabit, fmtDuration, fmtKm, fmtPace, movingTime, paceSecPerKm, runAmountFor } from '@/logic/run';
import { ensureGps, hasGpsPermission, isRecording, openAppSettings, startRunUpdates, stopRunUpdates, type GpsAccess } from '@/services/runTracker';
import { ensurePermission as ensureNotificationPermission } from '@/services/notifications';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { dayKey } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { Run } from '@/data/types';
import type { RootScreenProps } from '@/navigation/types';

const HOLD_MS = 700;

type Problem = Exclude<GpsAccess, 'granted'> | 'failed';

const PROBLEMS: Record<Problem, string> = {
  denied: 'Location is needed to map your run. Tap Start to allow it.',
  blocked: 'Location is turned off for this app. Allow it in Settings to track runs.',
  off: 'Turn on your phone’s location to start.',
  failed: 'Couldn’t start GPS tracking. Please try again.',
};

/** Add a finished run to its habit (in the habit's own unit). */
function logRun(run: Run) {
  const h = run.habitId ? useHabitStore.getState().habits.find((x) => x.id === run.habitId) : undefined;
  if (!h) return;
  const amount = runAmountFor(h, run);
  if (amount <= 0) return;
  useHabitStore.getState().addValue(h.id, dayKey(new Date(run.startedAt)), amount);
  useRunStore.getState().setLogged(run.id, h.id, amount);
}

/**
 * Live GPS run: map that follows you, distance / time / pace, pause and
 * hold-to-finish. Recording runs in a foreground service, so it keeps going
 * with the screen off or the app closed; everything is stored on the phone.
 */
export function RunScreen({ navigation, route }: RootScreenProps<'Run'>) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const live = useLiveRun((s) => s.live);
  const habits = useHabitStore((s) => s.habits);
  const candidates = useMemo(() => habits.filter(canLogRun), [habits]);

  const [habitId, setHabitId] = useState<string | undefined>(() => live?.habitId ?? route.params?.habitId ?? defaultRunHabit(habits)?.id);
  const [here, setHere] = useState<LngLat | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [follow, setFollow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [panelH, setPanelH] = useState(320);
  const watch = useRef<Location.LocationSubscription | null>(null);

  /** On-screen position updates (separate from recording, only while this screen is open). */
  const startWatch = async () => {
    if (watch.current) return;
    const last = await Location.getLastKnownPositionAsync().catch(() => null);
    if (last) setHere((h) => h ?? [last.coords.longitude, last.coords.latitude]);
    watch.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
      (l) => {
        setHere([l.coords.longitude, l.coords.latitude]);
        setAccuracy(l.coords.accuracy ?? null);
      },
    ).catch(() => null);
  };

  useEffect(() => {
    (async () => {
      await useLiveRun.getState().load();
      const saved = useLiveRun.getState().live;
      if (saved?.habitId) setHabitId(saved.habitId);
      if (!(await hasGpsPermission())) return;
      startWatch();
      // Recording should be on but isn't (phone restarted, app updated…): pick it back up.
      if (saved?.status === 'running') {
        if (!(await isRecording())) startRunUpdates().catch(() => {});
      }
    })();
    return () => {
      watch.current?.remove();
      watch.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clock tick while moving.
  useEffect(() => {
    if (live?.status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live?.status]);

  const start = async () => {
    if (busy) return;
    if (!isUnlocked()) return navigation.navigate('Paywall');
    setBusy(true);
    setProblem(null);
    const access = await ensureGps();
    if (access !== 'granted') {
      setProblem(access);
      setBusy(false);
      return;
    }
    startWatch();
    // The "run in progress" notification needs this on Android 13+ (tracking works either way).
    await ensureNotificationPermission().catch(() => false);
    useLiveRun.getState().start(habitId);
    try {
      await startRunUpdates();
      haptic.medium();
      setFollow(true);
      setNow(Date.now());
    } catch {
      useLiveRun.getState().clear();
      setProblem('failed');
    }
    setBusy(false);
  };

  const pause = () => {
    haptic.light();
    useLiveRun.getState().pause();
  };

  const resume = () => {
    haptic.medium();
    useLiveRun.getState().resume();
    setNow(Date.now());
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    await stopRunUpdates();
    const run = useRunStore.getState().finish();
    setBusy(false);
    if (!run) {
      ToastAndroid.show(t('Too short to save — run a little further next time.'), ToastAndroid.SHORT);
      navigation.goBack();
      return;
    }
    logRun(run);
    haptic.success();
    navigation.replace('RunDetail', { id: run.id, fresh: true });
  };

  const discard = () => {
    Alert.alert(t('Discard this run?'), t('Its route and time won’t be saved.'), [
      { text: t('Keep running'), style: 'cancel' },
      {
        text: t('Discard'),
        style: 'destructive',
        onPress: async () => {
          await stopRunUpdates();
          useLiveRun.getState().clear();
          navigation.goBack();
        },
      },
    ]);
  };

  const close = () => {
    if (live) ToastAndroid.show(t('Your run is still recording'), ToastAndroid.SHORT);
    navigation.goBack();
  };

  const moving = live ? movingTime(live, now) : 0;
  const pace = live?.status === 'running' ? currentPace(live.points, live.gaps) : null;
  const avg = live ? paceSecPerKm(moving, live.distance) : null;
  const habit = habits.find((h) => h.id === (live?.habitId ?? habitId));

  const gps =
    live?.status === 'paused'
      ? { label: t('Paused'), color: '#8A8A95' }
      : accuracy == null
        ? { label: t('Finding GPS…'), color: '#FFB020' }
        : accuracy <= 20
          ? { label: t('GPS strong'), color: '#34C759' }
          : accuracy <= 40
            ? { label: t('GPS okay'), color: '#8BC34A' }
            : { label: t('Weak GPS'), color: '#FFB020' };

  const panelBg = isDark ? 'rgba(30,31,42,0.97)' : 'rgba(255,255,255,0.97)';

  return (
    <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
      <RunMap
        points={live?.points ?? []}
        gaps={live?.gaps ?? []}
        mode="live"
        here={here}
        follow={follow}
        onUserMove={() => setFollow(false)}
        padding={{ top: insets.top + 60, bottom: panelH }}
      />

      {/* Top bar */}
      <View style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <GlassButton accessibilityLabel={t('Close')} fill={panelBg} onPress={close}>
          <CloseIcon size={20} color={theme.textPrimary} />
        </GlassButton>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              height: 36,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: panelBg,
              boxShadow: '0px 4px 14px rgba(0,0,0,0.12)',
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: gps.color }} />
            <Txt variant="label">{gps.label}</Txt>
          </View>
        </View>
        {follow ? (
          <View style={{ width: 44 }} />
        ) : (
          <GlassButton
            accessibilityLabel={t('Center on me')}
            fill={panelBg}
            onPress={() => {
              haptic.tick();
              setFollow(true);
            }}
          >
            <Navigation size={18} color={RUN_BLUE} fill={RUN_BLUE} />
          </GlassButton>
        )}
      </View>

      {/* Bottom panel */}
      <View
        onLayout={(e: LayoutChangeEvent) => setPanelH(e.nativeEvent.layout.height + 24)}
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: insets.bottom + 12,
          borderRadius: 32,
          padding: 20,
          gap: 16,
          backgroundColor: panelBg,
          boxShadow: '0px 12px 34px rgba(0,0,0,0.18)',
        }}
      >
        {!live ? (
          <>
            <View style={{ gap: 4 }}>
              <Txt variant="h2">{t('Ready to run?')}</Txt>
              <Txt variant="small" color="secondary">
                {t('Your route is saved only on this phone.')}
              </Txt>
            </View>

            {candidates.length > 0 && (
              <View style={{ gap: 8 }}>
                <Txt variant="micro" color="secondary">
                  {t('Counts towards')}
                </Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {candidates.map((h) => (
                    <Chip key={h.id} label={h.title} on={habitId === h.id} onPress={() => setHabitId(h.id)} />
                  ))}
                  <Chip label={t('Just track')} on={!habitId} onPress={() => setHabitId(undefined)} />
                </ScrollView>
              </View>
            )}

            {problem && (
              <View style={{ gap: 10, padding: 14, borderRadius: 18, backgroundColor: hexToRgba('#FFB020', isDark ? 0.16 : 0.12) }}>
                <Txt variant="small">{t(PROBLEMS[problem])}</Txt>
                {problem === 'blocked' && (
                  <PressableScale onPress={openAppSettings}>
                    <Txt variant="label" color={RUN_BLUE}>
                      {t('Open settings')}
                    </Txt>
                  </PressableScale>
                )}
              </View>
            )}

            <Button label={busy ? t('Starting…') : t('Start run')} color={RUN_BLUE} icon={<Play size={18} color="#FFFFFF" fill="#FFFFFF" />} onPress={start} disabled={busy} />
          </>
        ) : (
          <>
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                <Txt variant="display" style={{ fontSize: 64, lineHeight: 70, fontVariant: ['tabular-nums'] }}>
                  {fmtKm(live.distance)}
                </Txt>
                <Txt variant="h2" color="secondary" style={{ marginBottom: 12 }}>
                  {t('km')}
                </Txt>
              </View>
              {habit && (
                <Txt variant="small" color="secondary">
                  {t('Counting towards {habit}', { habit: habit.title })}
                </Txt>
              )}
            </View>

            <View style={{ flexDirection: 'row' }}>
              <Stat label={t('Time')} value={fmtDuration(moving)} />
              <Stat label={t('Pace')} value={fmtPace(pace)} unit="/km" />
              <Stat label={t('Avg pace')} value={fmtPace(avg)} unit="/km" />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {live.status === 'running' ? (
                <Button label={t('Pause')} color={isDark ? '#3A3B4A' : '#1C1B22'} icon={<Pause size={18} color="#FFFFFF" fill="#FFFFFF" />} onPress={pause} style={{ flex: 1 }} />
              ) : (
                <Button label={t('Resume')} color="#34C759" icon={<Play size={18} color="#FFFFFF" fill="#FFFFFF" />} onPress={resume} style={{ flex: 1 }} />
              )}
              <HoldButton label={t('Hold to finish')} onDone={finish} />
            </View>

            {live.status === 'paused' && (
              <PressableScale onPress={discard} style={{ alignSelf: 'center' }}>
                <Txt variant="label" color="danger">
                  {t('Discard run')}
                </Txt>
              </PressableScale>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        <Txt variant="stat" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Txt>
        {unit ? (
          <Txt variant="small" color="secondary" style={{ marginBottom: 3 }}>
            {unit}
          </Txt>
        ) : null}
      </View>
      <Txt variant="micro" color="secondary">
        {label}
      </Txt>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <PressableScale onPress={onPress} silent>
      <View style={{ height: 38, paddingHorizontal: 16, borderRadius: 19, justifyContent: 'center', backgroundColor: on ? RUN_BLUE : theme.inputBg }}>
        <Txt variant="label" color={on ? 'white' : 'primary'} numberOfLines={1}>
          {label}
        </Txt>
      </View>
    </PressableScale>
  );
}

/** Finish needs a deliberate hold so a pocket tap can't end the run. */
function HoldButton({ label, onDone }: { label: string; onDone: () => void }) {
  const fill = useSharedValue(0);
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <PressableScale
      silent
      accessibilityRole="button"
      accessibilityLabel={label}
      delayLongPress={HOLD_MS}
      onPressIn={() => {
        haptic.tick();
        fill.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear });
      }}
      onPressOut={() => {
        cancelAnimation(fill);
        fill.value = withTiming(0, { duration: 160 });
      }}
      onLongPress={onDone}
      onPress={() => ToastAndroid.show(t('Press and hold to finish'), ToastAndroid.SHORT)}
      style={{ flex: 1 }}
    >
      <View style={{ height: 54, borderRadius: 30, overflow: 'hidden', backgroundColor: '#FF5A5F', alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#C8343A' }, bar]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
          <Txt variant="button" color="white">
            {label}
          </Txt>
        </View>
      </View>
    </PressableScale>
  );
}

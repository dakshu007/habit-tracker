import { useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { CloseIcon } from '@/components/ui/icons';
import { CloudRain, Pause, Play, Volume2, VolumeX, Wind, type LucideIcon } from '@/components/ui/lucide';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { HabitArt } from '@/components/art/HabitArt';
import { useHabit, useHabitStore } from '@/store/useHabitStore';
import { getTheme } from '@/data/themes';
import { getArt } from '@/data/art';
import { hexToRgba } from '@/theme/color';
import { spacing } from '@/theme/tokens';
import { formatTime } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

type Sound = 'off' | 'rain' | 'ocean' | 'brown' | 'white';

const SOUNDS: { id: Sound; label: string; Icon: LucideIcon; source?: number }[] = [
  { id: 'off', label: 'Silent', Icon: VolumeX },
  { id: 'rain', label: 'Rain', Icon: CloudRain, source: require('../../assets/sounds/rain.wav') },
  { id: 'ocean', label: 'Ocean', Icon: Wind, source: require('../../assets/sounds/ocean.wav') },
  { id: 'brown', label: 'Deep', Icon: Volume2, source: require('../../assets/sounds/brown.wav') },
  { id: 'white', label: 'Static', Icon: Volume2, source: require('../../assets/sounds/white.wav') },
];
const CHIME = require('../../assets/sounds/chime.wav');
const DURATIONS = [5, 10, 15, 25, 45, 60];
const CHANNEL = 'reminders';

type Phase = 'idle' | 'running' | 'paused' | 'done';

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${`${s % 60}`.padStart(2, '0')}`;
}

/**
 * Focus session for a time-based habit: pick a length and an ambient sound,
 * then count down. An ongoing notification shows while it runs; a chime and a
 * notification mark the end, and the minutes are logged to the habit.
 */
export function FocusScreen({ navigation, route }: RootScreenProps<'Focus'>) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const habit = useHabit(route.params.habitId);
  const addValue = useHabitStore((s) => s.addValue);
  const today = useHabitStore((s) => s.today);

  const [minutes, setMinutes] = useState(25);
  const [sound, setSound] = useState<Sound>('rain');
  const [phase, setPhase] = useState<Phase>('idle');
  const [endAt, setEndAt] = useState(0);
  const [remaining, setRemaining] = useState(25 * 60_000);
  const [now, setNow] = useState(Date.now());
  const logged = useRef(0); // minutes already logged this session
  const ambient = useRef<AudioPlayer | null>(null);
  const ids = useRef<{ end?: string; ongoing?: string }>({});

  const total = minutes * 60_000;
  const left = phase === 'running' ? Math.max(0, endAt - now) : phase === 'idle' ? total : remaining;
  const frac = 1 - left / total;

  // Audio setup / teardown.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    return () => {
      ambient.current?.remove();
      clearNotifications();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ticker.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setNow(Date.now()));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [phase]);

  // Finish when the countdown reaches zero.
  useEffect(() => {
    if (habit && phase === 'running' && endAt && now >= endAt) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, phase, endAt]);

  const c = getTheme(habit?.themeId ?? 'sky');
  const art = getArt(habit?.artId ?? '');
  const title = habit?.title ?? '';
  const unitHours = !!habit?.unit.toLowerCase().startsWith('h');

  const playAmbient = (id: Sound) => {
    ambient.current?.remove();
    ambient.current = null;
    const src = SOUNDS.find((s) => s.id === id)?.source;
    if (!src) return;
    const p = createAudioPlayer(src);
    p.loop = true;
    p.volume = 0.7;
    p.play();
    ambient.current = p;
  };

  const clearNotifications = () => {
    const { end, ongoing } = ids.current;
    if (end) Notifications.cancelScheduledNotificationAsync(end).catch(() => {});
    if (ongoing) Notifications.dismissNotificationAsync(ongoing).catch(() => {});
    ids.current = {};
  };

  const scheduleNotifications = async (endTime: number) => {
    clearNotifications();
    const end = await Notifications.scheduleNotificationAsync({
      content: { title: t('Focus complete'), body: t('{habit} — nicely done. Your minutes are logged.', { habit: title }), data: { kind: 'focus' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endTime), channelId: CHANNEL },
    }).catch(() => undefined);
    const ongoing = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('Focusing on {habit}', { habit: title }),
        body: t('Ends at {time}', { time: formatTime(new Date(endTime).getHours(), new Date(endTime).getMinutes()) }),
        sticky: true,
        autoDismiss: false,
        data: { kind: 'focus' },
      },
      trigger: null,
    }).catch(() => undefined);
    ids.current = { end, ongoing };
  };

  const logMinutes = (mins: number) => {
    const whole = Math.round(mins * 10) / 10;
    const delta = whole - logged.current;
    if (delta < 0.1) return;
    logged.current = whole;
    if (!habit) return;
    addValue(habit.id, today, unitHours ? Math.round((delta / 60) * 100) / 100 : delta);
  };

  const start = () => {
    haptic.medium();
    const end = Date.now() + (phase === 'paused' ? remaining : total);
    setEndAt(end);
    setNow(Date.now());
    setPhase('running');
    playAmbient(sound);
    scheduleNotifications(end);
  };

  const pause = () => {
    haptic.light();
    setRemaining(Math.max(0, endAt - Date.now()));
    setPhase('paused');
    ambient.current?.pause();
    clearNotifications();
  };

  const finish = (natural: boolean) => {
    const elapsed = natural ? total : total - (phase === 'running' ? Math.max(0, endAt - Date.now()) : remaining);
    logMinutes(elapsed / 60_000);
    ambient.current?.remove();
    ambient.current = null;
    clearNotifications();
    setRemaining(0);
    setPhase('done');
    if (natural) {
      haptic.success();
      const chime = createAudioPlayer(CHIME);
      chime.play();
      setTimeout(() => chime.remove(), 3000);
    }
  };

  const close = () => {
    if (phase === 'running' || phase === 'paused') finish(false);
    navigation.goBack();
  };

  if (!habit) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#14141A' }}>
      <LinearGradient colors={[hexToRgba(c.accent, 0.55), '#14141A']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 520 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30, paddingHorizontal: spacing.screenX, gap: 26 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden', backgroundColor: art.bg }}>
            <HabitArt artId={habit.artId} mode="thumb" />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="micro" color="rgba(255,255,255,0.7)">
              {t('Focus')}
            </Txt>
            <Txt variant="h2" color="white" numberOfLines={1}>
              {habit.title}
            </Txt>
          </View>
          <GlassButton accessibilityLabel={t('Close')} fill="rgba(255,255,255,0.12)" onPress={close}>
            <CloseIcon size={20} color="#FFFFFF" />
          </GlassButton>
        </View>

        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <ProgressRing value={phase === 'done' ? 1 : frac} size={260} stroke={14} track="rgba(255,255,255,0.12)" from={c.bgTop} to={c.accent}>
            <Txt variant="display" color="white" style={{ fontSize: 56, lineHeight: 64 }}>
              {phase === 'done' ? t('Done') : mmss(left)}
            </Txt>
            <Txt variant="small" color="rgba(255,255,255,0.7)">
              {phase === 'done' ? t('{n} min logged', { n: Math.round(logged.current) }) : t('of {n} min', { n: minutes })}
            </Txt>
          </ProgressRing>
        </View>

        {phase === 'idle' && (
          <View style={{ gap: 10 }}>
            <Txt variant="micro" color="rgba(255,255,255,0.7)">
              {t('Length')}
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DURATIONS.map((d) => (
                <Chip key={d} label={t('{n} min', { n: d })} on={minutes === d} accent={c.accent} onPress={() => setMinutes(d)} />
              ))}
            </View>
          </View>
        )}

        {phase !== 'done' && (
          <View style={{ gap: 10 }}>
            <Txt variant="micro" color="rgba(255,255,255,0.7)">
              {t('Sound')}
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SOUNDS.map((s) => (
                <Chip
                  key={s.id}
                  label={t(s.label)}
                  Icon={s.Icon}
                  on={sound === s.id}
                  accent={c.accent}
                  onPress={() => {
                    setSound(s.id);
                    if (phase === 'running') playAmbient(s.id);
                  }}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ gap: 10, marginTop: 6 }}>
          {phase === 'idle' && <Button label={t('Start focus')} color={c.accent} icon={<Play size={18} color="#FFFFFF" fill="#FFFFFF" />} onPress={start} />}
          {phase === 'running' && <Button label={t('Pause')} color={c.accent} icon={<Pause size={18} color="#FFFFFF" fill="#FFFFFF" />} onPress={pause} />}
          {phase === 'paused' && <Button label={t('Resume')} color={c.accent} icon={<Play size={18} color="#FFFFFF" fill="#FFFFFF" />} onPress={start} />}
          {(phase === 'running' || phase === 'paused') && <Button label={t('Stop & log time')} variant="ghost" color="#FFFFFF" onPress={() => finish(false)} />}
          {phase === 'done' && <Button label={t('Back to my habits')} color={c.accent} onPress={() => navigation.goBack()} />}
        </View>
      </ScrollView>
    </View>
  );
}

function Chip({ label, on, accent, onPress, Icon }: { label: string; on: boolean; accent: string; onPress: () => void; Icon?: LucideIcon }) {
  return (
    <PressableScale onPress={onPress} silent>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          height: 38,
          borderRadius: 19,
          backgroundColor: on ? accent : 'rgba(255,255,255,0.1)',
        }}
      >
        {Icon && <Icon size={16} color="#FFFFFF" strokeWidth={2} />}
        <Txt variant="label" color="white">
          {label}
        </Txt>
      </View>
    </PressableScale>
  );
}

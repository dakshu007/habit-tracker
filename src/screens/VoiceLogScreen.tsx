import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown } from 'react-native-reanimated';

import { DeviceSignals } from '../../modules/device-signals';
import { Txt } from '@/components/ui/Txt';
import { Button } from '@/components/ui/Glass';
import { HabitArt } from '@/components/art/HabitArt';
import { Mic } from '@/components/ui/lucide';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { useMotion } from '@/theme/motion';
import { getTheme } from '@/data/themes';
import { parseVoiceLog, type VoiceLog } from '@/logic/voice';
import { valueOn } from '@/logic/habits';
import { qty } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import { getLang, t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

type State = { kind: 'listening' } | { kind: 'heard'; text: string; log: VoiceLog | null } | { kind: 'unavailable' } | { kind: 'logged'; text: string };

/**
 * Voice logging: "log 2 glasses of water", "ran 5 km", "done meditating".
 * Uses the phone's own speech recognizer (the app never records audio itself),
 * then asks for one tap to confirm. Opened from the mic on Quick log, the
 * app-icon shortcut, or habittracker://voice.
 */
export function VoiceLogScreen({ navigation }: RootScreenProps<'VoiceLog'>) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const m = useMotion();
  const habits = useHabitStore((s) => s.habits);
  const today = useHabitStore((s) => s.today);
  const [state, setState] = useState<State>({ kind: 'listening' });

  const listen = async () => {
    if (!DeviceSignals?.canRecognizeSpeech()) return setState({ kind: 'unavailable' });
    setState({ kind: 'listening' });
    try {
      const results = await DeviceSignals.recognizeSpeech(t('Say what you did — e.g. “2 glasses of water”'), getLang() === 'hi' ? 'hi-IN' : null);
      if (!results.length) return close();
      const active = useHabitStore.getState().habits.filter((h) => !h.archived && !h.quit);
      // Prefer the first alternative that names a habit.
      const hit = results.map((text) => ({ text, log: parseVoiceLog(text, active) })).find((r) => r.log) ?? { text: results[0], log: null };
      haptic.tick();
      setState({ kind: 'heard', ...hit });
    } catch {
      setState({ kind: 'unavailable' });
    }
  };

  useEffect(() => {
    listen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Main');
  };

  const confirm = (log: VoiceLog) => {
    const store = useHabitStore.getState();
    const cur = valueOn(store.logs, today, log.habit.id);
    const amount = log.complete ? Math.max(0, log.habit.goalValue - cur) : log.amount;
    if (amount > 0) store.addValue(log.habit.id, today, amount);
    if (cur + amount >= log.habit.goalValue) haptic.success();
    else haptic.light();
    setState({ kind: 'logged', text: t('{amount} added to {habit}', { amount: qty(amount, log.habit.unit), habit: log.habit.title }) });
    setTimeout(close, 1100);
  };

  const describe = (log: VoiceLog) => {
    const cur = valueOn(useHabitStore.getState().logs, today, log.habit.id);
    if (cur >= log.habit.goalValue) return t('{habit} is already done today.', { habit: log.habit.title });
    return log.complete ? t('Mark {habit} as done?', { habit: log.habit.title }) : t('Add {amount} to {habit}?', { amount: qty(log.amount, log.habit.unit), habit: log.habit.title });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable accessibilityLabel={t('Close')} onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,16,0.55)' }} />
      <Animated.View
        entering={m.enter === 'none' ? undefined : SlideInDown.springify().damping(m.enterSpring.damping * 1.2).stiffness(m.enterSpring.stiffness * 1.4)}
        style={{ margin: 8, marginBottom: Math.max(insets.bottom, 8), borderRadius: 32, backgroundColor: theme.cardElevated, padding: 20, gap: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#4C8DF6', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={20} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Txt variant="h2" style={{ flex: 1 }}>
            {t('Voice log')}
          </Txt>
        </View>

        {state.kind === 'listening' && (
          <Txt variant="bodyRegular" color="secondary">
            {t('Listening…')}
          </Txt>
        )}

        {state.kind === 'unavailable' && (
          <>
            <Txt variant="bodyRegular" color="secondary">
              {t('Voice typing isn’t available on this phone. Install or turn on Google voice typing, then try again.')}
            </Txt>
            <Button label={t('Close')} onPress={close} />
          </>
        )}

        {state.kind === 'logged' && (
          <Txt variant="h3" color="success">
            {state.text}
          </Txt>
        )}

        {state.kind === 'heard' && (
          <>
            <Txt variant="small" color="secondary">
              “{state.text}”
            </Txt>
            {state.log ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20, backgroundColor: theme.inputBg }}>
                  <View style={{ width: 48, height: 48, borderRadius: 16, overflow: 'hidden' }}>
                    <HabitArt artId={state.log.habit.artId} mode="thumb" />
                  </View>
                  <Txt variant="h3" style={{ flex: 1 }}>
                    {describe(state.log)}
                  </Txt>
                </View>
                {valueOn(useHabitStore.getState().logs, today, state.log.habit.id) < state.log.habit.goalValue && (
                  <Button label={t('Log it')} color={getTheme(state.log.habit.themeId).accent} onPress={() => confirm((state as { log: VoiceLog }).log)} />
                )}
              </>
            ) : (
              <Txt variant="bodyRegular">
                {habits.length ? t('I couldn’t match that to a habit. Try saying the habit’s name, like “10 minutes meditate”.') : t('Add a habit first, then log it by voice.')}
              </Txt>
            )}
            <Button label={t('Try again')} variant="ghost" onPress={listen} />
          </>
        )}
      </Animated.View>
    </View>
  );
}

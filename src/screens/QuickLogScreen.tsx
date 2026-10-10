import { BackHandler, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { CheckIcon, PlusIcon } from '@/components/ui/icons';
import { HabitArt } from '@/components/art/HabitArt';
import { Mic } from '@/components/ui/lucide';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { useMotion } from '@/theme/motion';
import { hexToRgba } from '@/theme/color';
import { dueOn, valueOn } from '@/logic/habits';
import { getTheme } from '@/data/themes';
import { fmtNumber, qty } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';
import { useRequireUnlock } from '@/navigation/useRequireUnlock';

/**
 * Quick log sheet — opened from the Quick Settings tile (habittracker://quick-log).
 * + adds one step; tapping the check opens the real slide-to-complete.
 */
export function QuickLogScreen({ navigation }: RootScreenProps<'QuickLog'>) {
  useRequireUnlock();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const m = useMotion();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const addValue = useHabitStore((s) => s.addValue);
  const due = dueOn(habits, today);

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Main');
    setTimeout(() => BackHandler.exitApp(), 80);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable accessibilityLabel={t('Close')} onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,16,0.55)' }} />
      <Animated.View
        entering={m.enter === 'none' ? undefined : SlideInDown.springify().damping(m.enterSpring.damping * 1.2).stiffness(m.enterSpring.stiffness * 1.4)}
        style={{ margin: 8, marginBottom: Math.max(insets.bottom, 8), borderRadius: 32, backgroundColor: theme.cardElevated, padding: 18, gap: 12, maxHeight: '80%' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Txt variant="h2" style={{ flex: 1 }}>
            {t('Quick log')}
          </Txt>
          <PressableScale accessibilityLabel={t('Voice log')} onPress={() => navigation.replace('VoiceLog')} style={{ marginRight: 16 }}>
            <View style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: hexToRgba('#4C8DF6', 0.14) }}>
              <Mic size={16} color="#4C8DF6" strokeWidth={2.2} />
              <Txt variant="label" color="#4C8DF6">
                {t('Speak')}
              </Txt>
            </View>
          </PressableScale>
          <Pressable onPress={close} hitSlop={10}>
            <Txt variant="label" color="secondary">
              {t('Done')}
            </Txt>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 8 }}>
          {due.length === 0 && (
            <Txt variant="bodyRegular" color="secondary" style={{ paddingVertical: 14 }}>
              {t('Nothing due today.')}
            </Txt>
          )}
          {due.map((h) => {
            const v = valueOn(logs, today, h.id);
            const done = v >= h.goalValue;
            const c = getTheme(h.themeId);
            return (
              <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 20, backgroundColor: theme.inputBg }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden' }}>
                  <HabitArt artId={h.artId} mode="thumb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="h3" numberOfLines={1}>
                    {h.title}
                  </Txt>
                  <Txt variant="small" color="secondary">
                    {fmtNumber(v)} / {qty(h.goalValue, h.unit)}
                  </Txt>
                </View>
                {!done && !h.quit && (
                  <PressableScale
                    accessibilityLabel={t('Add {amount}', { amount: qty(h.step, h.unit) })}
                    onPress={() => {
                      addValue(h.id, today, h.step);
                      haptic.light();
                    }}
                  >
                    <View style={{ height: 38, paddingHorizontal: 12, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: hexToRgba(c.accent, 0.14) }}>
                      <PlusIcon size={15} color={c.accent} strokeWidth={2.6} />
                      <Txt variant="label" color={c.accent}>
                        {fmtNumber(h.step)}
                      </Txt>
                    </View>
                  </PressableScale>
                )}
                <PressableScale
                  disabled={done}
                  silent={done}
                  accessibilityLabel={done ? t('{habit} done', { habit: h.title }) : t('Complete {habit}', { habit: h.title })}
                  onPress={() => navigation.navigate('QuickComplete', { id: h.id })}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: done ? '#34C759' : 'transparent',
                      borderWidth: done ? 0 : 2,
                      borderColor: theme.progressTrack,
                    }}
                  >
                    <CheckIcon size={18} color={done ? '#FFFFFF' : theme.textTertiary} strokeWidth={3} />
                  </View>
                </PressableScale>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

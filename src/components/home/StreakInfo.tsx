import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { Button } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { FlameIcon } from '@/components/ui/icons';
import { Bed, Snowflake } from '@/components/ui/lucide';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { bestCurrentStreak } from '@/logic/habits';
import { t } from '@/i18n';

/** Explains streaks, streak freezes and rest days. */
export function StreakInfo() {
  const { theme } = useTheme();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  const freezes = useHabitStore((s) => s.extras.freezes);
  const best = bestCurrentStreak(habits, logs, today, weekStart);

  const row = (icon: React.ReactNode, title: string, body: string) => (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="h3">{title}</Txt>
        <Txt variant="small" color="secondary">
          {body}
        </Txt>
      </View>
    </View>
  );

  return (
    <View style={{ padding: 22, gap: 18 }}>
      <Txt variant="h2">{t('Streaks')}</Txt>
      {row(
        <FlameIcon size={22} />,
        best?.streak.current ? t('{n}-day streak on {habit}', { n: best.streak.current, habit: best.habit.title }) : t('No streak yet'),
        t('Complete a habit on each scheduled day to grow its streak.'),
      )}
      {row(
        <Snowflake size={22} color="#5AB8F0" strokeWidth={2} />,
        t('{n} of 3 streak freezes', { n: freezes }),
        t('You earn a freeze every time a habit reaches a new 7-day streak. If you miss a day, a freeze is used automatically so your streak survives.'),
      )}
      {row(
        <Bed size={22} color="#9B6BF2" strokeWidth={2} />,
        t('Rest days'),
        t('Planned a break? Mark a day as a rest day from the Day view. Streaks pause instead of breaking.'),
      )}
      <Button label={t('Got it')} onPress={overlay.close} />
    </View>
  );
}

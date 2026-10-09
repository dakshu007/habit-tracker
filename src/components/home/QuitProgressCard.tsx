import { Alert, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { Button } from '@/components/ui/Glass';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { radius, spacing } from '@/theme/tokens';
import { daysClean, isDoneOn, moneySaved } from '@/logic/habits';
import { getTheme } from '@/data/themes';
import { MONTH_LABELS, fromKey } from '@/utils/date';
import { fmtNumber } from '@/utils/format';
import { t } from '@/i18n';
import type { Habit } from '@/data/types';

/** Progress card for "quit" habits: days clean, money saved, slips. */
export function QuitProgressCard({ habit }: { habit: Habit }) {
  const { theme, isDark } = useTheme();
  const today = useHabitStore((s) => s.today);
  const day = useHabitStore((s) => s.selectedDay);
  const currency = useHabitStore((s) => s.settings.currency);
  const confirmedToday = useHabitStore((s) => isDoneOn(habit, s.logs, day));
  const slip = useHabitStore((s) => s.slip);

  const q = habit.quit!;
  const c = getTheme(habit.themeId);
  const clean = daysClean(habit, today);
  const saved = moneySaved(habit, today);
  const lastSlip = [...q.slips].sort().pop();
  const since = lastSlip ?? habit.createdAt.slice(0, 10);
  const sinceDate = fromKey(since);
  const best = longestClean(habit, today);

  return (
    <View style={{ backgroundColor: theme.cardSurface, borderRadius: radius.progressCard, padding: spacing.cardPad, gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt variant="progressTitle" numberOfLines={1}>
            {habit.title}
          </Txt>
          <Txt variant="progressSubtitle" color="secondaryStrong">
            {t('Clean since {date}', { date: `${sinceDate.getDate()} ${MONTH_LABELS[sinceDate.getMonth()].slice(0, 3)}` })}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <Txt variant="bigValue">{clean}</Txt>
          <Txt variant="bigValueUnit" color="secondaryStrong" style={{ marginBottom: 7 }}>
            {clean === 1 ? t('day') : t('days')}
          </Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Tile label={t('Saved')} value={q.costPerDay > 0 ? `${currency}${fmtNumber(saved)}` : '—'} accent={c.accent} bg={isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'} />
        <Tile label={t('Best run')} value={`${best}`} accent={c.accent} bg={isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'} />
        <Tile label={t('Slips')} value={`${q.slips.length}`} accent={c.accent} bg={isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'} />
      </View>

      <View style={{ padding: 14, borderRadius: 20, backgroundColor: hexToRgba(c.accent, isDark ? 0.2 : 0.1) }}>
        <Txt variant="small" color="secondaryStrong">
          {confirmedToday
            ? t('Today is confirmed clean. Every day you hold on, it gets a little easier.')
            : t('Slide the card above at the end of the day to confirm it was clean.')}
        </Txt>
      </View>

      <Button
        label={t('I slipped today')}
        variant="ghost"
        color={theme.textSecondary}
        onPress={() =>
          Alert.alert(t('Log a slip?'), t('Your clean-day counter for {habit} restarts. That’s okay — every restart is still progress.', { habit: habit.title }), [
            { text: t('Cancel'), style: 'cancel' },
            { text: t('I slipped'), style: 'destructive', onPress: () => slip(habit.id, day) },
          ])
        }
      />
    </View>
  );
}

function Tile({ label, value, accent, bg }: { label: string; value: string; accent: string; bg: string }) {
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: bg, gap: 2 }}>
      <Txt variant="micro" color="secondary">
        {label}
      </Txt>
      <Txt variant="statSmall" color={accent} numberOfLines={1}>
        {value}
      </Txt>
    </View>
  );
}

/** Longest gap between slips (in days), including the current run. */
function longestClean(h: Habit, today: string): number {
  const marks = [h.createdAt.slice(0, 10), ...(h.quit?.slips ?? []).slice().sort(), today];
  let best = 0;
  for (let i = 1; i < marks.length; i++) {
    const d = Math.round((fromKey(marks[i]).getTime() - fromKey(marks[i - 1]).getTime()) / 86_400_000);
    best = Math.max(best, d);
  }
  return Math.max(best, daysClean(h, today));
}

import { useMemo } from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { HabitArt } from '@/components/art/HabitArt';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { getTheme } from '@/data/themes';
import { isScheduledOn, nextDueKey } from '@/logic/habits';
import { DAY_LABELS, fromKey } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';

/**
 * Under today's cards: the habits that aren't on today's list, and when they
 * are. Picked "Running" but it's Sunday? It shows here as "Running · Mon"
 * instead of looking lost. Weekly goals jump to the Weekly tab.
 */
export function NotToday({ day }: { day: string }) {
  const { theme, isDark } = useTheme();
  const habits = useHabitStore((s) => s.habits);
  const setFilter = useHabitStore((s) => s.setFilter);
  const setSelectedDay = useHabitStore((s) => s.setSelectedDay);

  const items = useMemo(
    () =>
      habits
        .filter((h) => !h.archived && (h.schedule.kind === 'weekly' || !isScheduledOn(h, day)))
        .map((h) => {
          if (h.schedule.kind === 'weekly') return { h, label: t('{n}× a week', { n: h.schedule.timesPerWeek }), next: null as string | null };
          const next = nextDueKey(h, day);
          return { h, label: next ? t(DAY_LABELS[fromKey(next).getDay()]) : '', next };
        }),
    [habits, day],
  );

  if (!items.length) return null;

  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <Txt variant="micro" color="tertiary" style={{ textAlign: 'center' }}>
        {t('Not on today’s list')}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        {items.map(({ h, label, next }) => (
          <PressableScale
            key={h.id}
            scaleTo={0.96}
            onPress={() => {
              haptic.tick();
              if (next) setSelectedDay(next);
              else setFilter('weekly');
            }}
            accessibilityLabel={next ? t('{habit}, next on {day}', { habit: h.title, day: label }) : t('{habit}, in Weekly tasks', { habit: h.title })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 12, height: 36, borderRadius: 18, backgroundColor: isDark ? theme.cardElevated : '#FFFFFF', borderWidth: 1, borderColor: theme.hairline }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, overflow: 'hidden' }}>
                <HabitArt artId={h.artId} colors={getTheme(h.themeId)} compact />
              </View>
              <Txt variant="label" numberOfLines={1}>
                {h.title}
              </Txt>
              <Txt variant="small" color="secondary">
                {label}
              </Txt>
            </View>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

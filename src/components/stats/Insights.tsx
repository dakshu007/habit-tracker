import { useMemo } from 'react';
import { View } from 'react-native';

import { Card, SectionTitle } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Clock, FaceSlightlySmiling as Smile, HeartHandshake, MoonStar, Sun, Sunrise, Sunset, type LucideIcon } from '@/components/ui/lucide';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { bestTimes, findInsights, type DayPart, type Insight } from '@/logic/insights';
import { formatTime } from '@/utils/date';
import { pct } from '@/utils/format';
import { t } from '@/i18n';

const PARTS: Record<DayPart, { label: string; Icon: LucideIcon; color: string }> = {
  morning: { label: 'Morning', Icon: Sunrise, color: '#F5A623' },
  afternoon: { label: 'Afternoon', Icon: Sun, color: '#FF8A3D' },
  evening: { label: 'Evening', Icon: Sunset, color: '#E0638C' },
  night: { label: 'Night', Icon: MoonStar, color: '#7E6CF0' },
};

function duration(mins: number): string {
  const m = Math.abs(mins);
  return m >= 60 ? t('{h} h {m} min', { h: Math.floor(m / 60), m: m % 60 }) : t('{m} min', { m });
}

function describe(i: Insight): { Icon: LucideIcon; color: string; title: string; sub: string } {
  if (i.kind === 'sleep') {
    return {
      Icon: MoonStar,
      color: '#8E7CF5',
      title: i.minutes > 0 ? t('You sleep {time} more after {habit} days', { time: duration(i.minutes), habit: i.habit.title }) : t('You sleep {time} less after {habit} days', { time: duration(i.minutes), habit: i.habit.title }),
      sub: t('Compared over {a} nights with it and {b} without.', { a: i.withDays, b: i.withoutDays }),
    };
  }
  if (i.kind === 'mood') {
    return {
      Icon: Smile,
      color: '#3FC1A5',
      title: t('You feel better on days you do {habit}', { habit: i.habit.title }),
      sub: t('Average mood {a} vs {b} (out of 4).', { a: i.withMood.toFixed(1), b: i.withoutMood.toFixed(1) }),
    };
  }
  return {
    Icon: HeartHandshake,
    color: '#4C8DF6',
    title: t('{habit} pulls {other} along', { habit: i.habit.title, other: i.other.title }),
    sub: t('On {habit} days you finish {other} {a} of the time, vs {b} on other days.', { habit: i.habit.title, other: i.other.title, a: pct(i.withRate), b: pct(i.withoutRate) }),
  };
}

/** "What your data says": correlations and the time of day each habit usually gets done. */
export function Insights() {
  const { theme, isDark } = useTheme();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const insights = useMemo(() => findInsights(habits, logs, today).slice(0, 4), [habits, logs, today]);
  const times = useMemo(() => bestTimes(habits, logs, today).slice(0, 5), [habits, logs, today]);

  return (
    <>
      <SectionTitle>{t('Insights')}</SectionTitle>
      <Card style={{ gap: 14 }}>
        {insights.length === 0 ? (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.inputBg }}>
              <Clock size={19} color={theme.textSecondary} strokeWidth={2} />
            </View>
            <Txt variant="small" color="secondary" style={{ flex: 1 }}>
              {t('Keep logging for a couple of weeks. Patterns like “you sleep better on workout days” show up here.')}
            </Txt>
          </View>
        ) : (
          insights.map((i) => {
            const d = describe(i);
            return (
              <View key={`${i.kind}${i.habit.id}`} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(d.color, isDark ? 0.22 : 0.12) }}>
                  <d.Icon size={19} color={d.color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="h3">{d.title}</Txt>
                  <Txt variant="small" color="secondary">
                    {d.sub}
                  </Txt>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {times.length > 0 && (
        <>
          <SectionTitle>{t('Your best time of day')}</SectionTitle>
          <Card style={{ gap: 12 }}>
            {times.map((b) => {
              const part = PARTS[b.part];
              return (
                <View key={b.habit.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(part.color, isDark ? 0.22 : 0.13) }}>
                    <part.Icon size={19} color={part.color} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3" numberOfLines={1}>
                      {b.habit.title}
                    </Txt>
                    <Txt variant="small" color="secondary">
                      {t('Usually around {time} · {part} {pct}', { time: formatTime(Math.floor(b.typical / 60), b.typical % 60), part: t(part.label).toLowerCase(), pct: pct(b.share) })}
                    </Txt>
                  </View>
                </View>
              );
            })}
            <Txt variant="small" color="tertiary">
              {t('Tip: set each habit’s reminder a little before its best time.')}
            </Txt>
          </Card>
        </>
      )}
    </>
  );
}

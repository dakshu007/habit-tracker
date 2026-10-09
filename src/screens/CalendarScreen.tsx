import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Screen, Card } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { ChevronLeft, ChevronRight, CheckIcon } from '@/components/ui/icons';
import { HabitArt } from '@/components/art/HabitArt';
import { heatColor } from '@/components/charts/HeatCell';
import { useHabitStore } from '@/store/useHabitStore';
import { useTabs } from '@/navigation/MainTabs';
import { useTheme } from '@/theme/ThemeContext';
import { palette, spacing } from '@/theme/tokens';
import { dayCompletion, dueOn, isRestDay, isScheduledOn, valueOn, weeklyHabits } from '@/logic/habits';
import { Bed } from '@/components/ui/lucide';
import { hexToRgba } from '@/theme/color';
import { t } from '@/i18n';
import { getTheme } from '@/data/themes';
import { DAY_LETTERS, MONTH_LABELS, fromKey, monthGrid, relativeDayLabel, weekdayOrder } from '@/utils/date';
import { fmtNumber, pct, qty } from '@/utils/format';
import { haptic } from '@/utils/haptics';

const BRAND = '#4C8DF6';

export function CalendarScreen() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);

  const now = fromKey(today);
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [habitId, setHabitId] = useState<string | null>(null);

  const live = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const habit = live.find((h) => h.id === habitId) ?? null;
  const accent = habit ? getTheme(habit.themeId).accent : BRAND;

  const cells = useMemo(() => monthGrid(ym.y, ym.m, weekStart), [ym, weekStart]);
  const valueFor = (key: string): number | null => {
    if (key > today) return null;
    if (!habit) return dayCompletion(live, logs, key);
    if (!isScheduledOn(habit, key)) return null;
    return habit.goalValue ? Math.min(1, valueOn(logs, key, habit.id) / habit.goalValue) : 0;
  };

  const summary = useMemo(() => {
    let perfect = 0;
    let sum = 0;
    let n = 0;
    for (const k of cells) {
      if (!k || k > today) continue;
      const v = valueFor(k);
      if (v === null) continue;
      if (v >= 1) perfect++;
      sum += v;
      n++;
    }
    return { perfect, rate: n ? sum / n : 0 };
  }, [cells, logs, live, habit, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const shift = (d: number) => {
    haptic.tick();
    setYm(({ y, m }) => {
      const nm = m + d;
      return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  };

  const cell = Math.floor((width - spacing.screenX * 2 - 36 - 6 * 6) / 7);

  return (
    <Screen
      title={t('Calendar')}
      subtitle={t('Every check-in, day by day.')}
      accent={accent}
      right={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <GlassButton accessibilityLabel={t('Previous month')} size={40} onPress={() => shift(-1)}>
            <ChevronLeft size={18} color={theme.textPrimary} strokeWidth={2.4} />
          </GlassButton>
          <GlassButton accessibilityLabel={t('Next month')} size={40} onPress={() => shift(1)}>
            <ChevronRight size={18} color={theme.textPrimary} strokeWidth={2.4} />
          </GlassButton>
        </View>
      }
    >
      {/* Habit filter */}
      <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.screenX }} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.screenX }}>
        <Chip label={t('All habits')} color={BRAND} active={!habit} onPress={() => setHabitId(null)} />
        {live.map((h) => (
          <Chip key={h.id} label={h.title} color={getTheme(h.themeId).accent} active={habit?.id === h.id} onPress={() => setHabitId(h.id)} />
        ))}
      </GHScrollView>

      <Card style={{ gap: 14 }}>
        <Animated.View key={`${ym.y}-${ym.m}`} entering={FadeIn.duration(250)} style={{ gap: 14 }}>
          <Txt variant="h2">
            {t(MONTH_LABELS[ym.m])} {ym.y}
          </Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {weekdayOrder(weekStart).map((d, i) => (
              <Txt key={i} variant="label" color="secondary" style={{ width: cell, textAlign: 'center' }}>
                {t(DAY_LETTERS[d])}
              </Txt>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, justifyContent: 'space-between' }}>
            {cells.map((key, i) => {
              if (!key) return <View key={`e${i}`} style={{ width: cell, height: cell }} />;
              const v = valueFor(key);
              const strong = v !== null && v >= 0.6;
              const isToday = key === today;
              const future = key > today;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    haptic.light();
                    overlay.open(<DaySheet day={key} />);
                  }}
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: cell * 0.32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isRestDay(logs, key) ? hexToRgba('#9B6BF2', 0.2) : heatColor(v, accent, theme.inputBg),
                    borderWidth: isToday ? 2 : 0,
                    borderColor: theme.textPrimary,
                    opacity: future ? 0.45 : 1,
                  }}
                >
                  <Txt variant="label" color={strong ? 'white' : 'primary'}>
                    {fromKey(key).getDate()}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Txt variant="small" color="secondary">
              {t('Less')}
            </Txt>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <View key={v} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: heatColor(v, accent, theme.inputBg) }} />
            ))}
            <Txt variant="small" color="secondary">
              {t('More')}
            </Txt>
          </View>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }} delay={80}>
          <Txt variant="stat">{summary.perfect}</Txt>
          <Txt variant="small" color="secondary">
            {habit ? t('Goal days this month') : t('Perfect days this month')}
          </Txt>
        </Card>
        <Card style={{ flex: 1 }} delay={120}>
          <Txt variant="stat">{pct(summary.rate)}</Txt>
          <Txt variant="small" color="secondary">
            {t('Average completion')}
          </Txt>
        </Card>
      </View>
    </Screen>
  );
}

function Chip({ label, color, active, onPress }: { label: string; color: string; active: boolean; onPress: () => void }) {
  const { theme, isDark } = useTheme();
  return (
    <PressableScale
      onPress={() => {
        haptic.tick();
        onPress();
      }}
      silent
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          paddingHorizontal: 14,
          height: 38,
          borderRadius: 19,
          backgroundColor: active ? color : isDark ? theme.cardElevated : '#FFFFFF',
          borderWidth: 1,
          borderColor: active ? color : theme.hairline,
        }}
      >
        {!active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />}
        <Txt variant="label" color={active ? 'white' : 'primary'}>
          {label}
        </Txt>
      </View>
    </PressableScale>
  );
}

/** Bottom sheet for one day: status of each habit + quick check-off. */
function DaySheet({ day }: { day: string }) {
  const { theme } = useTheme();
  const { go } = useTabs();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const complete = useHabitStore((s) => s.complete);
  const setSelectedDay = useHabitStore((s) => s.setSelectedDay);
  const toggleRestDay = useHabitStore((s) => s.toggleRestDay);
  const rest = useHabitStore((s) => isRestDay(s.logs, day));

  const list = [...dueOn(habits, day), ...weeklyHabits(habits)];
  const future = day > today;
  const frac = dayCompletion(habits, logs, day);

  return (
    <View style={{ padding: 20, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Txt variant="title">{relativeDayLabel(day)}</Txt>
          <Txt variant="small" color="secondary">
            {future ? t('Coming up') : frac === null ? t('Nothing scheduled') : t('{pct} complete', { pct: pct(frac) })}
          </Txt>
        </View>
      </View>
      <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
        {list.length === 0 && (
          <Txt variant="bodyRegular" color="secondary">
            {t('No habits on this day.')}
          </Txt>
        )}
        {list.map((h) => {
          const c = getTheme(h.themeId);
          const v = valueOn(logs, day, h.id);
          const done = v >= h.goalValue;
          return (
            <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 20, backgroundColor: theme.inputBg }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden' }}>
                <HabitArt artId={h.artId} colors={c} compact />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="h3" numberOfLines={1}>
                  {h.title}
                </Txt>
                <Txt variant="small" color="secondary">
                  {fmtNumber(v)} / {qty(h.goalValue, h.unit)}
                </Txt>
              </View>
              <PressableScale
                disabled={day !== today}
                silent={done}
                accessibilityLabel={done ? t('{habit} done', { habit: h.title }) : t('Complete {habit}', { habit: h.title })}
                onPress={() => {
                  if (done) return; // completions are final
                  complete(h.id, day);
                  haptic.success();
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    marginRight: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? palette.success : 'transparent',
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
      {day >= today && (
      <PressableScale onPress={() => toggleRestDay(day)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: rest ? hexToRgba('#9B6BF2', 0.16) : theme.inputBg }}>
          <Bed size={18} color="#9B6BF2" strokeWidth={2} />
          <Txt variant="label" style={{ flex: 1 }}>
            {rest ? t('Rest day — tap to undo') : t('Mark as a rest day')}
          </Txt>
        </View>
      </PressableScale>
      )}
      <Button
        label={t('Open this day on Home')}
        onPress={() => {
          setSelectedDay(day);
          overlay.close();
          go('Home');
        }}
      />
    </View>
  );
}

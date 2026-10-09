import { useEffect, useMemo } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton } from '@/components/ui/Glass';
import { Card, SectionTitle } from '@/components/ui/Screen';
import { ChevronLeft, EditIcon, FlameIcon, TrophyIcon, CheckIcon, SparkleIcon } from '@/components/ui/icons';
import { HabitArt } from '@/components/art/HabitArt';
import { heatColor } from '@/components/charts/HeatCell';
import { useHabitStore, useHabit } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { spacing } from '@/theme/tokens';
import { completionRate, isScheduledOn, streakFor, valueOn } from '@/logic/habits';
import { getTheme } from '@/data/themes';
import { DAY_LABELS, DAY_LETTERS, addDays, dayKey, formatTime, fromKey, relativeDayLabel, startOfWeek, weekdayOrder } from '@/utils/date';
import { fmtNumber, pct } from '@/utils/format';
import type { RootScreenProps } from '@/navigation/types';

const WEEKS = 16;

export function HabitDetailScreen({ navigation, route }: RootScreenProps<'HabitDetail'>) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const habit = useHabit(route.params.id);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);

  useEffect(() => {
    if (!habit) navigation.goBack();
  }, [habit, navigation]);

  const data = useMemo(() => {
    if (!habit) return null;
    let total = 0;
    const history: { key: string; value: number }[] = [];
    for (const [k, day] of Object.entries(logs)) {
      const e = day[habit.id];
      if (!e || e.value <= 0) continue;
      total += e.value;
      history.push({ key: k, value: e.value });
    }
    history.sort((a, b) => (a.key < b.key ? 1 : -1));
    return {
      streak: streakFor(habit, logs, today, weekStart),
      rate: completionRate(habit, logs, today, 30, weekStart),
      total,
      history: history.slice(0, 12),
    };
  }, [habit, logs, today, weekStart]);

  if (!habit || !data) return null;
  const c = getTheme(habit.themeId);

  // Heatmap: WEEKS columns × 7 rows, ending with the current week.
  const firstCol = addDays(startOfWeek(fromKey(today), weekStart), -7 * (WEEKS - 1));
  const gridW = width - spacing.screenX * 2 - 36 - 22;
  const cell = Math.floor((gridW - (WEEKS - 1) * 3) / WEEKS);

  const scheduleText =
    habit.schedule.kind === 'daily'
      ? 'Every day'
      : habit.schedule.kind === 'weekly'
        ? `${habit.schedule.timesPerWeek}× a week`
        : habit.schedule.days.map((d) => DAY_LABELS[d]).join(', ');

  return (
    <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ height: 340 + insets.top, backgroundColor: c.cardTint }}>
          <HabitArt artId={habit.artId} colors={c} />
          <LinearGradient
            colors={[hexToRgba(theme.screenBase, 0), theme.screenBase]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 }}
          />
        </View>

        <View style={{ paddingHorizontal: spacing.screenX, marginTop: -60, gap: 16 }}>
          <View style={{ gap: 6 }}>
            <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: c.accent }}>
              <Txt variant="micro" color="white">
                {scheduleText} · {fmtNumber(habit.goalValue)} {habit.unit}
              </Txt>
            </View>
            <Txt variant="display">{habit.title}</Txt>
            {habit.subtitle ? (
              <Txt variant="body" color="secondary">
                {habit.subtitle}
              </Txt>
            ) : null}
            {habit.reminder.enabled && (
              <Txt variant="small" color="secondary">
                Reminder at {formatTime(habit.reminder.hour, habit.reminder.minute)}
              </Txt>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Stat icon={<FlameIcon size={20} />} value={`${data.streak.current}`} label={`${data.streak.unit} streak`} />
            <Stat icon={<TrophyIcon size={20} color="#F5A623" />} value={`${data.streak.best}`} label="Best streak" />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Stat icon={<CheckIcon size={20} color="#34C759" strokeWidth={2.8} />} value={pct(data.rate)} label="Last 30 days" />
            <Stat icon={<SparkleIcon size={20} color={c.accent} />} value={fmtNumber(data.total)} label={`${habit.unit} all time`} />
          </View>

          <SectionTitle>{`Last ${WEEKS} weeks`}</SectionTitle>
          <Card style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ gap: 3 }}>
              {weekdayOrder(weekStart).map((d, i) => (
                <Txt key={i} variant="micro" color="secondary" style={{ height: cell, lineHeight: cell, width: 16 }}>
                  {i % 2 === 0 ? DAY_LETTERS[d] : ''}
                </Txt>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {Array.from({ length: WEEKS }, (_, w) => (
                <View key={w} style={{ gap: 3 }}>
                  {Array.from({ length: 7 }, (_, r) => {
                    const k = dayKey(addDays(firstCol, w * 7 + r));
                    const future = k > today;
                    const v = future || !isScheduledOn(habit, k) ? null : Math.min(1, valueOn(logs, k, habit.id) / habit.goalValue);
                    return (
                      <View
                        key={r}
                        style={{
                          width: cell,
                          height: cell,
                          borderRadius: cell * 0.3,
                          backgroundColor: future ? 'transparent' : heatColor(v, c.accent, theme.inputBg),
                          borderWidth: k === today ? 1.5 : 0,
                          borderColor: theme.textPrimary,
                        }}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </Card>

          <SectionTitle>Recent activity</SectionTitle>
          <Card style={{ paddingVertical: 6 }}>
            {data.history.length === 0 ? (
              <Txt variant="bodyRegular" color="secondary" style={{ paddingVertical: 14, textAlign: 'center' }}>
                Nothing logged yet — your first check-in will show here.
              </Txt>
            ) : (
              data.history.map((e, i) => {
                const done = e.value >= habit.goalValue;
                return (
                  <View
                    key={e.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      gap: 12,
                      borderBottomWidth: i === data.history.length - 1 ? 0 : 1,
                      borderBottomColor: theme.hairline,
                    }}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: done ? c.accent : hexToRgba(c.accent, 0.35) }} />
                    <Txt variant="h3" style={{ flex: 1 }}>
                      {relativeDayLabel(e.key)}
                    </Txt>
                    <Txt variant="label" color={done ? 'primary' : 'secondary'}>
                      {fmtNumber(e.value)} / {fmtNumber(habit.goalValue)} {habit.unit}
                    </Txt>
                  </View>
                );
              })
            )}
          </Card>

          <Button label="Edit habit" color={c.accent} icon={<EditIcon size={18} color="#FFFFFF" />} onPress={() => navigation.navigate('HabitEditor', { id: habit.id })} />
        </View>
      </ScrollView>

      {/* Floating back button */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: spacing.screenX, right: spacing.screenX, flexDirection: 'row', justifyContent: 'space-between' }}>
        <GlassButton accessibilityLabel="Back" fill="rgba(255,255,255,0.55)" onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color="#1C1B22" strokeWidth={2.4} />
        </GlassButton>
        <GlassButton accessibilityLabel="Edit" fill="rgba(255,255,255,0.55)" onPress={() => navigation.navigate('HabitEditor', { id: habit.id })}>
          <EditIcon size={18} color="#1C1B22" />
        </GlassButton>
      </View>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card style={{ flex: 1, gap: 8 }}>
      {icon}
      <View>
        <Txt variant="stat">{value}</Txt>
        <Txt variant="small" color="secondary" style={{ textTransform: 'capitalize' }}>
          {label}
        </Txt>
      </View>
    </Card>
  );
}

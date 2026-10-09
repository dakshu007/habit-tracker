import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { CheckIcon } from '@/components/ui/icons';
import { HabitArt } from '@/components/art/HabitArt';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { BarChart } from '@/components/charts/BarChart';
import { ProgressCard } from './ProgressCard';
import { useHabitStore, useActiveHabit, type ProgressView } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { palette, radius, spacing } from '@/theme/tokens';
import { dueOn, isDoneOn, streakFor, valueOn, weeklyHabits, weekSessions } from '@/logic/habits';
import { getTheme } from '@/data/themes';
import { DAY_LETTERS, fromKey, relativeDayLabel, weekKeys } from '@/utils/date';
import { fmtNumber } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import type { Habit } from '@/data/types';

const VIEW_OPTIONS: SegmentOption<ProgressView>[] = [
  { key: 'now', label: 'Now' },
  { key: 'today', label: 'Day' },
  { key: 'week', label: 'Week' },
];

/** "Progress" heading + Now / Day / Week switch and the matching card. */
export function ProgressSection() {
  const view = useHabitStore((s) => s.view);
  const setView = useHabitStore((s) => s.setView);
  const active = useActiveHabit();

  if (!active) return null;

  return (
    <View style={{ paddingHorizontal: spacing.screenX, gap: 12 }}>
      <Txt variant="progressHeading">Progress</Txt>
      <View style={{ gap: 10 }}>
        <SegmentedControl
          options={VIEW_OPTIONS}
          value={view}
          onChange={(v) => {
            haptic.tick();
            setView(v);
          }}
        />
        <Animated.View key={view} entering={FadeIn.duration(220)}>
          {view === 'now' ? <ProgressCard habit={active} /> : view === 'today' ? <DaySummary /> : <WeekCard habit={active} />}
        </Animated.View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */

function DaySummary() {
  const { theme } = useTheme();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const day = useHabitStore((s) => s.selectedDay);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  const setActive = useHabitStore((s) => s.setActive);
  const setView = useHabitStore((s) => s.setView);
  const setFilter = useHabitStore((s) => s.setFilter);

  const due = useMemo(() => dueOn(habits, day), [habits, day]);
  const weekly = useMemo(() => weeklyHabits(habits), [habits]);
  const doneCount = due.filter((h) => isDoneOn(h, logs, day)).length;
  const frac = due.length ? doneCount / due.length : 0;

  const open = (h: Habit) => {
    setFilter(h.schedule.kind === 'weekly' ? 'weekly' : 'today');
    setActive(h.id);
    setView('now');
  };

  return (
    <View style={{ backgroundColor: theme.cardSurface, borderRadius: radius.progressCard, padding: spacing.cardPad, gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <ProgressRing value={frac} size={96} stroke={11} track={theme.progressTrack} from={palette.progressFillFrom} to="#7FB8FF">
          <Txt variant="statSmall">{Math.round(frac * 100)}%</Txt>
        </ProgressRing>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="progressTitle">{relativeDayLabel(day)}</Txt>
          <Txt variant="progressSubtitle" color="secondaryStrong">
            {due.length === 0
              ? 'Nothing scheduled'
              : doneCount === due.length
                ? 'Perfect day — everything done ✨'
                : `${doneCount} of ${due.length} habits done`}
          </Txt>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {[...due, ...weekly].map((h) => {
          const colors = getTheme(h.themeId);
          const v = valueOn(logs, day, h.id);
          const d = v >= h.goalValue;
          const isWeekly = h.schedule.kind === 'weekly';
          return (
            <PressableScale key={h.id} onPress={() => open(h)} scaleTo={0.98}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 20, backgroundColor: theme.cardElevated }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden' }}>
                  <HabitArt artId={h.artId} colors={colors} compact />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="h3" numberOfLines={1}>
                    {h.title}
                  </Txt>
                  <Txt variant="small" color="secondary">
                    {isWeekly
                      ? `${weekSessions(h, logs, day, weekStart)}/${h.schedule.kind === 'weekly' ? h.schedule.timesPerWeek : 0} this week`
                      : `${fmtNumber(v)} / ${fmtNumber(h.goalValue)} ${h.unit}`}
                  </Txt>
                </View>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    marginRight: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: d ? palette.success : 'transparent',
                    borderWidth: d ? 0 : 2,
                    borderColor: theme.progressTrack,
                  }}
                >
                  {d && <CheckIcon size={16} color="#FFFFFF" strokeWidth={3} />}
                </View>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */

function WeekCard({ habit }: { habit: Habit }) {
  const { theme } = useTheme();
  const logs = useHabitStore((s) => s.logs);
  const day = useHabitStore((s) => s.selectedDay);
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  const colors = getTheme(habit.themeId);

  const keys = weekKeys(fromKey(day), weekStart);
  const total = keys.reduce((sum, k) => sum + valueOn(logs, k, habit.id), 0);
  const daysDone = keys.filter((k) => isDoneOn(habit, logs, k)).length;
  const streak = useMemo(() => streakFor(habit, logs, today, weekStart), [habit, logs, today, weekStart]);

  const bars = keys.map((k) => {
    const v = valueOn(logs, k, habit.id);
    return {
      label: DAY_LETTERS[fromKey(k).getDay()],
      value: habit.goalValue ? Math.min(1, v / habit.goalValue) : 0,
      highlight: k === day,
      caption: v ? fmtNumber(v) : ' ',
    };
  });

  return (
    <View style={{ backgroundColor: theme.cardSurface, borderRadius: radius.progressCard, padding: spacing.cardPad, gap: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Txt variant="progressTitle" numberOfLines={1}>
            {habit.title}
          </Txt>
          <Txt variant="progressSubtitle" color="secondaryStrong">
            {habit.schedule.kind === 'weekly'
              ? `${daysDone} of ${habit.schedule.timesPerWeek} sessions this week`
              : `${daysDone}/7 days hit this week`}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt variant="stat">{fmtNumber(total)}</Txt>
          <Txt variant="small" color="secondary">
            {habit.unit} total
          </Txt>
        </View>
      </View>
      <BarChart bars={bars} from={colors.accent} to={colors.bgTop} height={100} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pill label="Current streak" value={`${streak.current} ${streak.unit}${streak.current === 1 ? '' : 's'}`} />
        <Pill label="Best streak" value={`${streak.best} ${streak.unit}${streak.best === 1 ? '' : 's'}`} />
      </View>
    </View>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: theme.cardElevated, gap: 2 }}>
      <Txt variant="micro" color="secondary">
        {label}
      </Txt>
      <Txt variant="statSmall">{value}</Txt>
    </View>
  );
}

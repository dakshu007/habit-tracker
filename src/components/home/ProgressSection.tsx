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
import { dueOn, isDoneOn, isRestDay, streakFor, valueOn, weeklyHabits, weekSessions } from '@/logic/habits';
import { Bed, MessageCircle, Mic, Share2, type LucideIcon } from '@/components/ui/lucide';
import { hexToRgba } from '@/theme/color';
import { useNavigation } from '@react-navigation/native';
import type { RootNav } from '@/navigation/types';
import { sendToBuddy } from '@/services/buddy';
import { overlay } from '@/components/ui/Overlay';
import { BuddySheet } from '@/components/profile/BuddySheet';
import { t } from '@/i18n';
import { getTheme } from '@/data/themes';
import { DAY_LETTERS, fromKey, relativeDayLabel, weekKeys } from '@/utils/date';
import { fmtNumber, qty, unitFor } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import type { Habit } from '@/data/types';

const VIEW_OPTIONS: SegmentOption<ProgressView>[] = [
  { key: 'now', label: t('Now') },
  { key: 'today', label: t('Day') },
  { key: 'week', label: t('Week') },
];

/** "Progress" heading + Now / Day / Week switch and the matching card. */
export function ProgressSection() {
  const view = useHabitStore((s) => s.view);
  const setView = useHabitStore((s) => s.setView);
  const active = useActiveHabit();

  if (!active) return null;

  return (
    <View style={{ paddingHorizontal: spacing.screenX, gap: 12 }}>
      <Txt variant="progressHeading">{t('Progress')}</Txt>
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
              ? t('Nothing scheduled')
              : doneCount === due.length
                ? t('Perfect day — everything done')
                : t('{done} of {total} habits done', { done: doneCount, total: due.length })}
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
                      ? t('{done}/{total} this week', { done: weekSessions(h, logs, day, weekStart), total: h.schedule.kind === 'weekly' ? h.schedule.timesPerWeek : 0 })
                      : `${fmtNumber(v)} / ${qty(h.goalValue, h.unit)}`}
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

      <DayActions day={day} />
    </View>
  );
}

/** Rest day toggle, share, and buddy check-in for the selected day. */
function DayActions({ day }: { day: string }) {
  const { theme } = useTheme();
  const navigation = useNavigation<RootNav>();
  const rest = useHabitStore((s) => isRestDay(s.logs, day));
  const toggleRestDay = useHabitStore((s) => s.toggleRestDay);
  const buddy = useHabitStore((s) => s.extras.buddy);
  const today = useHabitStore((s) => s.today);

  const chip = (Icon: LucideIcon, label: string, onPress: () => void, on = false, color = '#4C8DF6') => (
    <PressableScale key={label} onPress={onPress} style={{ flexGrow: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          height: 42,
          paddingHorizontal: 14,
          borderRadius: 21,
          backgroundColor: on ? color : theme.cardElevated,
        }}
      >
        <Icon size={17} color={on ? '#FFFFFF' : color} strokeWidth={2} />
        <Txt variant="label" color={on ? 'white' : 'primary'}>
          {label}
        </Txt>
      </View>
    </PressableScale>
  );

  return (
    <View style={{ gap: 10 }}>
      {rest && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: hexToRgba('#9B6BF2', 0.12) }}>
          <Bed size={18} color="#9B6BF2" strokeWidth={2} />
          <Txt variant="small" color="secondaryStrong" style={{ flex: 1 }}>
            {t('Rest day — streaks are paused, nothing is due. Enjoy it.')}
          </Txt>
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {day >= today && chip(Bed, rest ? t('Rest day on') : t('Rest day'), () => toggleRestDay(day), rest, '#9B6BF2')}
        {day === today && chip(Mic, t('Voice log'), () => navigation.navigate('VoiceLog'))}
        {day === today && chip(Share2, t('Share'), () => navigation.navigate('Share', { kind: 'today' }))}
        {day === today && chip(MessageCircle, buddy ? t('Tell {name}', { name: buddy.name }) : t('Tell a buddy'), () => (buddy ? sendToBuddy() : overlay.open(<BuddySheet sendAfter />)), false, '#25A55F')}
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
      label: t(DAY_LETTERS[fromKey(k).getDay()]),
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
              ? t('{done} of {total} sessions this week', { done: daysDone, total: habit.schedule.timesPerWeek })
              : t('{done}/7 days hit this week', { done: daysDone })}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt variant="stat">{fmtNumber(total)}</Txt>
          <Txt variant="small" color="secondary">
            {t('{unit} total', { unit: unitFor(total, habit.unit) })}
          </Txt>
        </View>
      </View>
      <BarChart bars={bars} from={colors.accent} to={colors.bgTop} height={100} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pill label={t('Current streak')} value={streak.unit === 'week' ? t('{n} wk', { n: streak.current }) : t('{n} d', { n: streak.current })} />
        <Pill label={t('Best streak')} value={streak.unit === 'week' ? t('{n} wk', { n: streak.best }) : t('{n} d', { n: streak.best })} />
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, useSharedValue } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

import { GradientBackground } from '@/components/ui/GradientBackground';
import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, GlassSurface, PressableScale } from '@/components/ui/Glass';
import { FlameIcon, PlusIcon, UndoIcon } from '@/components/ui/icons';
import { Glyph } from '@/components/ui/glyphs';
import { DateWheel } from '@/components/home/DateWheel';
import { SegmentedPill } from '@/components/home/SegmentedPill';
import { TaskCardStack, CarouselContext } from '@/components/home/TaskCardStack';
import { ProgressSection } from '@/components/home/ProgressSection';
import { useHabitStore, useActiveHabit, useVisibleHabits } from '@/store/useHabitStore';
import { useTabFocused } from '@/navigation/MainTabs';
import { bestCurrentStreak, dueOn, isDoneOn } from '@/logic/habits';
import { getTheme } from '@/data/themes';
import { spacing } from '@/theme/tokens';
import { overlay } from '@/components/ui/Overlay';
import { Footprints, Play, Snowflake } from '@/components/ui/lucide';
import { StreakInfo } from '@/components/home/StreakInfo';
import { LiveRunPill } from '@/screens/RunsScreen';
import { TrialPill, useTrialNudge } from '@/components/home/TrialPill';
import { useLiveRun } from '@/store/useRunStore';
import { t } from '@/i18n';
import { useEnter } from '@/theme/motion';
import { greeting, relativeDayLabel } from '@/utils/date';
import type { RootNav } from '@/navigation/types';

/** Animates an integer from its previous value to `target` with an ease-out. */
function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(target);
  const last = useRef(target);
  useEffect(() => {
    const from = last.current;
    const to = target;
    if (from === to) return;
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const cur = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      last.current = cur;
      setVal(cur);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function CaptionLine({ done, remaining, day }: { done: number; remaining: number; day: string }) {
  const doneShown = useCountUp(done);
  const label = relativeDayLabel(day);
  const when = label === t('Today') ? t('today') : label === t('Yesterday') ? t('yesterday') : t('on {day}', { day: label });
  return (
    <Txt variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
      {remaining === 0 && done > 0
        ? t('All {n} done {when}. Beautiful work!', { n: done, when })
        : remaining === 1
          ? t('{done} done {when}, 1 habit to go', { done: doneShown, when })
          : t('{done} done {when}, {n} habits to go', { done: doneShown, when, n: remaining })}
    </Txt>
  );
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNav>();
  const focused = useTabFocused('Home');
  const enter = useEnter();

  const active = useActiveHabit();
  const visible = useVisibleHabits();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const day = useHabitStore((s) => s.selectedDay);
  const today = useHabitStore((s) => s.today);
  const filter = useHabitStore((s) => s.filter);
  const name = useHabitStore((s) => s.profile.name);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  const setSelectedDay = useHabitStore((s) => s.setSelectedDay);
  const freezes = useHabitStore((s) => s.extras.freezes);
  const liveRun = useLiveRun((s) => !!s.live);
  const trialNudge = useTrialNudge();

  const due = useMemo(() => dueOn(habits, day), [habits, day]);
  const done = due.filter((h) => isDoneOn(h, logs, day)).length;
  const streak = useMemo(() => bestCurrentStreak(habits, logs, today, weekStart), [habits, logs, today, weekStart]);

  const colors = useMemo(
    () => (visible.length ? visible.map((h) => getTheme(h.themeId).bgTop) : [getTheme('sky').bgTop]),
    [visible],
  );
  const activeIndex = Math.max(0, visible.findIndex((h) => h.id === active?.id));
  // Single source of truth for carousel position, shared with the background tint.
  const pos = useSharedValue(activeIndex);

  return (
    <CarouselContext.Provider value={{ pos }}>
      <GradientBackground colors={colors} pos={pos}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120, gap: 22 }}
        >
          {/* Header */}
          <Animated.View
            entering={enter(0)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.screenX, gap: 10 }}
          >
            <View style={{ flex: 1 }}>
              <Txt variant="small" color="rgba(255,255,255,0.85)">
                {t(greeting())}
                {name ? ',' : ''}
              </Txt>
              <Txt variant="title" color="white" numberOfLines={1}>
                {name || t('Ready to grow?')}
              </Txt>
            </View>
            {((streak && streak.streak.current > 0) || freezes > 0) && (
              <PressableScale silent onPress={() => overlay.open(<StreakInfo />)} accessibilityLabel={t('Streak and freezes')}>
                <GlassSurface radius={22} fill="rgba(255,255,255,0.25)">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 44, paddingHorizontal: 14 }}>
                    {streak && streak.streak.current > 0 && (
                      <>
                        <FlameIcon size={20} />
                        <Txt variant="statSmall" color="white">
                          {streak.streak.current}
                        </Txt>
                      </>
                    )}
                    {freezes > 0 && (
                      <>
                        <Snowflake size={17} color="#FFFFFF" strokeWidth={2.2} style={{ marginLeft: 4 }} />
                        <Txt variant="statSmall" color="white">
                          {freezes}
                        </Txt>
                      </>
                    )}
                  </View>
                </GlassSurface>
              </PressableScale>
            )}
            <GlassButton size={42} accessibilityLabel={t('Start a run')} fill="rgba(255,255,255,0.25)" onPress={() => navigation.navigate('Run')}>
              <Footprints size={20} color="#FFFFFF" strokeWidth={2.2} />
            </GlassButton>
            <GlassButton size={42} accessibilityLabel={t('Routines')} fill="rgba(255,255,255,0.25)" onPress={() => navigation.navigate('Routines')}>
              <Play size={19} color="#FFFFFF" fill="#FFFFFF" />
            </GlassButton>
            <GlassButton size={42} accessibilityLabel={t('New habit')} fill="rgba(255,255,255,0.25)" onPress={() => navigation.navigate('HabitEditor')}>
              <PlusIcon color="#FFFFFF" size={22} strokeWidth={2.4} />
            </GlassButton>
          </Animated.View>

          {(liveRun || trialNudge != null) && (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <LiveRunPill onPress={() => navigation.navigate('Run')} />
              <TrialPill onPress={() => navigation.navigate('Paywall')} />
            </View>
          )}

          <Animated.View entering={enter(60)}>
            <DateWheel />
          </Animated.View>

          <Animated.View entering={enter(120)} style={{ gap: 12 }}>
            <SegmentedPill />
            {day !== today && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={{ alignSelf: 'center' }}>
                <PressableScale onPress={() => setSelectedDay(today)} accessibilityLabel={t('Back to today')}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    <UndoIcon size={14} color="#1C1B22" strokeWidth={2.4} />
                    <Txt variant="label" color="#1C1B22">
                      {t('Back to today')}
                    </Txt>
                  </View>
                </PressableScale>
              </Animated.View>
            )}
          </Animated.View>

          <Animated.View
            entering={enter(180)}
            style={{ gap: 12, paddingHorizontal: spacing.screenX }}
          >
            {visible.length ? (
              <>
                <TaskCardStack focused={focused} />
                {filter === 'today' && <CaptionLine done={done} remaining={due.length - done} day={day} />}
              </>
            ) : (
              <EmptyStack
                weekly={filter === 'weekly'}
                hasHabits={habits.some((h) => !h.archived)}
                onCreate={() => navigation.navigate('HabitEditor')}
              />
            )}
          </Animated.View>

          <Animated.View entering={enter(240)}>
            <ProgressSection />
          </Animated.View>
        </ScrollView>
      </GradientBackground>
    </CarouselContext.Provider>
  );
}

function EmptyStack({ weekly, hasHabits, onCreate }: { weekly: boolean; hasHabits: boolean; onCreate: () => void }) {
  return (
    <GlassSurface radius={32} elevation={10}>
      <View style={{ alignItems: 'center', padding: 28, gap: 14 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: 'rgba(255,255,255,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Glyph name={weekly ? 'sun' : 'leaf'} size={46} color="#4394D3" strokeWidth={1.5} />
        </View>
        <Txt variant="h2" style={{ textAlign: 'center' }}>
          {weekly ? t('No weekly goals yet') : hasHabits ? t('A free day') : t('Start your first habit')}
        </Txt>
        <Txt variant="bodyRegular" color="secondary" style={{ textAlign: 'center' }}>
          {weekly
            ? t('Weekly goals let you do something a few times a week, on any days you like.')
            : hasHabits
              ? t('Nothing is scheduled for this day. Enjoy it, or add something new.')
              : t('Pick something small. Consistency beats intensity.')}
        </Txt>
        <Button label={weekly ? t('Add a weekly goal') : t('Create a habit')} onPress={onCreate} style={{ alignSelf: 'stretch', marginTop: 6 }} />
      </View>
    </GlassSurface>
  );
}

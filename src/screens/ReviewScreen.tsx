import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton } from '@/components/ui/Glass';
import { CloseIcon } from '@/components/ui/icons';
import { CalendarCheck, Flame, Lightbulb, Share2, TrendingUp } from '@/components/ui/lucide';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { moodMeta } from '@/components/mood/Mood';
import { useHabitStore } from '@/store/useHabitStore';
import { buildReview } from '@/logic/review';
import { getArt } from '@/data/art';
import { useMotion } from '@/theme/motion';
import { DAY_NAMES, MONTH_LABELS, fromKey } from '@/utils/date';
import { pct } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

const PAGE_MS = 6000;
const BG: [string, string][] = [
  ['#6CC3F7', '#5E8BF5'],
  ['#FFB38A', '#E0638C'],
  ['#7FE0D6', '#2E9C8A'],
  ['#C9AEFC', '#7E6CF0'],
  ['#FFE08A', '#F5A623'],
  ['#4B4F7A', '#1C1B22'],
];

/** Story-style weekly recap. Tap right/left to move; pages auto-advance. */
export function ReviewScreen({ navigation }: RootScreenProps<'Review'>) {
  const insets = useSafeAreaInsets();
  const m = useMotion();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  const markReviewSeen = useHabitStore((s) => s.markReviewSeen);

  // On Sunday (or the last day of the user's week) review the week in progress.
  const current = fromKey(today).getDay() === (weekStart + 6) % 7;
  const r = useMemo(() => buildReview(habits, logs, today, weekStart, current), [habits, logs, today, weekStart, current]);
  useEffect(() => {
    markReviewSeen(r.start);
  }, [r.start, markReviewSeen]);

  const leaving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Stop the auto-advance first, then leave (Home if there's nothing to go back to). */
  const leave = useCallback(
    (then?: () => void) => {
      if (timer.current) clearTimeout(timer.current);
      if (then) then();
      else {
        leaving.current = true;
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        return;
      }
    },
    [navigation],
  );

  const pages = useMemo(() => {
    const list: { key: string; render: () => React.ReactNode }[] = [];
    const s = fromKey(r.start);
    const e = fromKey(r.end);
    const range = `${s.getDate()} ${MONTH_LABELS[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTH_LABELS[e.getMonth()].slice(0, 3)}`;

    list.push({
      key: 'intro',
      render: () => (
        <View style={{ alignItems: 'center', gap: 18 }}>
          <Txt variant="label" color="rgba(255,255,255,0.85)">
            {range}
          </Txt>
          <Txt variant="display" color="white" style={{ textAlign: 'center' }}>
            {t('Your week in habits')}
          </Txt>
          <ProgressRing value={r.avg} size={200} stroke={14} track="rgba(255,255,255,0.25)" from="#FFFFFF">
            <Txt variant="display" color="white">
              {pct(r.avg)}
            </Txt>
            <Txt variant="small" color="rgba(255,255,255,0.85)">
              {t('completion')}
            </Txt>
          </ProgressRing>
          <Txt variant="h2" color="white">
            {t('{n} check-ins', { n: r.checkins })}
          </Txt>
        </View>
      ),
    });

    if (r.bestDay) {
      list.push({
        key: 'best',
        render: () => (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <CalendarCheck size={64} color="#FFFFFF" strokeWidth={1.6} />
            <Txt variant="label" color="rgba(255,255,255,0.85)">
              {t('Your best day')}
            </Txt>
            <Txt variant="display" color="white" style={{ fontSize: 48, lineHeight: 54 }}>
              {t(DAY_NAMES[fromKey(r.bestDay!.key).getDay()])}
            </Txt>
            <Txt variant="h2" color="white">
              {t('{pct} of habits done', { pct: pct(r.bestDay!.value) })}
            </Txt>
          </View>
        ),
      });
    }

    if (r.topStreak) {
      const art = getArt(r.topStreak.habit.artId);
      list.push({
        key: 'streak',
        render: () => (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <View style={{ width: 200, height: 200, borderRadius: 40, overflow: 'hidden', backgroundColor: art.bg }}>
              <Image source={art.source} style={{ width: '100%', height: '100%' }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Flame size={36} color="#FFD36B" fill="#FFD36B" />
              <Txt variant="display" color="white" style={{ fontSize: 56, lineHeight: 62 }}>
                {r.topStreak!.days}
              </Txt>
            </View>
            <Txt variant="h2" color="white" style={{ textAlign: 'center' }}>
              {t('days in a row of {habit}', { habit: r.topStreak!.habit.title })}
            </Txt>
          </View>
        ),
      });
    }

    const diff = r.avg - r.prevAvg;
    list.push({
      key: 'compare',
      render: () => (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <TrendingUp size={64} color="#FFFFFF" strokeWidth={1.6} style={{ transform: [{ scaleY: diff < 0 ? -1 : 1 }] }} />
          <Txt variant="label" color="rgba(255,255,255,0.85)">
            {t('Compared with the week before')}
          </Txt>
          <Txt variant="display" color="white" style={{ fontSize: 56, lineHeight: 62 }}>
            {diff >= 0 ? '+' : '−'}
            {Math.round(Math.abs(diff) * 100)}%
          </Txt>
          <Txt variant="h2" color="white" style={{ textAlign: 'center' }}>
            {diff > 0.02 ? t('You’re trending up. Keep it going.') : diff < -0.02 ? t('A softer week, and that’s okay. Reset on Monday.') : t('Steady and consistent.')}
          </Txt>
        </View>
      ),
    });

    const mood = r.mood !== null ? moodMeta(Math.round(r.mood)) : undefined;
    if (mood) {
      list.push({
        key: 'mood',
        render: () => (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <mood.Icon size={96} color="#FFFFFF" strokeWidth={1.5} />
            <Txt variant="label" color="rgba(255,255,255,0.85)">
              {t('Your average mood')}
            </Txt>
            <Txt variant="display" color="white">
              {t(mood.label)}
            </Txt>
          </View>
        ),
      });
    }

    list.push({
      key: 'tip',
      render: () => (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Lightbulb size={64} color="#FFFFFF" strokeWidth={1.6} />
          <Txt variant="label" color="rgba(255,255,255,0.85)">
            {t('One idea for next week')}
          </Txt>
          <Txt variant="title" color="white" style={{ textAlign: 'center' }}>
            {r.needsLove
              ? r.needsLove.reminder.enabled
                ? t('Make {habit} smaller. Even 2 minutes counts.', { habit: r.needsLove.title })
                : t('Add a reminder for {habit} at the time you’re most free.', { habit: r.needsLove.title })
              : t('Everything’s on track. Maybe it’s time for a new challenge?')}
          </Txt>
          <Button
            label={t('Share my week')}
            color="#FFFFFF"
            icon={<Share2 size={18} color="#1C1B22" />}
            onPress={() => leave(() => navigation.navigate('Share', { kind: 'week' }))}
            style={{ alignSelf: 'stretch', marginTop: 12 }}
          />
        </View>
      ),
    });
    return list;
  }, [r, leave, navigation]);

  const [page, setPage] = useState(0);
  useEffect(() => {
    if (m.id === 'off' || leaving.current) return;
    timer.current = setTimeout(() => setPage((p) => Math.min(pages.length - 1, p + 1)), PAGE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [page, pages.length, m.id]);

  // Fade each page in. A plain shared value (not a layout animation), so leaving
  // the screen mid-fade can't upset the native screen transition.
  const fade = useSharedValue(1);
  useEffect(() => {
    if (m.enter === 'none') return;
    fade.value = 0;
    fade.value = withTiming(1, { duration: 260 });
  }, [page, fade, m.enter]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));


  const go = (d: 1 | -1) => {
    haptic.tick();
    setPage((p) => Math.max(0, Math.min(pages.length - 1, p + d)));
  };
  const colors = BG[page % BG.length];

  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
        {pages.map((p, i) => (
          <View key={p.key} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= page ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <GlassButton accessibilityLabel={t('Close')} fill="rgba(255,255,255,0.18)" onPress={() => leave()}>
          <CloseIcon size={20} color="#FFFFFF" />
        </GlassButton>
      </View>
      <View style={{ flex: 1 }}>
        <Animated.View collapsable={false} style={[{ flex: 1, justifyContent: 'center' }, fadeStyle]}>
          {pages[Math.min(page, pages.length - 1)].render()}
        </Animated.View>
        {/* Tap zones (hidden on the last page so its buttons stay tappable) */}
        {page < pages.length - 1 && (
          <>
            <Pressable accessibilityLabel={t('Previous')} onPress={() => go(-1)} style={{ position: 'absolute', left: -20, top: 0, bottom: 0, width: '35%' }} />
            <Pressable accessibilityLabel={t('Next')} onPress={() => go(1)} style={{ position: 'absolute', right: -20, top: 0, bottom: 0, width: '65%' }} />
          </>
        )}
      </View>
    </LinearGradient>
  );
}

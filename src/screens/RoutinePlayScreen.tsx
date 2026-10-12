import { useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton } from '@/components/ui/Glass';
import { CloseIcon } from '@/components/ui/icons';
import { PartyPopper, SkipForward } from '@/components/ui/lucide';
import { TaskCard } from '@/components/home/TaskCard';
import { useHabitStore } from '@/store/useHabitStore';
import { useMotion } from '@/theme/motion';
import { getTheme } from '@/data/themes';
import { isDoneOn } from '@/logic/habits';
import { hexToRgba } from '@/theme/color';
import { spacing } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

/** Plays a routine: one habit card at a time; sliding advances to the next. */
export function RoutinePlayScreen({ navigation, route }: RootScreenProps<'RoutinePlay'>) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const m = useMotion();
  const routine = useHabitStore((s) => s.extras.routines.find((r) => r.id === route.params.id));
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);

  const items = useMemo(
    () => (routine?.habitIds ?? []).map((id) => habits.find((h) => h.id === id)).filter((h) => h && !h.archived) as typeof habits,
    [routine, habits],
  );
  // Start at the first habit not yet done today.
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex((h) => !isDoneOn(h, logs, today))));
  const [finished, setFinished] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const next = () => {
    if (index >= items.length - 1) {
      setFinished(true);
      haptic.success();
    } else setIndex((i) => i + 1);
  };

  const missing = !routine || !items.length;
  useEffect(() => {
    if (missing) navigation.goBack();
  }, [missing, navigation]);
  if (missing) return null;

  const h = items[Math.min(index, items.length - 1)];
  const accent = getTheme(h.themeId).accent;
  const doneCount = items.filter((x) => isDoneOn(x, logs, today)).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#14141A' }}>
      <LinearGradient colors={[hexToRgba(accent, 0.5), '#14141A']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 560 }} />
      <View style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16, paddingHorizontal: spacing.screenX, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt variant="micro" color="rgba(255,255,255,0.7)">
              {t('Routine')}
            </Txt>
            <Txt variant="h2" color="white" numberOfLines={1}>
              {routine.name}
            </Txt>
          </View>
          <GlassButton accessibilityLabel={t('Close')} fill="rgba(255,255,255,0.12)" onPress={() => navigation.goBack()}>
            <CloseIcon size={20} color="#FFFFFF" />
          </GlassButton>
        </View>

        {/* progress segments */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {items.map((x, i) => (
            <View
              key={x.id}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                backgroundColor: isDoneOn(x, logs, today) ? '#FFFFFF' : i === index && !finished ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </View>

        {finished ? (
          <Animated.View entering={m.enter === 'none' ? undefined : FadeIn} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <PartyPopper size={56} color="#FFFFFF" strokeWidth={1.6} />
            </View>
            <Txt variant="title" color="white">
              {t('Routine complete')}
            </Txt>
            <Txt variant="body" color="rgba(255,255,255,0.8)">
              {t('{done} of {total} habits done', { done: doneCount, total: items.length })}
            </Txt>
            <Button label={t('Finish')} color={accent} onPress={() => navigation.goBack()} style={{ alignSelf: 'stretch', marginTop: 10 }} />
          </Animated.View>
        ) : (
          <>
            <Animated.View
              key={h.id}
              entering={m.enter === 'none' ? undefined : FadeInRight.springify().damping(m.enterSpring.damping).stiffness(m.enterSpring.stiffness)}
              exiting={m.enter === 'none' ? undefined : FadeOutLeft.duration(180)}
              style={{ alignItems: 'center' }}
            >
              <TaskCard
                habit={h}
                width={width - spacing.screenX * 2}
                day={today}
                askMoodOnComplete={false}
                onCompleted={() => {
                  timer.current = setTimeout(next, 900);
                }}
              />
            </Animated.View>
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              <Button
                label={isDoneOn(h, logs, today) ? t('Next') : t('Skip for now')}
                variant="ghost"
                color="#FFFFFF"
                icon={<SkipForward size={18} color="#FFFFFF" />}
                onPress={next}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

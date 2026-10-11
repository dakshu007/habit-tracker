import { useEffect, useRef } from 'react';
import { BackHandler, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { TaskCard } from '@/components/home/TaskCard';
import { useHabitStore, useHabit } from '@/store/useHabitStore';
import { isDoneOn } from '@/logic/habits';
import { useMotion } from '@/theme/motion';
import { spacing } from '@/theme/tokens';
import type { RootScreenProps } from '@/navigation/types';
import { useRequireUnlock } from '@/navigation/useRequireUnlock';
import { t } from '@/i18n';

/**
 * Opened from the home-screen widget (habittracker://complete/<id>). Android
 * widgets can't track a swipe, so the widget's slider deep-links here: the
 * habit's card floats over a dimmed backdrop with the real slide-to-complete.
 * Once completed it celebrates briefly and sends you back to the home screen.
 */
export function QuickCompleteScreen({ navigation, route }: RootScreenProps<'QuickComplete'>) {
  useRequireUnlock(route.params.id);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const m = useMotion();
  const habit = useHabit(route.params.id);
  const today = useHabitStore((s) => s.today);
  const done = useHabitStore((s) => (habit ? isDoneOn(habit, s.logs, s.today) : false));
  const wasDone = useRef(done);

  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('Main'));

  // After a fresh completion, linger on the celebration, then hand back to the launcher.
  useEffect(() => {
    if (!done || wasDone.current) return;
    const id = setTimeout(() => {
      close();
      setTimeout(() => BackHandler.exitApp(), 120);
    }, 1300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!habit) {
    return (
      <Pressable onPress={close} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,16,0.6)' }}>
        <Txt variant="h3" color="white">
          {t('That habit no longer exists.')}
        </Txt>
      </Pressable>
    );
  }

  const cardW = width - spacing.screenX * 2;

  return (
    <View style={{ flex: 1 }}>
      <Animated.View entering={FadeIn.duration(200)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Pressable accessibilityLabel={t('Close')} onPress={close} style={{ flex: 1, backgroundColor: 'rgba(10,10,16,0.62)' }} />
      </Animated.View>
      <View pointerEvents="box-none" style={{ flex: 1, justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom, gap: 18 }}>
        <Animated.View
          entering={m.enter === 'none' ? undefined : ZoomIn.springify().damping(m.ui.damping).stiffness(m.ui.stiffness).mass(m.ui.mass)}
          style={{ alignSelf: 'center' }}
        >
          <TaskCard habit={habit} width={cardW} day={today} askMoodOnComplete={false} />
        </Animated.View>
        <Txt variant="small" color="rgba(255,255,255,0.75)" style={{ textAlign: 'center' }}>
          {done ? t('Nice! Heading back to your home screen…') : t('Tap outside to close')}
        </Txt>
      </View>
    </View>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useSharedValue } from 'react-native-reanimated';

import { GradientBackground } from '@/components/ui/GradientBackground';
import { Txt } from '@/components/ui/Txt';
import { WeekdayStrip } from '@/components/home/WeekdayStrip';
import { SegmentedPill } from '@/components/home/SegmentedPill';
import { TaskCardStack } from '@/components/home/TaskCardStack';
import { ProgressSection } from '@/components/home/ProgressSection';
import { CarouselContext } from '@/components/home/carouselSync';
import { useTaskStore, useActiveTask, useVisibleTasks } from '@/store/useTaskStore';
import { spacing } from '@/theme/tokens';

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
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(from + (to - from) * eased);
      last.current = cur;
      setVal(cur);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}

function CaptionLine({ done, remaining }: { done: number; remaining: number }) {
  const doneShown = useCountUp(done);
  return (
    <Txt variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
      {doneShown} done today, {remaining} {remaining === 1 ? 'task' : 'tasks'} yet to complete
    </Txt>
  );
}

export function HomeScreen() {
  const active = useActiveTask();
  const visible = useVisibleTasks();
  const tasks = useTaskStore((s) => s.tasks);

  const daily = useMemo(() => tasks.filter((t) => t.isDaily), [tasks]);
  const done = daily.filter((t) => t.status === 'done').length;
  const remaining = daily.length - done;

  const colors = useMemo(() => visible.map((t) => t.bgGradientTop), [visible]);
  const activeIndex = Math.max(
    0,
    visible.findIndex((t) => t.id === active.id),
  );
  // Single source of truth for carousel position, shared with the card stack so
  // the background tint tracks the swipe live (see carouselSync).
  const pos = useSharedValue(activeIndex);

  return (
    <CarouselContext.Provider value={{ pos }}>
      <GradientBackground colors={colors} pos={pos}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 110, gap: 24 }}
          >
            <Animated.View entering={FadeInDown.duration(420).springify().damping(16)}>
              <WeekdayStrip />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(80).duration(420).springify().damping(16)}>
              <SegmentedPill />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(160).duration(420).springify().damping(16)}
              style={{ gap: 12, paddingHorizontal: spacing.screenX }}
            >
              <TaskCardStack />
              <CaptionLine done={done} remaining={remaining} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(420).springify().damping(16)}>
              <ProgressSection />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    </CarouselContext.Provider>
  );
}

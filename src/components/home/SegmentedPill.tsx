import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { palette, radius, spacing } from '@/theme/tokens';
import { useHabitStore } from '@/store/useHabitStore';
import { dueOn, isDoneOn, weekSessions, weeklyHabits, weeklyTarget } from '@/logic/habits';
import { haptic } from '@/utils/haptics';

const SPRING = { damping: 18, stiffness: 210, mass: 0.7 } as const;

interface Seg {
  x: number;
  w: number;
}

/**
 * Top pill toggle: "Today's task" (with a remaining-count badge) / "Weekly
 * tasks". Sits on the tinted gradient; the active segment is a translucent
 * white fill that slides smoothly between the two options (segments are
 * measured because their widths differ).
 */
export function SegmentedPill() {
  const filter = useHabitStore((s) => s.filter);
  const setFilterRaw = useHabitStore((s) => s.setFilter);
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const day = useHabitStore((s) => s.selectedDay);
  const weekStart = useHabitStore((s) => s.settings.weekStart);

  const setFilter = (f: typeof filter) => {
    if (f !== filter) haptic.tick();
    setFilterRaw(f);
  };

  const todayRemaining = useMemo(() => dueOn(habits, day).filter((h) => !isDoneOn(h, logs, day)).length, [habits, logs, day]);
  const weeklyRemaining = useMemo(
    () => weeklyHabits(habits).filter((h) => weekSessions(h, logs, day, weekStart) < weeklyTarget(h)).length,
    [habits, logs, day, weekStart],
  );

  const [segs, setSegs] = useState<Seg[]>([]);
  const ax = useSharedValue(0);
  const aw = useSharedValue(0);
  const inited = useRef(false);

  const activeIndex = filter === 'today' ? 0 : 1;

  const setSeg = (i: number, seg: Seg) =>
    setSegs((prev) => {
      const next = [...prev];
      next[i] = seg;
      return next;
    });

  useEffect(() => {
    const s = segs[activeIndex];
    if (!s) return;
    if (!inited.current) {
      // Place under the initial selection without a slide-in on mount.
      ax.value = s.x;
      aw.value = s.w;
      inited.current = true;
    } else {
      ax.value = withSpring(s.x, SPRING);
      aw.value = withSpring(s.w, SPRING);
    }
  }, [activeIndex, segs, ax, aw]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: ax.value }], width: aw.value }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }}>
      {/* Sliding active fill */}
      {segs.length === 2 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              borderRadius: radius.pill,
              backgroundColor: palette.pillActive,
            },
            indicatorStyle,
          ]}
        />
      )}

      {/* Today's task */}
      <Pressable
        onLayout={(e) => setSeg(0, { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })}
        onPress={() => setFilter('today')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: spacing.pillPadX,
          paddingVertical: spacing.pillPadY,
          borderRadius: radius.pill,
        }}
      >
        <Txt variant="pillToggle" color="white">
          Today&rsquo;s tasks
        </Txt>
        <View
          style={{
            width: 19,
            height: 19,
            borderRadius: radius.countBadge,
            backgroundColor: palette.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt variant="countBadge" color={palette.countBadgeText}>
            {todayRemaining}
          </Txt>
        </View>
      </Pressable>

      {/* Weekly tasks */}
      <Pressable
        onLayout={(e) => setSeg(1, { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })}
        onPress={() => setFilter('weekly')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.pillPadX,
          paddingVertical: spacing.pillPadY,
          borderRadius: radius.pill,
        }}
      >
        <Txt variant="pillToggle" color="white" style={{ opacity: filter === 'weekly' ? 1 : 0.9 }}>
          Weekly tasks
        </Txt>
        {weeklyRemaining > 0 && (
          <View
            style={{
              width: 19,
              height: 19,
              marginLeft: 10,
              borderRadius: radius.countBadge,
              backgroundColor: 'rgba(255,255,255,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt variant="countBadge" color="white">
              {weeklyRemaining}
            </Txt>
          </View>
        )}
      </Pressable>
    </View>
  );
}

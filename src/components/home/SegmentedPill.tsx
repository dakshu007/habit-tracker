import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { palette, radius, spacing } from '@/theme/tokens';
import { useTaskStore } from '@/store/useTaskStore';

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
  const filter = useTaskStore((s) => s.filter);
  const setFilter = useTaskStore((s) => s.setFilter);
  const tasks = useTaskStore((s) => s.tasks);

  const todayRemaining = tasks.filter((t) => t.isDaily && t.status === 'inProgress').length;

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
          Today&rsquo;s task
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
      </Pressable>
    </View>
  );
}

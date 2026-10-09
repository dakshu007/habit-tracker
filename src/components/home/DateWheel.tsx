import { useEffect, useMemo, useRef } from 'react';
import { useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Txt } from '@/components/ui/Txt';
import { useHabitStore } from '@/store/useHabitStore';
import { dayCompletion } from '@/logic/habits';
import { stripDays, type StripDay } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';

/**
 * Date wheel. A horizontal snap-scroller over a rolling window of days: spin
 * it and whichever date settles under the caret becomes the selected day for
 * the whole Home screen. The Figma "valley" arc is driven by live scroll
 * position; each day carries a completion dot (filled = all done).
 */
// Gesture-handler ScrollView so the wheel claims horizontal drags before the tab-swipe gesture.
const WheelScroll = Animated.createAnimatedComponent(GHScrollView);

const ITEM_WIDTH = 52;
const STEP = 15;
const HEIGHT = STEP * 2 + 58;
const PAST = 120;
const FUTURE = 14;

interface DayCellProps {
  index: number;
  day: StripDay;
  scrollX: SharedValue<number>;
  completion: number | null;
}

function DayCell({ index, day, scrollX, completion }: DayCellProps) {
  const style = useAnimatedStyle(() => {
    const ad = Math.abs(index - scrollX.value / ITEM_WIDTH);
    return {
      opacity: interpolate(ad, [0, 1, 2, 3], [1, 0.8, 0.5, 0.3], Extrapolation.CLAMP),
      transform: [
        { translateY: Math.max(0, 2 - ad) * STEP },
        { scale: interpolate(ad, [0, 1, 2], [1, 0.92, 0.84], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View style={[{ width: ITEM_WIDTH, alignItems: 'center', gap: 3 }, style]}>
      <Txt variant="weekday" color="white" style={{ opacity: day.isFuture ? 0.7 : 1 }}>
        {day.isToday ? 'Today' : day.label}
      </Txt>
      <Txt variant="weekday" color="white" style={{ opacity: day.isFuture ? 0.7 : 1 }}>
        {day.dayOfMonth}
      </Txt>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          marginTop: 2,
          backgroundColor: completion === 1 ? '#FFFFFF' : 'transparent',
          borderWidth: completion !== null && completion > 0 && completion < 1 ? 1.5 : 0,
          borderColor: '#FFFFFF',
          opacity: completion === null || completion === 0 ? 0 : 1,
        }}
      />
    </Animated.View>
  );
}

export function DateWheel() {
  const { width } = useWindowDimensions();
  const today = useHabitStore((s) => s.today);
  const selectedDay = useHabitStore((s) => s.selectedDay);
  const setSelectedDay = useHabitStore((s) => s.setSelectedDay);
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);

  const days = useMemo(() => stripDays(PAST, FUTURE), [today]); // eslint-disable-line react-hooks/exhaustive-deps
  const completions = useMemo(() => days.map((d) => dayCompletion(habits, logs, d.key)), [days, habits, logs]);
  const indexOf = (key: string) => Math.max(0, days.findIndex((d) => d.key === key));
  const selIndex = indexOf(selectedDay);

  const sidePad = (width - ITEM_WIDTH) / 2;
  const scrollX = useSharedValue(selIndex * ITEM_WIDTH);
  const centerIndex = useSharedValue(selIndex);
  const ref = useRef<GHScrollView>(null);
  const lastSettled = useRef(selIndex);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
    const i = Math.round(e.contentOffset.x / ITEM_WIDTH);
    if (i !== centerIndex.value) {
      centerIndex.value = i;
      scheduleOnRN(haptic.tick);
    }
  });

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(days.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / ITEM_WIDTH)));
    lastSettled.current = i;
    if (days[i] && days[i].key !== selectedDay) setSelectedDay(days[i].key);
  };

  // External selection changes (Today button, calendar jump) scroll the wheel.
  useEffect(() => {
    if (lastSettled.current === selIndex) return;
    lastSettled.current = selIndex;
    ref.current?.scrollTo({ x: selIndex * ITEM_WIDTH, animated: true });
  }, [selIndex]);

  return (
    <View style={{ height: HEIGHT }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: width / 2 - 5,
          zIndex: 2,
          width: 0,
          height: 0,
          borderLeftWidth: 5,
          borderRightWidth: 5,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: '#FFFFFF',
        }}
      />
      <WheelScroll
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(e) => {
          // No fling → no momentum event; settle right away.
          if (Math.abs(e.nativeEvent.velocity?.x ?? 0) < 0.05) settle(e);
        }}
        scrollEventThrottle={16}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentOffset={{ x: selIndex * ITEM_WIDTH, y: 0 }}
        contentContainerStyle={{ paddingHorizontal: sidePad, alignItems: 'flex-start', paddingTop: 10 }}
      >
        {days.map((day, i) => (
          <DayCell key={day.key} index={i} day={day} scrollX={scrollX} completion={completions[i]} />
        ))}
      </WheelScroll>
    </View>
  );
}

import { useCallback, useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Txt } from '@/components/ui/Txt';
import { daysInMonth, type MonthDay } from '@/utils/date';

/**
 * Month date wheel. A horizontal snap-scroller holding every day of the current
 * month: spin it and whichever date lands under the centre caret becomes active.
 *
 * The Figma "valley" arc is preserved but now driven by live scroll position —
 * the centred day sits lowest, fully opaque and full size; neighbours rise, fade
 * and shrink by their distance from centre (all on the UI thread). A selection
 * haptic ticks as each new day passes the centre, for a physical wheel feel.
 */
const ITEM_WIDTH = 52;
const STEP = 16; // vertical px per valley step
const HEIGHT = STEP * 2 + 46;

interface DayCellProps {
  index: number;
  day: MonthDay;
  scrollX: SharedValue<number>;
}

function DayCell({ index, day, scrollX }: DayCellProps) {
  const style = useAnimatedStyle(() => {
    const d = index - scrollX.value / ITEM_WIDTH; // signed distance from centre
    const ad = Math.abs(d);
    return {
      opacity: interpolate(ad, [0, 1, 2, 3], [1, 0.8, 0.5, 0.32], Extrapolation.CLAMP),
      transform: [
        { translateY: Math.max(0, 2 - ad) * STEP },
        { scale: interpolate(ad, [0, 1, 2], [1, 0.92, 0.84], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View style={[{ width: ITEM_WIDTH, alignItems: 'center', gap: 2 }, style]}>
      <Txt variant="weekday" color="white">
        {day.label}
      </Txt>
      <Txt variant="weekday" color="white">
        {day.dayOfMonth}
      </Txt>
    </Animated.View>
  );
}

export function WeekdayStrip() {
  const { width } = useWindowDimensions();
  const days = useMemo(() => daysInMonth(), []);
  const todayIndex = Math.max(
    0,
    days.findIndex((d) => d.isToday),
  );

  const sidePad = (width - ITEM_WIDTH) / 2;
  const scrollX = useSharedValue(todayIndex * ITEM_WIDTH);
  const centerIndex = useSharedValue(todayIndex);

  const tick = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
    const i = Math.round(e.contentOffset.x / ITEM_WIDTH);
    if (i !== centerIndex.value) {
      centerIndex.value = i;
      runOnJS(tick)();
    }
  });

  return (
    <View style={{ height: HEIGHT }}>
      {/* Fixed caret marking the active (centred) date. */}
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

      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentOffset={{ x: todayIndex * ITEM_WIDTH, y: 0 }}
        contentContainerStyle={{ paddingHorizontal: sidePad, alignItems: 'flex-start' }}
      >
        {days.map((day, i) => (
          <DayCell key={day.key} index={i} day={day} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

import { memo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from '@/components/ui/Txt';
import { HabitArt } from '@/components/art/HabitArt';
import { GoalBadge } from './GoalBadge';
import { StatusChip, type ChipTone } from './StatusChip';
import { SlideToComplete } from './SlideToComplete';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { useHabitStore } from '@/store/useHabitStore';
import { getTheme } from '@/data/themes';
import { valueOn, weekSessions } from '@/logic/habits';
import { fmtNumber } from '@/utils/format';
import type { Habit } from '@/data/types';

/** Front card aspect ratio from Figma: 358 × 503. */
export const CARD_ASPECT = 503 / 358;

interface TaskCardProps {
  habit: Habit;
  width: number;
  /** Weighted device tilt (active card only) → parallax / glare. */
  tiltX?: SharedValue<number>;
  tiltY?: SharedValue<number>;
}

export const TaskCard = memo(function TaskCard({ habit, width, tiltX, tiltY }: TaskCardProps) {
  const { theme } = useTheme();
  const day = useHabitStore((s) => s.selectedDay);
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  const value = useHabitStore((s) => valueOn(s.logs, day, habit.id));
  const sessions = useHabitStore((s) => (habit.schedule.kind === 'weekly' ? weekSessions(habit, s.logs, day, weekStart) : 0));
  const complete = useHabitStore((s) => s.complete);

  const colors = getTheme(habit.themeId);
  const height = Math.round(width * CARD_ASPECT);
  const done = value >= habit.goalValue;
  const future = day > today;

  let tone: ChipTone = done ? 'done' : value > 0 ? 'progress' : 'idle';
  let chip = done ? 'Done' : value > 0 ? `${fmtNumber(value)} / ${fmtNumber(habit.goalValue)} ${habit.unit}` : 'To do';
  if (future) {
    tone = 'upcoming';
    chip = 'Upcoming';
  } else if (habit.schedule.kind === 'weekly') {
    chip = `${sessions}/${habit.schedule.timesPerWeek} this week`;
    tone = sessions >= habit.schedule.timesPerWeek ? 'done' : done ? 'done' : value > 0 ? 'progress' : 'idle';
  }

  // Parallax: art drifts against the tilt, the info card with it → layered depth.
  const bgParallax = useAnimatedStyle(() => ({
    transform: [
      { scale: 1.04 },
      { translateX: -(tiltX?.value ?? 0) * 6 },
      { translateY: -(tiltY?.value ?? 0) * 6 },
    ],
  }));
  const fgParallax = useAnimatedStyle(() => ({
    transform: [{ translateX: (tiltX?.value ?? 0) * 6 }, { translateY: (tiltY?.value ?? 0) * 6 }],
  }));
  // Holographic glare that sweeps with tilt.
  const glareStyle = useAnimatedStyle(() => {
    const tx = tiltX?.value ?? 0;
    const ty = tiltY?.value ?? 0;
    const mag = Math.min(1, Math.sqrt(tx * tx + ty * ty));
    return {
      opacity: mag * 0.24,
      transform: [{ translateX: tx * width * 0.5 }, { translateY: ty * height * 0.4 }],
    };
  });

  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius.card,
        backgroundColor: colors.cardTint,
        boxShadow: '0px 18px 36px rgba(0,0,0,0.12)',
      }}
    >
      <View style={{ flex: 1, borderRadius: radius.card, overflow: 'hidden' }}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, bgParallax]}>
          <HabitArt artId={habit.artId} colors={colors} />
        </Animated.View>

        <View style={{ position: 'absolute', top: 16, right: 16 }}>
          <StatusChip tone={tone} label={chip} />
        </View>

        {/* Info card, anchored to the bottom */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 8,
              right: 8,
              bottom: 8,
              backgroundColor: theme.cardElevated,
              borderRadius: radius.innerCard,
              padding: spacing.cardPad,
              gap: 20,
            },
            fgParallax,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt variant="cardTitle" color="primary" numberOfLines={1}>
                {habit.title}
              </Txt>
              <Txt variant="cardSubtitle" color="secondary" numberOfLines={2}>
                {habit.subtitle || 'Small steps, every day.'}
              </Txt>
            </View>
            <GoalBadge colors={colors} goal={habit.goalValue} unit={habit.unit} />
          </View>

          <SlideToComplete
            done={done}
            disabled={future}
            idleLabel={future ? 'Opens on the day' : "Slide when you're done"}
            doneLabel={habit.doneLabel}
            onComplete={() => complete(habit.id, day)}
          />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: -height * 0.5, left: -width * 0.5, width: width * 2, height: height * 2 }, glareStyle]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
            locations={[0.38, 0.5, 0.62]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>
    </View>
  );
});

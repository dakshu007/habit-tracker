import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from '@/components/ui/Txt';
import { GoalBadge } from './GoalBadge';
import { StatusChip } from './StatusChip';
import { TaskIllustration } from './TaskIllustration';
import { SlideToComplete } from './SlideToComplete';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { useTaskStore } from '@/store/useTaskStore';
import type { Task } from '@/data/types';

/** Front card aspect ratio from Figma: 358 × 503. */
export const CARD_ASPECT = 503 / 358;

const BASE_SHADOW_Y = 17;

/** Static, non-interactive slide groove for preview (behind-the-stack) cards. */
function StaticSlide() {
  const { theme } = useTheme();
  return (
    <View
      style={{
        height: 62,
        borderRadius: radius.slideTrack,
        backgroundColor: theme.slideTrack,
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <View
        style={{ position: 'absolute', left: 6, width: 50, height: 50, borderRadius: radius.full, backgroundColor: '#FFFFFF' }}
      />
      <Txt variant="slideLabel" color="primary" style={{ marginLeft: 68 }}>
        Slide when you&rsquo;re done
      </Txt>
    </View>
  );
}

interface TaskCardProps {
  task: Task;
  width: number;
  /** Render behind the stack: rich visuals but no interactive slide control. */
  preview?: boolean;
  /** Weighted device tilt (active card only) → parallax / glare / shadow. */
  tiltX?: SharedValue<number>;
  tiltY?: SharedValue<number>;
}

export function TaskCard({ task, width, preview = false, tiltX, tiltY }: TaskCardProps) {
  const { theme } = useTheme();
  const completeTask = useTaskStore((s) => s.completeTask);
  const height = Math.round(width * CARD_ASPECT);

  // Dynamic shadow: shifts opposite the tilt so the card feels physically lifted.
  const shadowStyle = useAnimatedStyle(() => ({
    shadowOffset: {
      width: -(tiltX?.value ?? 0) * 10,
      height: BASE_SHADOW_Y - (tiltY?.value ?? 0) * 8,
    },
  }));

  // Parallax: background illustration drifts against the tilt, the foreground
  // info card drifts with it (and a touch more) → layered depth.
  const bgParallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: -(tiltX?.value ?? 0) * 5 },
      { translateY: -(tiltY?.value ?? 0) * 5 },
    ],
  }));
  const fgParallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: (tiltX?.value ?? 0) * 7 },
      { translateY: (tiltY?.value ?? 0) * 7 },
    ],
  }));

  // Holographic glare: a diagonal sheen that sweeps with tilt.
  const glareStyle = useAnimatedStyle(() => {
    const tx = tiltX?.value ?? 0;
    const ty = tiltY?.value ?? 0;
    const mag = Math.min(1, Math.sqrt(tx * tx + ty * ty));
    return {
      opacity: mag * 0.22,
      transform: [{ translateX: tx * width * 0.5 }, { translateY: ty * height * 0.4 }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius.card,
          backgroundColor: task.cardTint,
          // soft elevation (front of the stack)
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 30,
          elevation: 6,
        },
        shadowStyle,
      ]}
    >
      {/* Inner clip holds all the visuals (rounded + overflow so glare/illustration stay inside) */}
      <View style={{ flex: 1, borderRadius: radius.card, overflow: 'hidden' }}>
        {/* Illustration fills the card; parallaxes against the tilt */}
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, bgParallax]}>
          <TaskIllustration task={task} />
        </Animated.View>

        {/* Floating status chip */}
        <View style={{ position: 'absolute', top: 16, right: 16 }}>
          <StatusChip status={task.status} />
        </View>

        {/* White info card, anchored to the bottom; parallaxes with the tilt */}
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
              gap: spacing.cardGap,
            },
            fgParallax,
          ]}
        >
          {/* Title + subtitle / Goal badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Txt variant="cardTitle" color="primary">
                {task.title}
              </Txt>
              <Txt variant="cardSubtitle" color="secondary">
                {task.subtitle}
              </Txt>
            </View>
            <GoalBadge task={task} />
          </View>

          {preview ? (
            <StaticSlide />
          ) : (
            <SlideToComplete
              done={task.status === 'done'}
              doneLabel={task.doneLabel}
              onComplete={() => completeTask(task.id)}
            />
          )}
        </Animated.View>

        {/* Holographic glare sweep (sits above everything, very translucent) */}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: -height * 0.5, left: -width * 0.5, width: width * 2, height: height * 2 },
            glareStyle,
          ]}
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
    </Animated.View>
  );
}

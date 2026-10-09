import { memo } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from '@/components/ui/Txt';
import { HabitArt } from '@/components/art/HabitArt';
import { GoalBadge } from './GoalBadge';
import { StatusChip, type ChipTone } from './StatusChip';
import { SlideToComplete } from './SlideToComplete';
import { palette, radius, spacing } from '@/theme/tokens';
import { LockIcon } from '@/components/ui/icons';
import { useTheme } from '@/theme/ThemeContext';
import { useHabitStore } from '@/store/useHabitStore';
import { getTheme } from '@/data/themes';
import { daysClean, isRestDay, moneySaved, valueOn, weekSessions } from '@/logic/habits';
import { askMood } from '@/components/mood/Mood';
import { t } from '@/i18n';
import { fmtNumber, qty } from '@/utils/format';
import type { Habit } from '@/data/types';

/** Front card aspect ratio from Figma: 358 × 503. */
export const CARD_ASPECT = 503 / 358;

interface TaskCardProps {
  habit: Habit;
  width: number;
  /** Weighted device tilt (active card only) → parallax / glare. */
  tiltX?: SharedValue<number>;
  tiltY?: SharedValue<number>;
  /** Pin the card to a specific day (defaults to the Home screen's selected day). */
  day?: string;
  /** Ask the post-completion mood check-in (off for widget/routine flows). */
  askMoodOnComplete?: boolean;
  /** Called after a successful slide (e.g. routines advance). */
  onCompleted?: () => void;
}

export const TaskCard = memo(function TaskCard({ habit, width, tiltX, tiltY, day: dayProp, askMoodOnComplete = true, onCompleted }: TaskCardProps) {
  const { theme } = useTheme();
  const selectedDay = useHabitStore((s) => s.selectedDay);
  const day = dayProp ?? selectedDay;
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  const value = useHabitStore((s) => valueOn(s.logs, day, habit.id));
  const sessions = useHabitStore((s) => (habit.schedule.kind === 'weekly' ? weekSessions(habit, s.logs, day, weekStart) : 0));
  const complete = useHabitStore((s) => s.complete);
  const slip = useHabitStore((s) => s.slip);
  const rest = useHabitStore((s) => isRestDay(s.logs, day));
  const currency = useHabitStore((s) => s.settings.currency);

  const colors = getTheme(habit.themeId);
  const height = Math.round(width * CARD_ASPECT);
  const done = value >= habit.goalValue;
  const future = day > today;
  /** Past days can be viewed but never logged. */
  const past = day < today;

  const quit = habit.quit;
  const clean = quit ? daysClean(habit, day > today ? today : day) : 0;
  const saved = quit ? moneySaved(habit, today) : 0;

  let tone: ChipTone = done ? 'done' : value > 0 ? 'progress' : 'idle';
  let chip = done ? t('Done') : value > 0 ? `${fmtNumber(value)} / ${qty(habit.goalValue, habit.unit)}` : t('To do');
  if (future) {
    tone = 'upcoming';
    chip = t('Upcoming');
  } else if (rest && !done) {
    tone = 'upcoming';
    chip = t('Rest day');
  } else if (past && !done) {
    tone = 'idle';
    chip = t('Not done');
  } else if (quit) {
    chip = done ? t('Clean today') : t('{n} days clean', { n: clean });
  } else if (habit.schedule.kind === 'weekly') {
    chip = t('{done}/{total} this week', { done: sessions, total: habit.schedule.timesPerWeek });
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
              gap: 16,
            },
            fgParallax,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt variant="cardTitle" color="primary" numberOfLines={1}>
                {habit.title}
              </Txt>
              <Txt variant="cardSubtitle" color={quit ? colors.accent : 'secondary'} numberOfLines={2}>
                {quit ? t('{n} days clean', { n: clean }) : habit.subtitle || t('Small steps, every day.')}
              </Txt>
            </View>
            {quit ? (
              <SavedBadge accent={colors.accent} label={quit.costPerDay > 0 ? `${currency}${fmtNumber(saved)}` : `${clean}`} caption={quit.costPerDay > 0 ? t('Saved') : t('Days')} />
            ) : (
              <GoalBadge colors={colors} goal={habit.goalValue} unit={habit.unit} />
            )}
          </View>

          <SlideToComplete
            done={done}
            disabled={future || past || (rest && !done)}
            idleLabel={future ? t('Opens on the day') : past ? t('Past days are locked') : rest ? t('Rest day — enjoy it') : quit ? t('Slide to confirm a clean day') : t("Slide when you're done")}
            doneLabel={quit ? t('Clean day logged. Proud of you.') : habit.doneLabel}
            onComplete={() => {
              complete(habit.id, day);
              if (askMoodOnComplete) askMood(habit, day);
              onCompleted?.();
            }}
          />
          {quit && !future && !past ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(t('Log a slip?'), t('Your clean-day counter for {habit} restarts. That’s okay — every restart is still progress.', { habit: habit.title }), [
                  { text: t('Cancel'), style: 'cancel' },
                  { text: t('I slipped'), style: 'destructive', onPress: () => slip(habit.id, day) },
                ])
              }
              style={{ alignSelf: 'center', marginTop: -6, paddingHorizontal: 10, paddingVertical: 2 }}
            >
              <Txt variant="small" color="secondary" style={{ fontSize: 11.5, textDecorationLine: 'underline' }}>
                {t('I slipped today')}
              </Txt>
            </Pressable>
          ) : (
            <FinalNote done={done} future={future || past || (rest && !done)} />
          )}
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

/** The "no take-backs" nudge under the slider, so people pause before sliding. */
function FinalNote({ done, future }: { done: boolean; future: boolean }) {
  if (future) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -6 }}>
      <LockIcon size={12} color={done ? palette.success : palette.inkMuted} strokeWidth={2.2} />
      <Txt variant="small" color={done ? 'success' : 'secondary'} style={{ fontSize: 11.5 }} numberOfLines={1}>
        {done ? t('Locked in for today — no take-backs') : t('No take-backs — slide only when it’s truly done')}
      </Txt>
    </View>
  );
}

function SavedBadge({ accent, label, caption }: { accent: string; label: string; caption: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: accent, minWidth: 64 }}>
      <Txt variant="goalLabel" color="rgba(255,255,255,0.85)">
        {caption}
      </Txt>
      <Txt variant="goalValue" color="white" numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

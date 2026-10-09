import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { ClockIcon, EditIcon, MinusIcon, PlusIcon, StopIcon, CloseIcon } from '@/components/ui/icons';
import { GradientProgressBar } from './GradientProgressBar';
import { ValueDialog } from './ValueDialog';
import { useTheme } from '@/theme/ThemeContext';
import { palette, radius, spacing } from '@/theme/tokens';
import { hexToRgba } from '@/theme/color';
import { useHabitStore } from '@/store/useHabitStore';
import { lastUpdatedOn, valueOn } from '@/logic/habits';
import { getTheme } from '@/data/themes';
import { fmtNumber, qty, unitFor } from '@/utils/format';
import { formatLastUpdated } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import type { Habit } from '@/data/types';

const TIMED_UNITS = ['min', 'mins', 'minutes', 'hours', 'hr', 'hrs'];

function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return '0:00';
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = `${s % 60}`.padStart(2, '0');
  return h ? `${h}:${`${m}`.padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/**
 * Progress card for the active habit: title + "X to your goal", big value,
 * gradient bar, last-updated line — plus logging controls: −/+ steps, exact
 * value entry and a focus timer for time-based habits.
 */
export function ProgressCard({ habit }: { habit: Habit }) {
  const { theme, isDark } = useTheme();
  const day = useHabitStore((s) => s.selectedDay);
  const today = useHabitStore((s) => s.today);
  const value = useHabitStore((s) => valueOn(s.logs, day, habit.id));
  const at = useHabitStore((s) => lastUpdatedOn(s.logs, day, habit.id));
  const timer = useHabitStore((s) => s.timer);
  const addValue = useHabitStore((s) => s.addValue);
  const startTimer = useHabitStore((s) => s.startTimer);
  const stopTimer = useHabitStore((s) => s.stopTimer);
  const cancelTimer = useHabitStore((s) => s.cancelTimer);

  const colors = getTheme(habit.themeId);
  const remaining = Math.max(0, habit.goalValue - value);
  const done = value >= habit.goalValue;
  const future = day > today;
  const timed = TIMED_UNITS.includes(habit.unit.toLowerCase());
  const running = timer?.habitId === habit.id;
  const elapsed = useElapsed(running ? timer!.startedAt : null);

  const bump = (dir: 1 | -1) => {
    if (dir === -1 && value <= 0) return;
    const before = value;
    addValue(habit.id, day, dir * habit.step);
    if (dir === 1 && before < habit.goalValue && before + habit.step >= habit.goalValue) haptic.success();
  };

  const ctrlBg = isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF';

  return (
    <View
      style={{
        backgroundColor: theme.cardSurface,
        borderRadius: radius.progressCard,
        padding: spacing.cardPad,
        gap: 22,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt variant="progressTitle" numberOfLines={1}>
            {habit.title}
          </Txt>
          <Txt variant="progressSubtitle" color="secondaryStrong">
            {done
              ? value > habit.goalValue
                ? `Goal smashed · +${qty(value - habit.goalValue, habit.unit)}`
                : 'Goal reached 🎉'
              : `${qty(remaining, habit.unit)} to your goal`}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <Txt variant="bigValue">{fmtNumber(value)}</Txt>
          <Txt variant="bigValueUnit" color="secondaryStrong" style={{ marginBottom: 7 }}>
            {unitFor(value, habit.unit)}
          </Txt>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <GradientProgressBar
          fraction={habit.goalValue > 0 ? value / habit.goalValue : 0}
          minLabel="0"
          maxLabel={qty(habit.goalValue, habit.unit).toUpperCase()}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 16 }}>
          <Txt variant="lastUpdated" color="secondary">
            {at ? `Last updated ${formatLastUpdated(at)}` : future ? 'Not open yet' : 'Nothing logged yet'}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: radius.full,
                backgroundColor: done ? palette.success : value > 0 ? '#FF9F0A' : theme.textTertiary,
              }}
            />
            <Txt variant="statusLabel">{done ? 'Done' : value > 0 ? 'In progress' : 'To do'}</Txt>
          </View>
        </View>
      </View>

      {/* Running timer banner */}
      {running && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            paddingLeft: 16,
            borderRadius: 22,
            backgroundColor: hexToRgba(colors.accent, isDark ? 0.25 : 0.12),
          }}
        >
          <ClockIcon size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Txt variant="statSmall" color={colors.accent}>
              {elapsed}
            </Txt>
            <Txt variant="small" color="secondary">
              Timer running · logs on stop
            </Txt>
          </View>
          <PressableScale accessibilityLabel="Cancel timer" onPress={cancelTimer} style={[circle(40), { backgroundColor: ctrlBg }]}>
            <CloseIcon size={18} color={theme.textSecondary} />
          </PressableScale>
          <PressableScale
            accessibilityLabel="Stop timer and log"
            onPress={() => {
              stopTimer();
              haptic.success();
            }}
            style={[circle(44), { backgroundColor: colors.accent }]}
          >
            <StopIcon size={20} color="#FFFFFF" />
          </PressableScale>
        </Animated.View>
      )}

      {/* Logging controls */}
      {!future && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PressableScale
            accessibilityLabel={`Remove ${qty(habit.step, habit.unit)}`}
            onPress={() => bump(-1)}
            disabled={value <= 0}
            style={[circle(50), { backgroundColor: ctrlBg }]}
          >
            <MinusIcon size={20} color={theme.textPrimary} />
          </PressableScale>

          <PressableScale accessibilityLabel={`Add ${qty(habit.step, habit.unit)}`} onPress={() => bump(1)} style={{ flex: 1 }}>
            <View
              style={{
                height: 50,
                borderRadius: 25,
                backgroundColor: colors.accent,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: `0px 8px 18px ${hexToRgba(colors.accent, 0.35)}`,
              }}
            >
              <PlusIcon size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Txt variant="button" color="white">
                {qty(habit.step, habit.unit)}
              </Txt>
            </View>
          </PressableScale>

          {timed && !running && day === today && (
            <PressableScale
              accessibilityLabel="Start focus timer"
              onPress={() => {
                haptic.medium();
                startTimer(habit.id, day);
              }}
              style={[circle(50), { backgroundColor: ctrlBg }]}
            >
              <ClockIcon size={21} color={theme.textPrimary} />
            </PressableScale>
          )}

          <PressableScale
            accessibilityLabel="Enter exact value"
            onPress={() => overlay.open(<ValueDialog habit={habit} day={day} initial={value} />, 'dialog')}
            style={[circle(50), { backgroundColor: ctrlBg }]}
          >
            <EditIcon size={19} color={theme.textPrimary} />
          </PressableScale>
        </View>
      )}
    </View>
  );
}

const circle = (size: number) => ({
  width: size,
  height: size,
  borderRadius: size / 2,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});

import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { ClockIcon, EditIcon, LockIcon, MinusIcon, PlusIcon } from '@/components/ui/icons';
import { useNavigation } from '@react-navigation/native';
import type { RootNav } from '@/navigation/types';
import { QuitProgressCard } from './QuitProgressCard';
import { GradientProgressBar } from './GradientProgressBar';
import { ValueDialog } from './ValueDialog';
import { useTheme } from '@/theme/ThemeContext';
import { palette, radius, spacing } from '@/theme/tokens';
import { hexToRgba } from '@/theme/color';
import { useHabitStore } from '@/store/useHabitStore';
import { lastUpdatedOn, valueOn } from '@/logic/habits';
import { canLogRun } from '@/logic/run';
import { useUnlocked } from '@/store/useLicense';
import { Route } from '@/components/ui/lucide';
import { getTheme } from '@/data/themes';
import { fmtNumber, qty, unitFor } from '@/utils/format';
import { formatLastUpdated } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import type { Habit } from '@/data/types';
import { t } from '@/i18n';

const TIMED_UNITS = ['min', 'mins', 'minutes', 'hours', 'hr', 'hrs'];

/**
 * Progress card for the active habit: title + "X to your goal", big value,
 * gradient bar, last-updated line — plus logging controls: −/+ steps, exact
 * value entry and a focus timer for time-based habits.
 */
export function ProgressCard({ habit }: { habit: Habit }) {
  if (habit.quit) return <QuitProgressCard habit={habit} />;
  return <BuildProgressCard habit={habit} />;
}

function BuildProgressCard({ habit }: { habit: Habit }) {
  const { theme, isDark } = useTheme();
  const day = useHabitStore((s) => s.selectedDay);
  const today = useHabitStore((s) => s.today);
  const value = useHabitStore((s) => valueOn(s.logs, day, habit.id));
  const at = useHabitStore((s) => lastUpdatedOn(s.logs, day, habit.id));
  const addValue = useHabitStore((s) => s.addValue);
  const navigation = useNavigation<RootNav>();

  const colors = getTheme(habit.themeId);
  const remaining = Math.max(0, habit.goalValue - value);
  const done = value >= habit.goalValue;
  const future = day > today;
  const past = day < today;
  const unlocked = useUnlocked();
  const timed = TIMED_UNITS.includes(habit.unit.toLowerCase());
  const runnable = canLogRun(habit);

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
                ? t('Goal smashed · +{amount}', { amount: qty(value - habit.goalValue, habit.unit) })
                : t('Goal reached')
              : t('{amount} to your goal', { amount: qty(remaining, habit.unit) })}
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
            {at ? t('Last updated {when}', { when: formatLastUpdated(at) }) : future ? t('Not open yet') : t('Nothing logged yet')}
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
            <Txt variant="statusLabel">{done ? t('Done') : value > 0 ? t('In progress') : t('To do')}</Txt>
          </View>
        </View>
      </View>

      {/* Done = final: no more edits for this day */}
      {done && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 14,
            borderRadius: 22,
            backgroundColor: hexToRgba(palette.success, isDark ? 0.18 : 0.1),
          }}
        >
          <LockIcon size={18} color={palette.success} strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <Txt variant="label" color="success">
              {day === today ? t('Locked in for today') : t('Locked in for this day')}
            </Txt>
            <Txt variant="small" color="secondary">
              {t('Completed habits can’t be undone — that’s what makes them count.')}
            </Txt>
          </View>
        </View>
      )}

      {past && !done && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 22, backgroundColor: theme.inputBg }}>
          <LockIcon size={18} color={theme.textSecondary} strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <Txt variant="label">{t('This day is closed')}</Txt>
            <Txt variant="small" color="secondary">
              {t('You can look back at past days, but only today can be logged.')}
            </Txt>
          </View>
        </View>
      )}

      {!unlocked && !past && !future && !done && (
        <PressableScale onPress={() => navigation.navigate('Paywall')} accessibilityLabel={t('Get Pro')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 22, backgroundColor: hexToRgba('#056EBE', isDark ? 0.22 : 0.1) }}>
            <LockIcon size={18} color="#3F95DA" strokeWidth={2.2} />
            <View style={{ flex: 1 }}>
              <Txt variant="label">{t('Your free week is over')}</Txt>
              <Txt variant="small" color="secondary">
                {t('Get Pro to keep logging. Your history is safe.')}
              </Txt>
            </View>
            <View style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: '#056EBE' }}>
              <Txt variant="label" color="white">
                {t('Get Pro')}
              </Txt>
            </View>
          </View>
        </PressableScale>
      )}

      {/* Logging controls */}
      {!future && !past && unlocked && !done && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PressableScale
            accessibilityLabel={t('Remove {amount}', { amount: qty(habit.step, habit.unit) })}
            onPress={() => bump(-1)}
            disabled={value <= 0}
            style={[circle(50), { backgroundColor: ctrlBg }]}
          >
            <MinusIcon size={20} color={theme.textPrimary} />
          </PressableScale>

          <PressableScale accessibilityLabel={t('Add {amount}', { amount: qty(habit.step, habit.unit) })} onPress={() => bump(1)} style={{ flex: 1 }}>
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

          {runnable && day === today && (
            <PressableScale
              accessibilityLabel={t('Track a run with GPS')}
              onPress={() => {
                haptic.medium();
                navigation.navigate('Run', { habitId: habit.id });
              }}
              style={[circle(50), { backgroundColor: ctrlBg }]}
            >
              <Route size={20} color={theme.textPrimary} strokeWidth={2} />
            </PressableScale>
          )}

          {timed && !runnable && day === today && (
            <PressableScale
              accessibilityLabel={t('Start focus timer')}
              onPress={() => {
                haptic.medium();
                navigation.navigate('Focus', { habitId: habit.id });
              }}
              style={[circle(50), { backgroundColor: ctrlBg }]}
            >
              <ClockIcon size={21} color={theme.textPrimary} />
            </PressableScale>
          )}

          <PressableScale
            accessibilityLabel={t('Enter exact value')}
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

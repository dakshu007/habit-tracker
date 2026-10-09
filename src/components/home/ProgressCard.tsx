import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { GradientProgressBar } from './GradientProgressBar';
import { useTheme } from '@/theme/ThemeContext';
import { palette, radius, spacing } from '@/theme/tokens';
import { fmtNumber } from '@/utils/format';
import { formatLastUpdated } from '@/utils/date';
import type { Task } from '@/data/types';

/**
 * Progress card for the active task: title + "X to your goal", the large
 * current value with its unit, the gradient progress bar, last-updated line and
 * a status dot — all per Figma.
 */
export function ProgressCard({ task }: { task: Task }) {
  const { theme } = useTheme();
  const remaining = Math.max(0, task.goalValue - task.currentValue);
  const done = task.status === 'done';

  return (
    <View
      style={{
        backgroundColor: theme.cardSurface,
        borderRadius: radius.progressCard,
        padding: spacing.cardPad,
        gap: spacing.cardGap,
      }}
    >
      {/* title / value row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Txt variant="progressTitle" color="primary">
            {task.title}
          </Txt>
          <Txt variant="progressSubtitle" color="secondaryStrong">
            {fmtNumber(remaining)} {task.unit} to your goal
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <Txt variant="bigValue" color="primary">
            {fmtNumber(task.currentValue)}
          </Txt>
          <Txt variant="bigValueUnit" color="secondaryStrong" style={{ marginBottom: 6 }}>
            {task.unit}
          </Txt>
        </View>
      </View>

      {/* bar + footer */}
      <View style={{ gap: 10 }}>
        <GradientProgressBar
          fraction={task.goalValue > 0 ? task.currentValue / task.goalValue : 0}
          minLabel="0"
          maxLabel={`${fmtNumber(task.goalValue)} ${task.unit.toUpperCase()}`}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 16 }}>
          <Txt variant="lastUpdated" color="secondary">
            Last updated {formatLastUpdated(task.lastUpdated)}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: palette.success }} />
            <Txt variant="statusLabel" color="primary">
              {done ? 'Done' : 'In progress'}
            </Txt>
          </View>
        </View>
      </View>
    </View>
  );
}

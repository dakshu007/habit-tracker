import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { radius, spacing } from '@/theme/tokens';
import { hexToRgba } from '@/theme/color';
import type { Task } from '@/data/types';

/**
 * "Goal" badge on the right of the card title row. Background is the task's
 * accent; the border is the lighter accent (bgGradientTop) at 0.2 alpha —
 * exactly as Figma derives `rgba(111,183,237,0.2)` for the Cycling card.
 */
export function GoalBadge({ task }: { task: Task }) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.badgePad,
        borderRadius: radius.goalBadge,
        backgroundColor: task.accentColor,
        borderWidth: 1,
        borderColor: hexToRgba(task.bgGradientTop, 0.2),
      }}
    >
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Txt variant="goalLabel" color="white">
          Goal
        </Txt>
        <Txt variant="goalValue" color="white">
          {task.goalValue} {task.unit}
        </Txt>
      </View>
    </View>
  );
}

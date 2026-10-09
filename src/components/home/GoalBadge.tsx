import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { radius, spacing } from '@/theme/tokens';
import { hexToRgba } from '@/theme/color';
import { fmtNumber } from '@/utils/format';
import type { HabitColors } from '@/data/types';

/**
 * "Goal" badge on the right of the card title row. Background is the habit's
 * accent; the border is the lighter accent (bgTop) at 0.2 alpha, per Figma.
 */
export function GoalBadge({ colors, goal, unit }: { colors: HabitColors; goal: number; unit: string }) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.badgePad,
        borderRadius: radius.goalBadge + 4,
        backgroundColor: colors.accent,
        borderWidth: 1,
        borderColor: hexToRgba(colors.bgTop, 0.2),
        minWidth: 64,
      }}
    >
      <Txt variant="goalLabel" color="rgba(255,255,255,0.85)">
        Goal
      </Txt>
      <Txt variant="goalValue" color="white" numberOfLines={1}>
        {fmtNumber(goal)} {unit}
      </Txt>
    </View>
  );
}

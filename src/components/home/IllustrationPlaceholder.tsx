import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { hexToRgba } from '@/theme/color';
import type { Task } from '@/data/types';

/**
 * Stand-in for the activity artwork until real assets are exported from Figma.
 * Uses the task's light accent as the backdrop (so layout + theming stay
 * accurate) with a centered label. Drop-in replaceable by an <Image> later.
 */
export function IllustrationPlaceholder({ task }: { task: Task }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: task.bgGradientTop,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: hexToRgba('#FFFFFF', 0.35),
        }}
      >
        <Txt variant="goalValue" color={task.accentColor}>
          {task.title}
        </Txt>
      </View>
      <Txt variant="caption" color={hexToRgba('#1C1B22', 0.45)}>
        illustration placeholder
      </Txt>
    </View>
  );
}

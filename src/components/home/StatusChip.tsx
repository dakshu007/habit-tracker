import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { palette, radius } from '@/theme/tokens';
import type { TaskStatus } from '@/data/types';

/**
 * Floating status chip (top-right of the task card). White pill with a soft
 * drop shadow, a status dot and label — green for both states per Figma, with
 * a filled dot when done.
 */
export function StatusChip({ status }: { status: TaskStatus }) {
  const done = status === 'done';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: radius.statusChip,
        backgroundColor: palette.white,
        // drop-shadow-[0px_4px_2px_rgba(0,0,0,0.04)]
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: radius.full,
          backgroundColor: palette.success,
          opacity: done ? 1 : 0.9,
        }}
      />
      <Txt variant="statusChip" color="success">
        {done ? 'Done' : 'In progress'}
      </Txt>
    </View>
  );
}

import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { palette, radius } from '@/theme/tokens';

export type ChipTone = 'done' | 'progress' | 'idle' | 'upcoming';

const TONES: Record<ChipTone, { dot: string; text: string }> = {
  done: { dot: palette.success, text: '#1E9E47' },
  progress: { dot: '#FF9F0A', text: '#C77700' },
  idle: { dot: '#B9B9C2', text: '#6B6B76' },
  upcoming: { dot: '#7D8BFF', text: '#5563D8' },
};

/** Floating white status pill (top-right of the task card). */
export function StatusChip({ tone, label }: { tone: ChipTone; label: string }) {
  const c = TONES[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: radius.statusChip,
        backgroundColor: 'rgba(255,255,255,0.92)',
        boxShadow: '0px 4px 10px rgba(0,0,0,0.08)',
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: radius.full, backgroundColor: c.dot }} />
      <Txt variant="statusChip" color={c.text}>
        {label}
      </Txt>
    </View>
  );
}

import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { ProgressCard } from './ProgressCard';
import { useTaskStore, useActiveTask, type ProgressView } from '@/store/useTaskStore';
import { spacing } from '@/theme/tokens';

const VIEW_OPTIONS: SegmentOption<ProgressView>[] = [
  { key: 'now', label: 'Now' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
];

/**
 * "Progress" heading + Now/Today/Week control + the active task's progress
 * card. Today/Week currently show the same live figures as Now — they become
 * distinct once aggregated history exists (see store TODO).
 */
export function ProgressSection() {
  const view = useTaskStore((s) => s.view);
  const setView = useTaskStore((s) => s.setView);
  const active = useActiveTask();

  return (
    <View style={{ paddingHorizontal: spacing.screenX, gap: 12 }}>
      <Txt variant="progressHeading" color="primary">
        Progress
      </Txt>
      <View style={{ gap: 10 }}>
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />
        <ProgressCard task={active} />
      </View>
    </View>
  );
}

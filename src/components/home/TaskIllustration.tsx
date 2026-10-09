import { Image, View } from 'react-native';

import { IllustrationPlaceholder } from './IllustrationPlaceholder';
import { illustrations } from '@/assets/illustrations/registry';
import type { Task } from '@/data/types';

/**
 * Renders the activity's exported Figma artwork fit to the full card width and
 * anchored to the top — so nothing is cropped horizontally — with the remaining
 * height (behind the white info card) left to the card surface. The card's
 * natural aspect is read from the asset itself, so each illustration sizes
 * correctly with no per-task tuning. Falls back to the labeled accent
 * placeholder when no asset is registered.
 */
export function TaskIllustration({ task }: { task: Task }) {
  const source = illustrations[task.id];
  if (!source) return <IllustrationPlaceholder task={task} />;

  const meta = Image.resolveAssetSource(source);
  const aspect = meta?.width && meta?.height ? meta.width / meta.height : 1;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: aspect }}>
      <Image source={source} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

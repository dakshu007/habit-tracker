import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { LockIcon } from '@/components/ui/icons';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { t } from '@/i18n';
import type { RootNav } from '@/navigation/types';

const BLUE = '#056EBE';

/** In place of a Pro feature on the free plan: what it is, and a way to unlock it. */
export function ProLock({ title, body }: { title: string; body: string }) {
  const { isDark } = useTheme();
  const navigation = useNavigation<RootNav>();
  return (
    <PressableScale onPress={() => navigation.navigate('Paywall')} scaleTo={0.98} accessibilityLabel={`${title}. ${t('Get Pro')}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 24, backgroundColor: hexToRgba(BLUE, isDark ? 0.2 : 0.08) }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(BLUE, isDark ? 0.3 : 0.14) }}>
          <LockIcon size={18} color="#3F95DA" strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="h3">{title}</Txt>
          <Txt variant="small" color="secondary">
            {body}
          </Txt>
        </View>
        <View style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: BLUE }}>
          <Txt variant="label" color="white">
            {t('Get Pro')}
          </Txt>
        </View>
      </View>
    </PressableScale>
  );
}

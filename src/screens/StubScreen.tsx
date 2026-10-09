import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeContext';
import { useActiveTask } from '@/store/useTaskStore';
import { radius } from '@/theme/tokens';
import type { TabIconProps } from '@/components/tabbar/TabIcons';

interface StubScreenProps {
  title: string;
  subtitle: string;
  Icon: (p: TabIconProps) => React.ReactElement;
  /** Optional content rendered below the subtitle (e.g. a settings control). */
  footer?: React.ReactNode;
}

/**
 * Faithful placeholder for tabs not in the design. Themed (light/dark) and
 * accented to the active task, so the stubs stay on-brand until designed.
 */
export function StubScreen({ title, subtitle, Icon, footer }: StubScreenProps) {
  const { theme } = useTheme();
  const accent = useActiveTask().accentColor;

  return (
    <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.innerCard,
              backgroundColor: theme.cardSurface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon color={accent} size={32} />
          </View>
          <Txt variant="cardTitle" color="primary">
            {title}
          </Txt>
          <Txt variant="cardSubtitle" color="secondary" style={{ textAlign: 'center' }}>
            {subtitle}
          </Txt>
          {footer ? <View style={{ alignSelf: 'stretch', marginTop: 8 }}>{footer}</View> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

import { View } from 'react-native';

import { Screen, Card } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { GlassButton } from '@/components/ui/Glass';
import { ChevronLeft } from '@/components/ui/icons';
import { ShieldCheck } from '@/components/ui/lucide';
import { useTheme } from '@/theme/ThemeContext';
import { PRIVACY_SECTIONS, PRIVACY_UPDATED, SUPPORT_EMAIL } from '@/data/privacy';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

export function PrivacyScreen({ navigation }: RootScreenProps<'Privacy'>) {
  const { theme } = useTheme();
  return (
    <Screen
      title={t('Privacy')}
      subtitle={t('Last updated {date}', { date: PRIVACY_UPDATED })}
      accent="#34C7A0"
      tabBar={false}
      left={
        <GlassButton accessibilityLabel={t('Back')} fill={theme.inputBg} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={theme.textPrimary} strokeWidth={2.4} />
        </GlassButton>
      }
    >
      <View style={{ alignItems: 'center', paddingVertical: 6 }}>
        <ShieldCheck size={48} color="#34C7A0" strokeWidth={1.6} />
      </View>
      {PRIVACY_SECTIONS.map((sec, i) => (
        <Card key={sec.title} delay={i * 30} style={{ gap: 6 }}>
          <Txt variant="h3">{t(sec.title)}</Txt>
          <Txt variant="bodyRegular" color="secondary">
            {t(sec.body, { email: SUPPORT_EMAIL })}
          </Txt>
        </Card>
      ))}
    </Screen>
  );
}

import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { Gem } from '@/components/ui/lucide';
import { useLicense, usePro } from '@/store/useLicense';
import { manageSubscription } from '@/services/billing';
import { useTheme } from '@/theme/ThemeContext';
import { t } from '@/i18n';
import type { RootNav } from '@/navigation/types';

/**
 * Profile header, top right, for people who already have Pro: a small plan
 * button instead of the big Pro banner. Subscribers manage their plan in
 * Google Play; everyone else sees their plan on the Pro screen.
 */
export function ProBadge() {
  const { isDark } = useTheme();
  const navigation = useNavigation<RootNav>();
  const pro = usePro();
  const lifetime = useLicense((s) => s.lifetime);
  const subscription = useLicense((s) => s.subscription);
  if (!pro) return null;
  const label = lifetime ? t('Lifetime') : subscription === 'yearly' ? t('Yearly') : subscription === 'monthly' ? t('Monthly') : null;
  return (
    <PressableScale
      onPress={() => (subscription && !lifetime ? manageSubscription() : navigation.navigate('Paywall'))}
      accessibilityLabel={label ? t('Pro plan: {plan}', { plan: label }) : t('Pro')}
      style={{ marginBottom: 6 }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          height: 34,
          paddingHorizontal: 12,
          borderRadius: 17,
          backgroundColor: isDark ? 'rgba(255,211,110,0.16)' : '#FFF6DF',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,211,110,0.4)' : '#F3D78E',
        }}
      >
        <Gem size={15} color="#C98A12" strokeWidth={2.3} />
        <Txt variant="label" color={isDark ? '#FFD36E' : '#8A5A00'} numberOfLines={1}>
          {label ? `${t('Pro')} · ${label}` : t('Pro')}
        </Txt>
      </View>
    </PressableScale>
  );
}

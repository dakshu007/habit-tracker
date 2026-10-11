import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { Gem } from '@/components/ui/lucide';
import { PAYWALL_MODE, trialDaysLeft, useLicense, usePrices, usePro } from '@/store/useLicense';
import { t } from '@/i18n';

/** Days left when Home should nudge (last 3 days of the trial, or after it), else null. */
export function useTrialNudge(): number | null {
  const owned = usePro();
  const trialStart = useLicense((s) => s.trialStart);
  if (PAYWALL_MODE !== 'live' || owned || trialStart == null) return null;
  const left = trialDaysLeft(trialStart);
  return left > 3 ? null : left;
}

export function TrialPill({ onPress }: { onPress: () => void }) {
  const price = usePrices().yearly;
  const left = useTrialNudge();
  if (left == null) return null;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={t('Get Pro')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)' }}>
        <Gem size={16} color="#056EBE" strokeWidth={2.2} />
        <Txt variant="label" color="#1C1B22">
          {left > 0 ? t('{n} days left in your free trial · Pro from {price}/year', { n: left, price }) : t('Free plan: 5 habits · get Pro from {price}/year', { price })}
        </Txt>
      </View>
    </PressableScale>
  );
}

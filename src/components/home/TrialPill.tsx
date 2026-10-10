import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { Gem } from '@/components/ui/lucide';
import { PAYWALL_MODE, trialDaysLeft, useLicense, usePrice } from '@/store/useLicense';
import { t } from '@/i18n';

/** Days left when Home should nudge (last 3 days of the free week, or after it), else null. */
export function useTrialNudge(): number | null {
  const owned = useLicense((s) => s.owned);
  const trialStart = useLicense((s) => s.trialStart);
  if (PAYWALL_MODE !== 'live' || owned || trialStart == null) return null;
  const left = trialDaysLeft(trialStart);
  return left > 3 ? null : left;
}

export function TrialPill({ onPress }: { onPress: () => void }) {
  const price = usePrice();
  const left = useTrialNudge();
  if (left == null) return null;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={t('Unlock lifetime')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)' }}>
        <Gem size={16} color="#056EBE" strokeWidth={2.2} />
        <Txt variant="label" color="#1C1B22">
          {left > 0 ? t('{n} days left in your free week · {price} lifetime', { n: left, price }) : t('Free week over · unlock lifetime for {price}', { price })}
        </Txt>
      </View>
    </PressableScale>
  );
}

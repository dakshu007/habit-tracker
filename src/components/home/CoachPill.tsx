import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { Bot } from '@/components/ui/lucide';
import { backendEnabled } from '@/config/backend';
import { useCoachStore } from '@/store/useCoachStore';
import { weekKey } from '@/services/coach';
import { t } from '@/i18n';
import type { RootNav } from '@/navigation/types';

/**
 * Home header, under your name: a small glass pill that says the app has an
 * AI coach, without taking a row of its own. Everyone sees it (free plans get
 * a weekly insight); it reads "has a tip" until this week's insight is opened.
 */
export function CoachPill() {
  const navigation = useNavigation<RootNav>();
  const weekly = useCoachStore((s) => s.weekly);
  if (!backendEnabled()) return null;
  const fresh = weekly?.week !== weekKey();
  return (
    <Animated.View entering={FadeIn.delay(400)} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
      <PressableScale onPress={() => navigation.navigate('Coach')} scaleTo={0.95} accessibilityLabel={t('Ask your AI coach')}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            height: 28,
            paddingLeft: 4,
            paddingRight: 12,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.24)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.4)',
          }}
        >
          <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
            <Bot size={13} color="#5E8C74" strokeWidth={2.4} />
          </View>
          <Txt variant="label" color="white" numberOfLines={1} style={{ fontSize: 12.5 }}>
            {fresh ? t('Your AI coach has a tip') : t('Ask your AI coach')}
          </Txt>
          {fresh && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD36E' }} />}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

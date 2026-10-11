import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { ChevronRight } from '@/components/ui/icons';
import { Sparkles } from '@/components/ui/lucide';
import { backendEnabled } from '@/config/backend';
import { useCoachStore } from '@/store/useCoachStore';
import { t } from '@/i18n';
import type { RootNav } from '@/navigation/types';

/** Entry to the AI coach (Stats). Hidden until the backend is configured. */
export function CoachCard() {
  const navigation = useNavigation<RootNav>();
  const weekly = useCoachStore((s) => s.weekly);
  if (!backendEnabled()) return null;
  return (
    <PressableScale onPress={() => navigation.navigate('Coach')} scaleTo={0.98} accessibilityLabel={t('Your coach')}>
      <LinearGradient colors={['#5B6CF0', '#8E5CF5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' }}>
          <Sparkles size={22} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="h3" color="white">
            {t('Your AI coach')}
          </Txt>
          <Txt variant="small" color="rgba(255,255,255,0.88)" numberOfLines={2}>
            {weekly?.text ?? t('Ask why a habit isn’t sticking, or get this week’s insight.')}
          </Txt>
        </View>
        <ChevronRight size={18} color="#FFFFFF" />
      </LinearGradient>
    </PressableScale>
  );
}

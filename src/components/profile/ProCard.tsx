import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useTabFocused } from '@/navigation/MainTabs';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { CheckIcon, ChevronRight } from '@/components/ui/icons';
import { Gem } from '@/components/ui/lucide';
import { trialDaysLeft, useLicense, usePrices } from '@/store/useLicense';
import { useHabitStore } from '@/store/useHabitStore';
import { manageSubscription } from '@/services/billing';
import { t } from '@/i18n';
import type { RootNav } from '@/navigation/types';

const COLORS = ['#3F95DA', '#5B6CF0', '#8E5CF5'] as const;
const GOLD = '#FFD36E';

/**
 * Profile → Habit Tracker Pro. Before buying it's the eye-catcher: a light
 * sweep runs across it, the gem breathes and the three prices sit right on it.
 * After buying it calms down to a thank-you with "manage".
 */
export function ProCard() {
  const navigation = useNavigation<RootNav>();
  const lifetime = useLicense((s) => s.lifetime);
  const subscription = useLicense((s) => s.subscription);
  const codeUntil = useLicense((s) => s.codeUntil);
  const trialLeft = trialDaysLeft(useLicense((s) => s.trialStart));
  const prices = usePrices();
  const motion = useHabitStore((s) => s.settings.motion);
  const owned = lifetime || subscription != null || (codeUntil ?? 0) > Date.now();
  const [w, setW] = useState(0);

  const sweep = useSharedValue(0);
  const pulse = useSharedValue(0);
  // Only animate while Profile is on screen (tabs stay mounted in the background).
  const focused = useTabFocused('Profile');
  useEffect(() => {
    if (owned || !motion || !focused) return;
    sweep.value = withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }), withDelay(2200, withTiming(0, { duration: 0 }))), -1);
    pulse.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(sweep);
      cancelAnimation(pulse);
      sweep.value = 0;
      pulse.value = 0;
    };
  }, [owned, motion, focused, sweep, pulse]);

  const sheen = useAnimatedStyle(() => ({ transform: [{ translateX: -160 + sweep.value * (w + 320) }, { rotate: '18deg' }] }));
  const glow = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.08 }], opacity: 0.55 + pulse.value * 0.45 }));

  const title = lifetime ? t('Pro · Lifetime') : subscription === 'yearly' ? t('Pro · Yearly') : subscription === 'monthly' ? t('Pro · Monthly') : owned ? t('Pro unlocked') : t('Habit Tracker Pro');
  const subtitle = lifetime
    ? t('Every feature, forever. Thank you!')
    : subscription
      ? t('Tap to manage or cancel in Google Play')
      : owned
        ? t('Every feature is unlocked.')
        : trialLeft > 0
          ? t('{n} days left in your free week', { n: trialLeft })
          : t('Your free week has ended');

  const open = () => (subscription && !lifetime ? manageSubscription() : navigation.navigate('Paywall'));

  return (
    <PressableScale onPress={open} scaleTo={0.98} accessibilityLabel={`${title}. ${subtitle}`}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderRadius: 28, overflow: 'hidden', boxShadow: '0px 14px 32px rgba(91,108,240,0.38)' }}>
        <LinearGradient colors={[...COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, gap: 14 }}>
          {!owned && (
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -60, bottom: -60, width: 90 }, sheen]}>
              <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
            </Animated.View>
          )}
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={[{ position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,211,110,0.35)' }, owned ? null : glow]} />
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center' }}>
                <Gem size={20} color={GOLD} strokeWidth={2.2} />
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="h2" color="white" numberOfLines={1}>
                {title}
              </Txt>
              <Txt variant="small" color="rgba(255,255,255,0.88)" numberOfLines={2}>
                {subtitle}
              </Txt>
            </View>
            {owned ? <CheckIcon size={20} color="#FFFFFF" strokeWidth={3} /> : null}
          </View>

          {!owned && (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: t('Monthly'), price: prices.monthly },
                  { label: t('Yearly'), price: prices.yearly, best: true },
                  { label: t('Lifetime'), price: prices.lifetime },
                ].map((p) => (
                  <View
                    key={p.label}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 16,
                      alignItems: 'center',
                      backgroundColor: p.best ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.14)',
                      borderWidth: 1,
                      borderColor: p.best ? 'rgba(255,211,110,0.8)' : 'rgba(255,255,255,0.25)',
                    }}
                  >
                    <Txt variant="micro" color={p.best ? GOLD : 'rgba(255,255,255,0.8)'}>
                      {p.best ? t('Best value') : p.label}
                    </Txt>
                    <Txt variant="label" color="white" numberOfLines={1}>
                      {p.price}
                    </Txt>
                  </View>
                ))}
              </View>
              <View style={{ height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Txt variant="button" color="#4B55D8">
                  {t('See all Pro plans')}
                </Txt>
                <ChevronRight size={16} color="#4B55D8" />
              </View>
            </>
          )}
        </LinearGradient>
      </View>
    </PressableScale>
  );
}

import { useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { CheckIcon, CloseIcon } from '@/components/ui/icons';
import { FileText, Footprints, Gift, Mic, MoonStar, Sparkles, Trophy, type LucideIcon } from '@/components/ui/lucide';
import { HabitArt } from '@/components/art/HabitArt';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { PAYWALL_MODE, TRIAL_DAYS, trialDaysLeft, useLicense, usePrice, useUnlocked } from '@/store/useLicense';
import { buyLifetime, refresh, restoreLifetime } from '@/services/billing';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

const SKY = ['#7EC2F0', '#3F95DA', '#056EBE'] as const;

const PERKS: { Icon: LucideIcon; title: string; body: string }[] = [
  { Icon: Sparkles, title: 'Every habit, every illustration', body: 'Unlimited habits, themes, widgets and streak freezes.' },
  { Icon: Footprints, title: 'GPS runs with a live map', body: 'Distance, pace and splits — logged to your habit.' },
  { Icon: MoonStar, title: 'Sleep from phone use', body: 'No watch needed.' },
  { Icon: Mic, title: 'Voice logging', body: '“2 glasses of water” — done.' },
  { Icon: Trophy, title: 'Challenges with friends', body: 'Share a code, do it together.' },
  { Icon: FileText, title: 'Monthly reports', body: 'PDF and spreadsheet exports.' },
];

/**
 * Lifetime unlock: one payment, no subscription. Shown when the free week ends
 * (and from Profile any time). Closing it keeps the app open in view-only mode.
 */
export function PaywallScreen({ navigation }: RootScreenProps<'Paywall'>) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const price = usePrice();
  const owned = useLicense((s) => s.owned);
  const trialStart = useLicense((s) => s.trialStart);
  const unlocked = useUnlocked();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const left = trialDaysLeft(trialStart);

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const buy = async () => {
    if (busy) return;
    setBusy('buy');
    setNote(null);
    const r = await buyLifetime();
    setBusy(null);
    if (r === 'purchased') haptic.success();
    else if (r === 'pending') setNote(t('Payment pending — the app unlocks by itself as soon as Google Play confirms it.'));
    else if (r === 'unavailable')
      setNote(PAYWALL_MODE === 'live' ? t('Google Play isn’t available right now. Check your connection and try again.') : t('Purchases work in the Play Store version. This test build never locks.'));
    else if (r === 'error') setNote(t('Something went wrong with Google Play. You weren’t charged — please try again.'));
  };

  const restore = async () => {
    if (busy) return;
    setBusy('restore');
    setNote(null);
    const ok = await restoreLifetime();
    setBusy(null);
    setNote(ok ? null : t('No purchase found on this Google account.'));
    if (ok) haptic.success();
  };

  const status = owned
    ? t('Lifetime unlocked — thank you!')
    : left > 0
      ? t('{n} days left in your free week', { n: left })
      : t('Your free week has ended');

  const art = Math.min(96, (width - 80) / 3);

  return (
    <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
      <LinearGradient colors={[...SKY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30, paddingHorizontal: 20, gap: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <GlassButton accessibilityLabel={t('Close')} fill="rgba(255,255,255,0.22)" onPress={() => navigation.goBack()}>
            <CloseIcon size={20} color="#FFFFFF" />
          </GlassButton>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
          {['aura-shoe', 'aura-drop', 'aura-lotus'].map((id, i) => (
            <View
              key={id}
              style={{
                width: art,
                height: art,
                borderRadius: 26,
                overflow: 'hidden',
                borderWidth: 3,
                borderColor: 'rgba(255,255,255,0.75)',
                transform: [{ rotate: `${(i - 1) * 6}deg` }, { translateY: i === 1 ? -8 : 0 }],
              }}
            >
              <HabitArt artId={id} mode="thumb" />
            </View>
          ))}
        </View>

        <View style={{ alignItems: 'center', gap: 6 }}>
          <Txt variant="micro" color="rgba(255,255,255,0.85)">
            {status}
          </Txt>
          <Txt variant="display" color="white" style={{ textAlign: 'center' }}>
            {owned ? t('You’re all set') : t('Keep every habit going')}
          </Txt>
          <Txt variant="body" color="rgba(255,255,255,0.9)" style={{ textAlign: 'center' }}>
            {t('One payment. Yours forever — no subscription.')}
          </Txt>
        </View>

        <View style={{ borderRadius: 28, padding: 18, gap: 14, backgroundColor: isDark ? theme.cardElevated : '#FFFFFF', boxShadow: '0px 14px 34px rgba(0,0,0,0.12)' }}>
          {PERKS.map(({ Icon, title, body }) => (
            <View key={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(SKY[2], isDark ? 0.25 : 0.1) }}>
                <Icon size={19} color={isDark ? SKY[0] : SKY[2]} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{t(title)}</Txt>
                <Txt variant="small" color="secondary">
                  {t(body)}
                </Txt>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba('#34C759', isDark ? 0.25 : 0.12) }}>
              <Gift size={19} color="#34C759" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{t('All future features')}</Txt>
              <Txt variant="small" color="secondary">
                {t('Every update included. Your data stays on your phone.')}
              </Txt>
            </View>
          </View>
        </View>

        {owned ? (
          <Button label={t('Back to my habits')} color={SKY[2]} icon={<CheckIcon size={18} color="#FFFFFF" strokeWidth={3} />} onPress={() => navigation.goBack()} />
        ) : (
          <View style={{ gap: 10 }}>
            <Button label={busy === 'buy' ? t('Opening Google Play…') : t('Unlock forever · {price}', { price })} color={SKY[2]} onPress={buy} disabled={!!busy} />
            <Txt variant="small" color="secondary" style={{ textAlign: 'center' }}>
              {left > 0 ? t('Pay now or after your {n}-day trial. Paid securely through Google Play.', { n: TRIAL_DAYS }) : t('Paid once, securely through Google Play.')}
            </Txt>
            {note && (
              <View style={{ padding: 14, borderRadius: 18, backgroundColor: hexToRgba('#FFB020', isDark ? 0.16 : 0.12) }}>
                <Txt variant="small">{note}</Txt>
              </View>
            )}
            <PressableScale onPress={restore} style={{ alignSelf: 'center', padding: 8 }}>
              <Txt variant="label" color={isDark ? SKY[0] : SKY[2]}>
                {busy === 'restore' ? t('Checking…') : t('Restore purchase')}
              </Txt>
            </PressableScale>
            {!unlocked && (
              <Txt variant="small" color="tertiary" style={{ textAlign: 'center' }}>
                {t('You can still open the app and look at your history.')}
              </Txt>
            )}
            {PAYWALL_MODE === 'preview' && (
              <Txt variant="small" color="tertiary" style={{ textAlign: 'center' }}>
                {t('Test build: nothing is locked.')}
              </Txt>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

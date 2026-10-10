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
import { PAYWALL_MODE, TRIAL_DAYS, trialDaysLeft, useLicense, usePrices, usePro, useUnlocked, type Plan } from '@/store/useLicense';
import { buy, manageSubscription, refresh, restorePurchases } from '@/services/billing';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

const SKY = ['#7EC2F0', '#3F95DA', '#056EBE'] as const;
const GOLD = '#F5A623';

const PERKS: { Icon: LucideIcon; title: string; body: string }[] = [
  { Icon: Sparkles, title: 'Every habit, every illustration', body: 'Unlimited habits, themes, widgets and streak freezes.' },
  { Icon: Footprints, title: 'GPS runs with a live map', body: 'Distance, pace and splits, logged to your habit.' },
  { Icon: MoonStar, title: 'Sleep from phone use', body: 'No watch needed.' },
  { Icon: Mic, title: 'Voice logging', body: '“2 glasses of water”. Done.' },
  { Icon: Trophy, title: 'Challenges with friends', body: 'Share a code, do it together.' },
  { Icon: FileText, title: 'Insights and reports', body: 'Patterns, Year in Review, PDF and spreadsheet exports.' },
  { Icon: Gift, title: 'All future features', body: 'Every update included. Your data stays on your phone.' },
];

/** "₹399.00" → 399 (for the per-month and savings maths). */
function amount(display: string): number | null {
  const n = Number(display.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Same currency formatting as Play's price, with a different number ("₹399.00" + 33 → "₹33"). */
function like(display: string, value: number): string {
  const symbol = display.replace(/[\d.,\s]/g, '') || '₹';
  return `${symbol}${Math.round(value)}`;
}

/**
 * Habit Tracker Pro: monthly, yearly (pre-selected, best value) or lifetime.
 * Shown when the free week ends and from Profile. Closing it keeps the app
 * open in view-only mode.
 */
export function PaywallScreen({ navigation }: RootScreenProps<'Paywall'>) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const prices = usePrices();
  const pro = usePro();
  const lifetime = useLicense((s) => s.lifetime);
  const subscription = useLicense((s) => s.subscription);
  const trialStart = useLicense((s) => s.trialStart);
  const unlocked = useUnlocked();
  const [plan, setPlan] = useState<Plan>('yearly');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const left = trialDaysLeft(trialStart);

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const monthly = amount(prices.monthly);
  const yearly = amount(prices.yearly);
  const perMonth = yearly ? like(prices.yearly, yearly / 12) : null;
  const save = monthly && yearly ? Math.round((1 - yearly / (monthly * 12)) * 100) : null;

  const PLANS: { id: Plan; title: string; price: string; caption: string; badge?: string }[] = [
    { id: 'monthly', title: t('Monthly'), price: t('{price} / month', { price: prices.monthly }), caption: t('Cancel anytime') },
    {
      id: 'yearly',
      title: t('Yearly'),
      price: t('{price} / year', { price: prices.yearly }),
      caption: perMonth ? t('Just {price}/month', { price: perMonth }) : t('Billed once a year'),
      badge: save && save > 0 ? t('Save {pct}%', { pct: save }) : t('Best value'),
    },
    { id: 'lifetime', title: t('Lifetime'), price: t('{price} once', { price: prices.lifetime }), caption: t('Pay once, yours forever') },
  ];

  const purchase = async () => {
    if (busy) return;
    setBusy('buy');
    setNote(null);
    const r = await buy(plan);
    setBusy(null);
    if (r === 'purchased') haptic.success();
    else if (r === 'pending') setNote(t('Payment pending. The app unlocks by itself as soon as Google Play confirms it.'));
    else if (r === 'unavailable')
      setNote(PAYWALL_MODE === 'live' ? t('Google Play isn’t available right now. Check your connection and try again.') : t('Purchases work in the Play Store version. This test build never locks.'));
    else if (r === 'error') setNote(t('Something went wrong with Google Play. You weren’t charged, so please try again.'));
  };

  const restore = async () => {
    if (busy) return;
    setBusy('restore');
    setNote(null);
    const ok = await restorePurchases();
    setBusy(null);
    setNote(ok ? null : t('No purchase found on this Google account.'));
    if (ok) haptic.success();
  };

  const status = lifetime
    ? t('Lifetime unlocked. Thank you!')
    : subscription
      ? subscription === 'yearly'
        ? t('You’re on Pro yearly. Thank you!')
        : t('You’re on Pro monthly. Thank you!')
      : left > 0
        ? t('{n} days left in your free week', { n: left })
        : t('Your free week has ended');

  const art = Math.min(96, (width - 80) / 3);
  const cardBg = isDark ? theme.cardElevated : '#FFFFFF';
  const selected = PLANS.find((p) => p.id === plan)!;

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
            {pro ? t('You’re all set') : t('Habit Tracker Pro')}
          </Txt>
          <Txt variant="body" color="rgba(255,255,255,0.9)" style={{ textAlign: 'center' }}>
            {pro ? t('Every feature is unlocked.') : t('Keep every habit going. Try it free for {n} days.', { n: TRIAL_DAYS })}
          </Txt>
        </View>

        {!pro && (
          <View style={{ gap: 10 }}>
            {PLANS.map((p) => {
              const on = p.id === plan;
              return (
                <PressableScale key={p.id} silent onPress={() => (haptic.tick(), setPlan(p.id))} scaleTo={0.98} accessibilityLabel={`${p.title} ${p.price}`}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      padding: 16,
                      borderRadius: 22,
                      backgroundColor: cardBg,
                      borderWidth: 2.5,
                      borderColor: on ? SKY[2] : 'transparent',
                      boxShadow: '0px 8px 22px rgba(0,0,0,0.08)',
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: on ? SKY[2] : theme.textTertiary,
                        backgroundColor: on ? SKY[2] : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on && <CheckIcon size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Txt variant="h3">{p.title}</Txt>
                        {p.badge && (
                          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: GOLD }}>
                            <Txt variant="micro" color="white">
                              {p.badge}
                            </Txt>
                          </View>
                        )}
                      </View>
                      <Txt variant="small" color="secondary">
                        {p.caption}
                      </Txt>
                    </View>
                    <Txt variant="h3">{p.price}</Txt>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        )}

        {pro ? (
          <View style={{ gap: 10 }}>
            <Button label={t('Back to my habits')} color={SKY[2]} icon={<CheckIcon size={18} color="#FFFFFF" strokeWidth={3} />} onPress={() => navigation.goBack()} />
            {subscription && <Button label={t('Manage subscription')} variant="glass" onPress={manageSubscription} />}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Button
              label={busy === 'buy' ? t('Opening Google Play…') : plan === 'lifetime' ? t('Unlock forever · {price}', { price: prices.lifetime }) : t('Continue · {price}', { price: selected.price })}
              color={SKY[2]}
              onPress={purchase}
              disabled={!!busy}
            />
            <Txt variant="small" color="secondary" style={{ textAlign: 'center' }}>
              {plan === 'lifetime'
                ? t('One payment through Google Play. No subscription.')
                : t('Renews automatically through Google Play until you cancel. Cancel anytime in Play Store → Subscriptions.')}
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

        <View style={{ borderRadius: 28, padding: 18, gap: 14, backgroundColor: cardBg }}>
          <Txt variant="micro" color="secondary">
            {t('Everything in Pro')}
          </Txt>
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
        </View>
      </ScrollView>
    </View>
  );
}

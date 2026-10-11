import { useCallback, useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { Gift, Users } from '@/components/ui/lucide';
import { fetchReferrals, inviteLink, type Referrals } from '@/services/backend';
import { useHabitStore } from '@/store/useHabitStore';
import { useLicense } from '@/store/useLicense';
import { useTabFocused } from '@/navigation/MainTabs';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';

const GOAL = 5;

const dateLabel = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Profile → Invite friends. Each friend who installs from your link and uses
 * the app on 3 days gives you 2 weeks of Pro; 5 friends make 3 months. They
 * get a 14-day trial instead of 7.
 */
export function ReferralCard() {
  const focused = useTabFocused('Profile');
  const name = useHabitStore((s) => s.profile.name);
  const rewardUntil = useLicense((s) => s.rewardUntil);
  const [r, setR] = useState<Referrals | null>(null);

  const load = useCallback(() => {
    fetchReferrals().then((x) => x && setR(x));
  }, []);
  useEffect(() => {
    if (focused) load();
  }, [focused, load]);

  const share = async () => {
    if (!r?.code) return;
    haptic.tick();
    const link = inviteLink(r.code);
    const message = [
      name ? t('{name} invited you to Habit Tracker 🌱', { name }) : t('Join me on Habit Tracker 🌱'),
      t('Beautiful habit cards, streaks, runs and sleep tracking. Install with my link and get a 14-day free trial:'),
      link,
    ].join('\n');
    await Share.share({ message }).catch(() => {});
  };

  const qualified = r?.qualified ?? 0;
  const earned = rewardUntil && rewardUntil > Date.now() ? rewardUntil : null;

  return (
    <PressableScale onPress={share} scaleTo={0.98} accessibilityLabel={t('Invite friends')}>
      <LinearGradient colors={['#FFB547', '#FF7A2F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)' }}>
            <Gift size={22} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="h3" color="white">
              {t('Invite 5 friends, get 3 months of Pro')}
            </Txt>
            <Txt variant="small" color="rgba(255,255,255,0.92)">
              {t('2 weeks free for every friend who uses the app for 3 days. They get a 14-day trial.')}
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {Array.from({ length: GOAL }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < qualified ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Users size={14} color="#FFFFFF" strokeWidth={2.2} />
            <Txt variant="small" color="white">
              {r ? t('{q} of {goal} friends · {j} joined', { q: Math.min(qualified, GOAL), goal: GOAL, j: r.joined }) : t('Tap to share your invite link')}
            </Txt>
          </View>
          <View style={{ paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
            <Txt variant="label" color="#E0631A">
              {t('Share invite')}
            </Txt>
          </View>
        </View>
        {earned ? (
          <Txt variant="small" color="white">
            {t('Pro from invites until {date} 🎉', { date: dateLabel(earned) })}
          </Txt>
        ) : null}
      </LinearGradient>
    </PressableScale>
  );
}

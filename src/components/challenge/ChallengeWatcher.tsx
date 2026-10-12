import { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from '@/components/ui/Txt';
import { Button } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { Trophy, Flag } from '@/components/ui/lucide';
import { useHabitStore } from '@/store/useHabitStore';
import { challengeProgress, getChallenge } from '@/data/challenges';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';

/** Closes challenges whose time is up, awards trophies and celebrates. Mount once (MainTabs). */
export function useChallengeWatcher() {
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);

  useEffect(() => {
    const { updateHabit, addTrophy } = useHabitStore.getState();
    for (const h of habits) {
      if (!h.challenge || h.challenge.closed) continue;
      const p = challengeProgress(h, logs, today);
      if (!p?.finished) continue;
      const c = getChallenge(h.challenge.id);
      updateHabit({ ...h, challenge: { ...h.challenge, closed: true, passed: p.passed } });
      if (p.passed) {
        addTrophy({ id: h.challenge.id, title: c?.title ?? h.title, days: h.challenge.days, completedAt: new Date().toISOString() });
        haptic.success();
      }
      overlay.open(<ChallengeResult title={c?.title ?? h.title} passed={p.passed} done={p.doneDays} total={p.dueDays} />, 'dialog');
      break; // one celebration at a time
    }
  }, [habits, logs, today]);
}

function ChallengeResult({ title, passed, done, total }: { title: string; passed: boolean; done: number; total: number }) {
  return (
    <View style={{ padding: 24, alignItems: 'center', gap: 12 }}>
      <LinearGradient
        colors={passed ? ['#FFE08A', '#F5A623'] : ['#C9D3E0', '#8A96A8']}
        style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        {passed ? <Trophy size={46} color="#FFFFFF" strokeWidth={1.8} /> : <Flag size={44} color="#FFFFFF" strokeWidth={1.8} />}
      </LinearGradient>
      <Txt variant="title" style={{ textAlign: 'center' }}>
        {passed ? t('Challenge complete!') : t('Challenge finished')}
      </Txt>
      <Txt variant="bodyRegular" color="secondary" style={{ textAlign: 'center' }}>
        {passed
          ? t('{title}: {done} of {total} days done. The trophy is yours.', { title: t(title), done, total })
          : t('{title}: {done} of {total} days. Not a trophy this time, but you built momentum. Try again?', { title: t(title), done, total })}
      </Txt>
      <Button label={t('Nice')} onPress={overlay.close} style={{ alignSelf: 'stretch', marginTop: 8 }} />
    </View>
  );
}

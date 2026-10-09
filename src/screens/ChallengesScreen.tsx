import { useMemo } from 'react';
import { View } from 'react-native';

import { Screen, Card, SectionTitle } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { ChevronLeft } from '@/components/ui/icons';
import { Flag, Target, Trophy } from '@/components/ui/lucide';
import { HabitArt } from '@/components/art/HabitArt';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { challengeProgress, challenges, habitForChallenge, PASS_RATE } from '@/data/challenges';
import { templates } from '@/data/templates';
import { getTheme } from '@/data/themes';
import { MONTH_LABELS } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

const MILESTONES = [0.25, 0.5, 0.75, 1];

export function ChallengesScreen({ navigation }: RootScreenProps<'Challenges'>) {
  const { theme } = useTheme();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const trophies = useHabitStore((s) => s.extras.trophies);
  const addHabit = useHabitStore((s) => s.addHabit);

  const active = useMemo(
    () => habits.filter((h) => h.challenge && !h.challenge.closed && !h.archived).map((h) => ({ h, p: challengeProgress(h, logs, today)! })),
    [habits, logs, today],
  );
  const activeIds = new Set(active.map((a) => a.h.challenge!.id));

  const join = (id: string) => {
    const c = challenges.find((x) => x.id === id)!;
    haptic.success();
    addHabit(habitForChallenge(c, today));
    navigation.goBack();
  };

  return (
    <Screen
      title={t('Challenges')}
      subtitle={t('Commit to a few weeks. Finish strong.')}
      accent="#F5A623"
      tabBar={false}
      left={
        <GlassButton accessibilityLabel={t('Back')} fill={theme.inputBg} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={theme.textPrimary} strokeWidth={2.4} />
        </GlassButton>
      }
    >
      {active.length > 0 && (
        <>
          <SectionTitle>{t('In progress')}</SectionTitle>
          {active.map(({ h, p }) => {
            const c = getTheme(h.themeId);
            const total = h.challenge!.days;
            return (
              <Card key={h.id} style={{ gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <ProgressRing value={p.frac} size={84} stroke={9} track={theme.progressTrack} from={c.bgTop} to={c.accent}>
                    <Txt variant="statSmall">{p.day}</Txt>
                    <Txt variant="small" color="secondary">
                      / {total}
                    </Txt>
                  </ProgressRing>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt variant="h3">{challenges.find((x) => x.id === h.challenge!.id)?.title ?? h.title}</Txt>
                    <Txt variant="small" color="secondary">
                      {t('Day {day} of {total} · {done} done', { day: p.day, total, done: p.doneDays })}
                    </Txt>
                    <Txt variant="small" color={p.dueDays && p.doneDays / p.dueDays >= PASS_RATE ? 'success' : 'secondary'}>
                      {t('Finish with {pct}% of days to earn the trophy', { pct: Math.round(PASS_RATE * 100) })}
                    </Txt>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {MILESTONES.map((m, i) => {
                    const reached = p.frac >= m;
                    const Icon = i === 3 ? Trophy : i === 1 ? Target : Flag;
                    return (
                      <View key={m} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: reached ? c.accent : theme.inputBg,
                          }}
                        >
                          <Icon size={18} color={reached ? '#FFFFFF' : theme.textTertiary} strokeWidth={2} />
                        </View>
                        <Txt variant="small" color={reached ? 'primary' : 'secondary'}>
                          {t('Day {n}', { n: Math.round(total * m) })}
                        </Txt>
                      </View>
                    );
                  })}
                </View>
              </Card>
            );
          })}
        </>
      )}

      <SectionTitle>{t('Start a challenge')}</SectionTitle>
      {challenges.map((c, i) => {
        const tpl = templates.find((x) => x.key === c.templateKey)!;
        const th = getTheme(tpl.themeId);
        const running = activeIds.has(c.id);
        return (
          <Card key={c.id} delay={i * 30} style={{ padding: 0, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 110 }}>
                <HabitArt artId={tpl.artId} mode="thumb" />
              </View>
              <View style={{ flex: 1, padding: 14, gap: 6 }}>
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: hexToRgba(th.accent, 0.14) }}>
                  <Txt variant="micro" color={th.accent}>
                    {t('{n} days', { n: c.days })}
                  </Txt>
                </View>
                <Txt variant="h3">{t(c.title)}</Txt>
                <Txt variant="small" color="secondary" numberOfLines={3}>
                  {t(c.blurb)}
                </Txt>
                <PressableScale disabled={running} onPress={() => join(c.id)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                  <View style={{ paddingHorizontal: 16, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: th.accent }}>
                    <Txt variant="label" color="white">
                      {running ? t('In progress') : t('Join challenge')}
                    </Txt>
                  </View>
                </PressableScale>
              </View>
            </View>
          </Card>
        );
      })}

      {trophies.length > 0 && (
        <>
          <SectionTitle>{t('Trophies')}</SectionTitle>
          <Card style={{ gap: 12 }}>
            {trophies.map((tr) => {
              const d = new Date(tr.completedAt);
              return (
                <View key={`${tr.id}${tr.completedAt}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF1D6', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy size={20} color="#D49A00" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3">{t(tr.title)}</Txt>
                    <Txt variant="small" color="secondary">
                      {t('Completed {date}', { date: `${d.getDate()} ${MONTH_LABELS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` })}
                    </Txt>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}

      <Button label={t('Done')} variant="glass" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

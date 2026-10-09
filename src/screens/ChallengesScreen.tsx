import { useEffect, useMemo, useState } from 'react';
import { ToastAndroid, View } from 'react-native';

import { Screen, Card, SectionTitle } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { ChevronLeft } from '@/components/ui/icons';
import { Flag, Share2, Target, Trophy, Users } from '@/components/ui/lucide';
import { HabitArt } from '@/components/art/HabitArt';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { challengeProgress, challenges, habitForChallenge, parseChallengeCode, PASS_RATE, type Challenge } from '@/data/challenges';
import { shareChallengeCode, shareChallengeProgress } from '@/services/invite';
import { Field } from '@/components/ui/Field';
import { shiftKey } from '@/utils/date';
import { templates } from '@/data/templates';
import { getTheme } from '@/data/themes';
import { MONTH_LABELS } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

const MILESTONES = [0.25, 0.5, 0.75, 1];

export function ChallengesScreen({ navigation, route }: RootScreenProps<'Challenges'>) {
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

  const join = (id: string, friend = false) => {
    const c = challenges.find((x) => x.id === id)!;
    haptic.success();
    addHabit(habitForChallenge(c, today));
    if (friend) shareChallengeCode(c, today).catch(() => {});
    navigation.goBack();
  };

  // Friend codes ("RUN21-261012"): same challenge, same start day where possible.
  const [code, setCode] = useState(route.params?.code ?? '');
  const toast = (msg: string) => ToastAndroid.show(msg, ToastAndroid.SHORT);
  const joinCode = (input: string) => {
    const parsed = parseChallengeCode(input);
    if (!parsed) return toast(t('That code doesn’t look right — check it with your friend.'));
    const { challenge: c, startDay } = parsed;
    if (activeIds.has(c.id)) return toast(t('You’re already in this challenge.'));
    if (shiftKey(startDay, c.days - 1) < today) return toast(t('That challenge has already ended.'));
    haptic.success();
    // Join on the friend's start day, or today if they started earlier (past days are locked).
    addHabit(habitForChallenge(c, startDay > today ? startDay : today));
    toast(t('Joined “{challenge}” with your friend!', { challenge: t(c.title) }));
    navigation.goBack();
  };
  useEffect(() => {
    if (route.params?.code) joinCode(route.params.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const challengeOf = (id: string): Challenge | undefined => challenges.find((x) => x.id === id);

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
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Users size={20} color="#F5A623" strokeWidth={2} />
          <Txt variant="h3" style={{ flex: 1 }}>
            {t('Have a code from a friend?')}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field value={code} onChangeText={setCode} placeholder="RUN21-261012" autoCapitalize="characters" autoCorrect={false} onSubmitEditing={() => joinCode(code)} />
          </View>
          <PressableScale disabled={!code.trim()} onPress={() => joinCode(code)}>
            <View style={{ height: 48, paddingHorizontal: 18, borderRadius: 24, justifyContent: 'center', backgroundColor: '#F5A623' }}>
              <Txt variant="label" color="white">
                {t('Join')}
              </Txt>
            </View>
          </PressableScale>
        </View>
      </Card>

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
                {challengeOf(h.challenge!.id) && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <SmallButton
                      Icon={Users}
                      label={t('Invite a friend')}
                      color={c.accent}
                      onPress={() => shareChallengeCode(challengeOf(h.challenge!.id)!, h.challenge!.startDay).catch(() => {})}
                    />
                    <SmallButton
                      Icon={Share2}
                      label={t('Share progress')}
                      color={c.accent}
                      onPress={() => shareChallengeProgress(challengeOf(h.challenge!.id)!, h.challenge!.startDay, p.day, p.doneDays).catch(() => {})}
                    />
                  </View>
                )}
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
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  <PressableScale disabled={running} onPress={() => join(c.id)}>
                    <View style={{ paddingHorizontal: 16, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: th.accent }}>
                      <Txt variant="label" color="white">
                        {running ? t('In progress') : t('Join challenge')}
                      </Txt>
                    </View>
                  </PressableScale>
                  {!running && (
                    <PressableScale onPress={() => join(c.id, true)} accessibilityLabel={t('Join with a friend')}>
                      <View style={{ paddingHorizontal: 12, height: 36, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: hexToRgba(th.accent, 0.14) }}>
                        <Users size={15} color={th.accent} strokeWidth={2.2} />
                        <Txt variant="label" color={th.accent}>
                          {t('With a friend')}
                        </Txt>
                      </View>
                    </PressableScale>
                  )}
                </View>
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

function SmallButton({ Icon, label, color, onPress }: { Icon: typeof Users; label: string; color: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={{ flex: 1 }}>
      <View style={{ height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: hexToRgba(color, 0.14) }}>
        <Icon size={16} color={color} strokeWidth={2.2} />
        <Txt variant="label" color={color}>
          {label}
        </Txt>
      </View>
    </PressableScale>
  );
}

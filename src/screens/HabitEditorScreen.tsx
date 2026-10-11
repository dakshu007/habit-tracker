import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { Field } from '@/components/ui/Field';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { Card, SectionTitle, Toggle } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CheckIcon, CloseIcon, LockIcon, MinusIcon, PlusIcon, TrashIcon, ArchiveIcon } from '@/components/ui/icons';
import { HabitArt, artAspect } from '@/components/art/HabitArt';
import { GoalBadge } from '@/components/home/GoalBadge';
import { useHabitStore, useHabit } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { spacing } from '@/theme/tokens';
import { artList } from '@/data/art';
import { colorThemes, getTheme } from '@/data/themes';
import { blankHabit, habitFromTemplate, templates, UNIT_SUGGESTIONS } from '@/data/templates';
import { ensurePermission } from '@/services/notifications';
import { DAY_LETTERS, formatTime, weekdayOrder } from '@/utils/date';
import { fmtNumber } from '@/utils/format';
import { pickTime } from '@/utils/pickTime';
import { haptic } from '@/utils/haptics';
import type { Habit, HealthSource, Schedule, Weekday } from '@/data/types';
import type { RootScreenProps } from '@/navigation/types';
import { useEnter } from '@/theme/motion';
import { t } from '@/i18n';
import { AutoTrack } from '@/components/editor/AutoTrack';
import { PhoneSleep } from '@/components/editor/PhoneSleep';
import { connectHealth, healthStatus } from '@/services/health';
import { canAddHabit } from '@/store/useLicense';
import { isUnlocked, useUnlockedAchievements } from '@/logic/unlocks';
import { showLocked } from '@/components/profile/ProfileParts';
import { useUnlocked } from '@/store/useLicense';
import { ProLock } from '@/components/ui/ProLock';

type ScheduleKind = Schedule['kind'];

export function HabitEditorScreen({ navigation, route }: RootScreenProps<'HabitEditor'>) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const existing = useHabit(route.params?.id);
  const addHabit = useHabitStore((s) => s.addHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);
  const setArchived = useHabitStore((s) => s.setArchived);
  const weekStart = useHabitStore((s) => s.settings.weekStart);

  const enter = useEnter();
  const currency = useHabitStore((s) => s.settings.currency);
  const unlocked = useUnlockedAchievements();
  const isNew = !existing;
  const proOn = useUnlocked();

  // Free plan after the trial: 5 habits. Show the paywall before the user fills in a 6th.
  useEffect(() => {
    if (isNew && !canAddHabit(useHabitStore.getState().habits)) navigation.replace('Paywall');
  }, [isNew, navigation]);
  const [h, setH] = useState<Habit>(() => {
    if (existing) return existing;
    const t = templates.find((x) => x.key === route.params?.templateKey);
    return t ? habitFromTemplate(t) : blankHabit();
  });
  const [goalText, setGoalText] = useState(fmtNumber(h.goalValue).replace(/,/g, ''));
  const [customUnit, setCustomUnit] = useState(!UNIT_SUGGESTIONS.includes(h.unit));

  const colors = getTheme(h.themeId);
  const patch = (p: Partial<Habit>) => setH((cur) => ({ ...cur, ...p }));
  const goal = Number(goalText.replace(',', '.'));
  const valid = h.title.trim().length > 0 && Number.isFinite(goal) && goal > 0 && h.step > 0 && h.unit.trim().length > 0;

  // Last-used values per kind so switching back and forth doesn't lose choices.
  const [days, setDays] = useState<Weekday[]>(h.schedule.kind === 'days' ? h.schedule.days : [1, 3, 5]);
  const [perWeek, setPerWeek] = useState(h.schedule.kind === 'weekly' ? h.schedule.timesPerWeek : 3);
  const setKind = (k: ScheduleKind) => {
    haptic.tick();
    patch({ schedule: k === 'daily' ? { kind: 'daily' } : k === 'days' ? { kind: 'days', days } : { kind: 'weekly', timesPerWeek: perWeek } });
  };
  const toggleDay = (d: Weekday) => {
    haptic.tick();
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort();
    if (!next.length) return;
    setDays(next);
    patch({ schedule: { kind: 'days', days: next } });
  };
  const bumpPerWeek = (dir: number) => {
    const v = Math.min(7, Math.max(1, perWeek + dir));
    haptic.tick();
    setPerWeek(v);
    patch({ schedule: { kind: 'weekly', timesPerWeek: v } });
  };

  const save = async () => {
    if (!valid) {
      haptic.warning();
      return;
    }
    if (isNew && !canAddHabit(useHabitStore.getState().habits)) return navigation.navigate('Paywall');
    const final: Habit = { ...h, title: h.title.trim(), subtitle: h.subtitle.trim(), unit: h.unit.trim(), goalValue: goal };
    if (final.reminder.enabled) await ensurePermission();
    if (isNew) addHabit(final);
    else updateHabit(final);
    haptic.success();
    navigation.goBack();
  };

  const remove = () =>
    Alert.alert(t('Delete “{habit}”?', { habit: h.title }), t('Its whole history will be removed too. Archive it instead to keep your stats.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: () => {
          haptic.warning();
          navigation.popToTop();
          deleteHabit(h.id);
        },
      },
    ]);

  /** Templates like Walk or Running fill themselves from Health Connect — switch that on, asking once if needed. */
  const offerAutoTrack = async (src: HealthSource) => {
    const st = await healthStatus();
    if (st === 'ready') return setH((cur) => ({ ...cur, sync: src }));
    if (st !== 'needs-permission') return;
    Alert.alert(t('Track this automatically?'), t('Health Connect can fill this habit from your phone’s step counter, watch or fitness apps. No typing needed.'), [
      { text: t('Not now'), style: 'cancel' },
      {
        text: t('Turn on'),
        onPress: async () => {
          if (await connectHealth()) setH((cur) => ({ ...cur, sync: src }));
        },
      },
    ]);
  };

  // A template picked before opening (e.g. from onboarding or a challenge) gets the same offer.
  useEffect(() => {
    const tpl = isNew ? templates.find((x) => x.key === route.params?.templateKey) : undefined;
    if (tpl?.sync) offerAutoTrack(tpl.sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Defer the heavy lower sections until the open transition finishes.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = navigation.addListener('transitionEnd', () => setReady(true));
    const id = setTimeout(() => setReady(true), 450);
    return () => {
      unsub();
      clearTimeout(id);
    };
  }, [navigation]);

  const previewW = width - spacing.screenX * 2;
  const tile = 84;
  const ordered = useMemo(() => weekdayOrder(weekStart) as Weekday[], [weekStart]);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: theme.screenBase }}>
      {/* Top bar */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.screenX, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <GlassButton accessibilityLabel={t('Close')} onPress={() => navigation.goBack()} fill={theme.inputBg}>
          <CloseIcon size={20} color={theme.textPrimary} />
        </GlassButton>
        <Txt variant="h2" style={{ flex: 1, textAlign: 'center' }}>
          {isNew ? t('New habit') : t('Edit habit')}
        </Txt>
        <PressableScale onPress={save} disabled={!valid} accessibilityLabel={t('Save habit')}>
          <View style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CheckIcon size={16} color="#FFFFFF" strokeWidth={3} />
            <Txt variant="button" color="white">
              {t('Save')}
            </Txt>
          </View>
        </PressableScale>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingBottom: insets.bottom + 40, gap: 16 }}
      >
        {/* Live preview — the whole illustration, details underneath */}
        <Animated.View
          entering={enter(0)}
          style={{ width: previewW, borderRadius: 32, overflow: 'hidden', backgroundColor: theme.cardElevated, boxShadow: '0px 14px 30px rgba(0,0,0,0.12)' }}
        >
          <Animated.View key={h.artId} entering={FadeIn.duration(300)} style={{ width: previewW, height: Math.round(previewW / artAspect(h.artId)) }}>
            <HabitArt artId={h.artId} mode="full" />
          </Animated.View>
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="cardTitle" numberOfLines={1}>
                {h.title.trim() || t('Your habit')}
              </Txt>
              <Txt variant="cardSubtitle" color="secondary" numberOfLines={1}>
                {h.subtitle.trim() || t('Why it matters to you')}
              </Txt>
            </View>
            <GoalBadge colors={colors} goal={goal > 0 ? goal : 0} unit={h.unit || '-'} />
          </View>
        </Animated.View>

        {/* Templates */}
        {isNew && (
          <>
            <SectionTitle>{t('Start from a template')}</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.screenX }} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.screenX }}>
              {templates.map((tpl) => {
                const c = getTheme(tpl.themeId);
                return (
                  <PressableScale
                    key={tpl.key}
                    onPress={() => {
                      haptic.tick();
                      const next = { ...habitFromTemplate(tpl), id: h.id, reminder: h.reminder };
                      setH(next);
                      setGoalText(fmtNumber(tpl.goalValue).replace(/,/g, ''));
                      setCustomUnit(!UNIT_SUGGESTIONS.includes(tpl.unit));
                      if (tpl.schedule.kind === 'days') setDays(tpl.schedule.days);
                      if (tpl.schedule.kind === 'weekly') setPerWeek(tpl.schedule.timesPerWeek);
                      if (tpl.sync) offerAutoTrack(tpl.sync);
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingLeft: 5,
                        paddingRight: 14,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: hexToRgba(c.accent, isDark ? 0.22 : 0.1),
                      }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden' }}>
                        <HabitArt artId={tpl.artId} colors={c} compact />
                      </View>
                      <Txt variant="label" color={isDark ? 'primary' : c.accent}>
                        {t(tpl.title)}
                      </Txt>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </>
        )}

        <SectionTitle>{t('Habit type')}</SectionTitle>
        <SegmentedControl<'build' | 'quit'>
          options={[
            { key: 'build', label: t('Build a habit') },
            { key: 'quit', label: t('Quit a habit') },
          ]}
          value={h.quit ? 'quit' : 'build'}
          onChange={(k) => {
            haptic.tick();
            if (k === 'quit' && !h.quit) {
              setGoalText('1');
              setCustomUnit(true);
              setH((cur) => ({
                ...cur,
                quit: { costPerDay: 0, currency, slips: [] },
                unit: 'day',
                goalValue: 1,
                step: 1,
                sync: undefined,
                schedule: { kind: 'daily' },
                doneLabel: t('Clean day logged. Proud of you.'),
              }));
            } else if (k === 'build' && h.quit) {
              setGoalText('1');
              setCustomUnit(false);
              setH((cur) => ({ ...cur, quit: undefined, unit: 'times', goalValue: 1, step: 1, doneLabel: t('Done! Nicely done.') }));
            }
          }}
        />

        <Card style={{ gap: 14 }}>
          <Field label={t('Name')} value={h.title} onChangeText={(title) => patch({ title })} placeholder={t('e.g. Morning run')} maxLength={28} />
          <Field label={t('Why it matters')} value={h.subtitle} onChangeText={(subtitle) => patch({ subtitle })} placeholder={t('e.g. Clears my head')} maxLength={44} />
        </Card>

        {/* Everything below the fold mounts once the screen has slid in, so opening feels instant. */}
        {ready ? (
          <>
        <SectionTitle>{t('Artwork')}</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.screenX }} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.screenX }}>
          {artList.map((a) => {
            const on = a.id === h.artId;
            return (
              <PressableScale key={a.id} onPress={() => (haptic.tick(), patch({ artId: a.id }))} silent accessibilityLabel={a.name}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <View style={{ padding: 3, borderRadius: 22, borderWidth: 2.5, borderColor: on ? colors.accent : 'transparent' }}>
                    <View style={{ width: tile, height: tile, borderRadius: 20, overflow: 'hidden' }}>
                      <HabitArt artId={a.id} mode="thumb" />
                    </View>
                  </View>
                  <Txt variant="small" color={on ? 'primary' : 'secondary'}>
                    {t(a.name)}
                  </Txt>
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>

        <SectionTitle>{t('Color')}</SectionTitle>
        <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
          {colorThemes.map((c) => {
            const on = c.id === h.themeId;
            const locked = !isUnlocked(c.unlock, unlocked);
            return (
              <PressableScale
                key={c.id}
                onPress={() => {
                  if (locked) return showLocked(c.name, unlocked.get(c.unlock!));
                  haptic.tick();
                  patch({ themeId: c.id });
                }}
                silent
                accessibilityLabel={locked ? t('{name} (locked)', { name: c.name }) : c.name}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: locked ? 0.35 : 1 }}>
                    {on && <CheckIcon size={16} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  {locked && (
                    <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                      <LockIcon size={15} color={theme.textPrimary} strokeWidth={2.4} />
                    </View>
                  )}
                </View>
              </PressableScale>
            );
          })}
        </Card>

        {h.quit ? (
          <>
            <SectionTitle>{t('Money saved per clean day')}</SectionTitle>
            <Card style={{ gap: 10 }}>
              <Field
                large
                keyboardType="decimal-pad"
                value={h.quit.costPerDay ? String(h.quit.costPerDay) : ''}
                onChangeText={(v) => {
                  const n = Number(v.replace(',', '.'));
                  setH((cur) => (cur.quit ? { ...cur, quit: { ...cur.quit, costPerDay: Number.isFinite(n) ? n : 0 } } : cur));
                }}
                placeholder={`${currency}0`}
              />
              <Txt variant="small" color="secondary">
                {t('What the habit costs you each day (cigarettes, snacks…). Leave empty to track days only.')}
              </Txt>
            </Card>
          </>
        ) : (
          <>
        <SectionTitle>{t('Daily goal')}</SectionTitle>
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field label={t('Amount')} large keyboardType="decimal-pad" value={goalText} onChangeText={setGoalText} placeholder="1" />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t('Unit')}
                large
                value={h.unit}
                editable={customUnit}
                onChangeText={(unit) => patch({ unit })}
                placeholder={t('unit')}
                maxLength={12}
                style={{ opacity: customUnit ? 1 : 0.8 }}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {UNIT_SUGGESTIONS.map((u) => (
              <MiniChip
                key={u}
                label={t(u)}
                active={!customUnit && h.unit === u}
                color={colors.accent}
                onPress={() => {
                  setCustomUnit(false);
                  patch({ unit: u, step: u === 'steps' ? 500 : u === 'min' ? 5 : h.step });
                }}
              />
            ))}
            <MiniChip label={t('custom…')} active={customUnit} color={colors.accent} onPress={() => setCustomUnit(true)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Txt variant="h3">{t('Each + tap adds')}</Txt>
              <Txt variant="small" color="secondary">
                {t('Quick-log step on the Home screen')}
              </Txt>
            </View>
            <Stepper
              value={`${fmtNumber(h.step)}`}
              onMinus={() => patch({ step: Math.max(stepUnit(h.step), Math.round((h.step - stepUnit(h.step)) * 10) / 10) })}
              onPlus={() => patch({ step: Math.round((h.step + stepUnit(h.step + 0.01)) * 10) / 10 })}
            />
          </View>
        </Card>

        <SectionTitle>{t('Schedule')}</SectionTitle>
        <Card style={{ gap: 16 }}>
          <SegmentedControl<ScheduleKind>
            options={[
              { key: 'daily', label: t('Every day') },
              { key: 'days', label: t('Some days') },
              { key: 'weekly', label: t('Weekly') },
            ]}
            value={h.schedule.kind}
            onChange={setKind}
          />
          {h.schedule.kind === 'days' && (
            <Animated.View entering={FadeIn} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {ordered.map((d) => {
                const on = days.includes(d);
                return (
                  <PressableScale key={d} onPress={() => toggleDay(d)} silent accessibilityLabel={`Toggle ${DAY_LETTERS[d]}`}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : theme.inputBg }}>
                      <Txt variant="label" color={on ? 'white' : 'secondary'}>
                        {DAY_LETTERS[d]}
                      </Txt>
                    </View>
                  </PressableScale>
                );
              })}
            </Animated.View>
          )}
          {h.schedule.kind === 'weekly' && (
            <Animated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{t('Times per week')}</Txt>
                <Txt variant="small" color="secondary">
                  {t('Any days you like. Shows under “Weekly tasks”')}
                </Txt>
              </View>
              <Stepper value={`${perWeek}×`} onMinus={() => bumpPerWeek(-1)} onPlus={() => bumpPerWeek(1)} />
            </Animated.View>
          )}
          {h.schedule.kind === 'daily' && (
            <Txt variant="small" color="secondary">
              {t('Shows every day under “Today’s tasks”.')}
            </Txt>
          )}
        </Card>

          {proOn ? (
            <>
              <AutoTrack h={h} onChange={(sync, unit) => {
                setH((cur) => ({ ...cur, sync, unit: unit ?? cur.unit }));
                if (unit) setCustomUnit(!UNIT_SUGGESTIONS.includes(unit));
              }} />
              <PhoneSleep h={h} onChange={(phoneSleep) => setH((cur) => ({ ...cur, phoneSleep, sync: phoneSleep ? undefined : cur.sync }))} />
            </>
          ) : (
            <ProLock title={t('Auto-tracking')} body={t('Fill this habit from steps, workouts and sleep automatically, with no typing.')} />
          )}
          </>
        )}

        <SectionTitle>{t('Reminder')}</SectionTitle>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{t('Remind me')}</Txt>
            <Txt variant="small" color="secondary">
              {h.reminder.enabled ? t('At {time} on scheduled days', { time: formatTime(h.reminder.hour, h.reminder.minute) }) : t('Off')}
            </Txt>
          </View>
          {h.reminder.enabled && (
            <PressableScale
              onPress={async () => {
                const t = await pickTime(h.reminder.hour, h.reminder.minute);
                if (t) patch({ reminder: { enabled: true, ...t } });
              }}
            >
              <View style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: theme.inputBg, justifyContent: 'center' }}>
                <Txt variant="label">{formatTime(h.reminder.hour, h.reminder.minute)}</Txt>
              </View>
            </PressableScale>
          )}
          <Toggle value={h.reminder.enabled} color={colors.accent} onChange={(enabled) => patch({ reminder: { ...h.reminder, enabled } })} />
        </Card>

        <SectionTitle>{t('Celebration message')}</SectionTitle>
        <Card>
          <Field value={h.doneLabel} onChangeText={(doneLabel) => patch({ doneLabel })} placeholder={t('Done! Nicely done.')} maxLength={32} />
        </Card>

        {!isNew && (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button
              variant="glass"
              label={h.archived ? t('Unarchive habit') : t('Archive habit')}
              icon={<ArchiveIcon size={18} color={theme.textPrimary} />}
              onPress={() => {
                setArchived(h.id, !h.archived);
                haptic.medium();
                navigation.goBack();
              }}
            />
            <Button variant="ghost" color={theme.danger} label={t('Delete habit')} icon={<TrashIcon size={18} color={theme.danger} />} onPress={remove} />
          </View>
        )}
          </>
        ) : (
          <View style={{ height: 600 }} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Step granularity for the quick-log step stepper. */
function stepUnit(v: number) {
  if (v < 1) return 0.1;
  if (v < 10) return 1;
  if (v < 100) return 5;
  return 100;
}

function MiniChip({ label, active, color, onPress }: { label: string; active: boolean; color: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <PressableScale onPress={() => (haptic.tick(), onPress())} silent>
      <View style={{ paddingHorizontal: 13, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: active ? color : theme.inputBg }}>
        <Txt variant="label" color={active ? 'white' : 'secondaryStrong'}>
          {label}
        </Txt>
      </View>
    </PressableScale>
  );
}

function Stepper({ value, onMinus, onPlus }: { value: string; onMinus: () => void; onPlus: () => void }) {
  const { theme } = useTheme();
  const btn = { width: 36, height: 36, borderRadius: 18, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: theme.cardElevated };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4, borderRadius: 24, backgroundColor: theme.inputBg }}>
      <PressableScale onPress={() => (haptic.tick(), onMinus())} silent accessibilityLabel={t('Decrease')} style={btn}>
        <MinusIcon size={16} color={theme.textPrimary} strokeWidth={2.4} />
      </PressableScale>
      <Txt variant="statSmall" style={{ minWidth: 40, textAlign: 'center' }}>
        {value}
      </Txt>
      <PressableScale onPress={() => (haptic.tick(), onPlus())} silent accessibilityLabel={t('Increase')} style={btn}>
        <PlusIcon size={16} color={theme.textPrimary} strokeWidth={2.4} />
      </PressableScale>
    </View>
  );
}

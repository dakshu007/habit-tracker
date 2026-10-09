import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Txt } from '@/components/ui/Txt';
import { Field } from '@/components/ui/Field';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { Card, SectionTitle, Toggle } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CheckIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon, ArchiveIcon } from '@/components/ui/icons';
import { HabitArt } from '@/components/art/HabitArt';
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
import type { Habit, Schedule, Weekday } from '@/data/types';
import type { RootScreenProps } from '@/navigation/types';
import { useEnter } from '@/theme/motion';

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
  const isNew = !existing;
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
    const final: Habit = { ...h, title: h.title.trim(), subtitle: h.subtitle.trim(), unit: h.unit.trim(), goalValue: goal };
    if (final.reminder.enabled) await ensurePermission();
    if (isNew) addHabit(final);
    else updateHabit(final);
    haptic.success();
    navigation.goBack();
  };

  const remove = () =>
    Alert.alert(`Delete “${h.title}”?`, 'Its whole history will be removed too. Archive it instead to keep your stats.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          haptic.warning();
          navigation.popToTop();
          deleteHabit(h.id);
        },
      },
    ]);

  const previewW = width - spacing.screenX * 2;
  const tile = 64;
  const ordered = useMemo(() => weekdayOrder(weekStart) as Weekday[], [weekStart]);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: theme.screenBase }}>
      {/* Top bar */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.screenX, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <GlassButton accessibilityLabel="Close" onPress={() => navigation.goBack()} fill={theme.inputBg}>
          <CloseIcon size={20} color={theme.textPrimary} />
        </GlassButton>
        <Txt variant="h2" style={{ flex: 1, textAlign: 'center' }}>
          {isNew ? 'New habit' : 'Edit habit'}
        </Txt>
        <PressableScale onPress={save} disabled={!valid} accessibilityLabel="Save habit">
          <View style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CheckIcon size={16} color="#FFFFFF" strokeWidth={3} />
            <Txt variant="button" color="white">
              Save
            </Txt>
          </View>
        </PressableScale>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingBottom: insets.bottom + 40, gap: 16 }}
      >
        {/* Live preview */}
        <Animated.View
          entering={enter(0)}
          style={{ width: previewW, height: 250, borderRadius: 32, overflow: 'hidden', backgroundColor: colors.cardTint, boxShadow: '0px 14px 30px rgba(0,0,0,0.12)' }}
        >
          <Animated.View key={`${h.artId}${h.themeId}`} entering={FadeIn.duration(300)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <HabitArt artId={h.artId} colors={colors} />
          </Animated.View>
          <View
            style={{
              position: 'absolute',
              left: 8,
              right: 8,
              bottom: 8,
              padding: 14,
              borderRadius: 24,
              backgroundColor: theme.cardElevated,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="cardTitle" numberOfLines={1}>
                {h.title.trim() || 'Your habit'}
              </Txt>
              <Txt variant="cardSubtitle" color="secondary" numberOfLines={1}>
                {h.subtitle.trim() || 'Why it matters to you'}
              </Txt>
            </View>
            <GoalBadge colors={colors} goal={goal > 0 ? goal : 0} unit={h.unit || '—'} />
          </View>
        </Animated.View>

        {/* Templates */}
        {isNew && (
          <>
            <SectionTitle>Start from a template</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.screenX }} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.screenX }}>
              {templates.map((t) => {
                const c = getTheme(t.themeId);
                return (
                  <PressableScale
                    key={t.key}
                    onPress={() => {
                      haptic.tick();
                      const next = { ...habitFromTemplate(t), id: h.id, reminder: h.reminder };
                      setH(next);
                      setGoalText(fmtNumber(t.goalValue).replace(/,/g, ''));
                      setCustomUnit(!UNIT_SUGGESTIONS.includes(t.unit));
                      if (t.schedule.kind === 'days') setDays(t.schedule.days);
                      if (t.schedule.kind === 'weekly') setPerWeek(t.schedule.timesPerWeek);
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
                        <HabitArt artId={t.artId} colors={c} compact />
                      </View>
                      <Txt variant="label" color={isDark ? 'primary' : c.accent}>
                        {t.title}
                      </Txt>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </>
        )}

        <Card style={{ gap: 14 }}>
          <Field label="Name" value={h.title} onChangeText={(title) => patch({ title })} placeholder="e.g. Morning run" maxLength={28} />
          <Field label="Why it matters" value={h.subtitle} onChangeText={(subtitle) => patch({ subtitle })} placeholder="e.g. Clears my head" maxLength={44} />
        </Card>

        <SectionTitle>Artwork</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.screenX }} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.screenX }}>
          {artList.map((a) => {
            const on = a.id === h.artId;
            return (
              <PressableScale key={a.id} onPress={() => (haptic.tick(), patch({ artId: a.id }))} silent accessibilityLabel={a.name}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <View style={{ padding: 3, borderRadius: 22, borderWidth: 2.5, borderColor: on ? colors.accent : 'transparent' }}>
                    <View style={{ width: tile, height: tile, borderRadius: 17, overflow: 'hidden' }}>
                      <HabitArt artId={a.id} colors={colors} compact />
                    </View>
                  </View>
                  <Txt variant="small" color={on ? 'primary' : 'secondary'}>
                    {a.name}
                  </Txt>
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>

        <SectionTitle>Color</SectionTitle>
        <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
          {colorThemes.map((c) => {
            const on = c.id === h.themeId;
            return (
              <PressableScale key={c.id} onPress={() => (haptic.tick(), patch({ themeId: c.id }))} silent accessibilityLabel={c.name}>
                <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                    {on && <CheckIcon size={16} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </View>
              </PressableScale>
            );
          })}
        </Card>

        <SectionTitle>Daily goal</SectionTitle>
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field label="Amount" large keyboardType="decimal-pad" value={goalText} onChangeText={setGoalText} placeholder="1" />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Unit"
                large
                value={h.unit}
                editable={customUnit}
                onChangeText={(unit) => patch({ unit })}
                placeholder="unit"
                maxLength={12}
                style={{ opacity: customUnit ? 1 : 0.8 }}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {UNIT_SUGGESTIONS.map((u) => (
              <MiniChip
                key={u}
                label={u}
                active={!customUnit && h.unit === u}
                color={colors.accent}
                onPress={() => {
                  setCustomUnit(false);
                  patch({ unit: u, step: u === 'steps' ? 500 : u === 'min' ? 5 : h.step });
                }}
              />
            ))}
            <MiniChip label="custom…" active={customUnit} color={colors.accent} onPress={() => setCustomUnit(true)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Txt variant="h3">Each + tap adds</Txt>
              <Txt variant="small" color="secondary">
                Quick-log step on the Home screen
              </Txt>
            </View>
            <Stepper
              value={`${fmtNumber(h.step)}`}
              onMinus={() => patch({ step: Math.max(stepUnit(h.step), Math.round((h.step - stepUnit(h.step)) * 10) / 10) })}
              onPlus={() => patch({ step: Math.round((h.step + stepUnit(h.step + 0.01)) * 10) / 10 })}
            />
          </View>
        </Card>

        <SectionTitle>Schedule</SectionTitle>
        <Card style={{ gap: 16 }}>
          <SegmentedControl<ScheduleKind>
            options={[
              { key: 'daily', label: 'Every day' },
              { key: 'days', label: 'Some days' },
              { key: 'weekly', label: 'Weekly' },
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
                <Txt variant="h3">Times per week</Txt>
                <Txt variant="small" color="secondary">
                  Any days you like — shows under “Weekly tasks”
                </Txt>
              </View>
              <Stepper value={`${perWeek}×`} onMinus={() => bumpPerWeek(-1)} onPlus={() => bumpPerWeek(1)} />
            </Animated.View>
          )}
          {h.schedule.kind === 'daily' && (
            <Txt variant="small" color="secondary">
              Shows every day under “Today’s tasks”.
            </Txt>
          )}
        </Card>

        <SectionTitle>Reminder</SectionTitle>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Remind me</Txt>
            <Txt variant="small" color="secondary">
              {h.reminder.enabled ? `At ${formatTime(h.reminder.hour, h.reminder.minute)} on scheduled days` : 'Off'}
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

        <SectionTitle>Celebration message</SectionTitle>
        <Card>
          <Field value={h.doneLabel} onChangeText={(doneLabel) => patch({ doneLabel })} placeholder="Done! Nicely done." maxLength={32} />
        </Card>

        {!isNew && (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button
              variant="glass"
              label={h.archived ? 'Unarchive habit' : 'Archive habit'}
              icon={<ArchiveIcon size={18} color={theme.textPrimary} />}
              onPress={() => {
                setArchived(h.id, !h.archived);
                haptic.medium();
                navigation.goBack();
              }}
            />
            <Button variant="ghost" color={theme.danger} label="Delete habit" icon={<TrashIcon size={18} color={theme.danger} />} onPress={remove} />
          </View>
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
      <PressableScale onPress={() => (haptic.tick(), onMinus())} silent accessibilityLabel="Decrease" style={btn}>
        <MinusIcon size={16} color={theme.textPrimary} strokeWidth={2.4} />
      </PressableScale>
      <Txt variant="statSmall" style={{ minWidth: 40, textAlign: 'center' }}>
        {value}
      </Txt>
      <PressableScale onPress={() => (haptic.tick(), onPlus())} silent accessibilityLabel="Increase" style={btn}>
        <PlusIcon size={16} color={theme.textPrimary} strokeWidth={2.4} />
      </PressableScale>
    </View>
  );
}

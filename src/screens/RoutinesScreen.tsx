import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { Screen, Card, SectionTitle } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Field } from '@/components/ui/Field';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { CheckIcon, ChevronDown, ChevronLeft, EditIcon, TrashIcon } from '@/components/ui/icons';
import { Play, Route } from '@/components/ui/lucide';
import { HabitArt } from '@/components/art/HabitArt';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { newHabitId } from '@/data/templates';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

const ACCENT = '#4C8DF6';

/** All routines, with play / edit. */
export function RoutinesScreen({ navigation }: RootScreenProps<'Routines'>) {
  const { theme } = useTheme();
  const routines = useHabitStore((s) => s.extras.routines);
  const habits = useHabitStore((s) => s.habits);
  const byId = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  return (
    <Screen
      title={t('Routines')}
      subtitle={t('Chain habits together and play them one by one.')}
      accent={ACCENT}
      tabBar={false}
      left={
        <GlassButton accessibilityLabel={t('Back')} fill={theme.inputBg} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={theme.textPrimary} strokeWidth={2.4} />
        </GlassButton>
      }
    >
      {routines.length === 0 && (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
          <Route size={40} color={ACCENT} strokeWidth={1.6} />
          <Txt variant="h3">{t('No routines yet')}</Txt>
          <Txt variant="small" color="secondary" style={{ textAlign: 'center' }}>
            {t('Try a "Morning routine": water, stretch, journal — then play it each morning.')}
          </Txt>
        </Card>
      )}

      {routines.map((r, i) => {
        const items = r.habitIds.map((id) => byId.get(id)).filter((h) => h && !h.archived);
        return (
          <Card key={r.id} delay={i * 40} style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Txt variant="h2">{r.name}</Txt>
                <Txt variant="small" color="secondary">
                  {t('{n} habits', { n: items.length })}
                </Txt>
              </View>
              <PressableScale accessibilityLabel={t('Edit routine')} onPress={() => navigation.navigate('RoutineEdit', { id: r.id })}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                  <EditIcon size={18} color={theme.textPrimary} />
                </View>
              </PressableScale>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {items.slice(0, 6).map((h) => (
                <View key={h!.id} style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden' }}>
                  <HabitArt artId={h!.artId} mode="thumb" />
                </View>
              ))}
            </View>
            <Button
              label={t('Play routine')}
              color={ACCENT}
              icon={<Play size={18} color="#FFFFFF" fill="#FFFFFF" />}
              disabled={!items.length}
              onPress={() => navigation.navigate('RoutinePlay', { id: r.id })}
            />
          </Card>
        );
      })}

      <Button label={t('New routine')} variant="glass" onPress={() => navigation.navigate('RoutineEdit')} />
    </Screen>
  );
}

/** Create or edit a routine: name + ordered habits. */
export function RoutineEditScreen({ navigation, route }: RootScreenProps<'RoutineEdit'>) {
  const { theme } = useTheme();
  const habits = useHabitStore((s) => s.habits);
  const existing = useHabitStore((s) => s.extras.routines.find((r) => r.id === route.params?.id));
  const saveRoutine = useHabitStore((s) => s.saveRoutine);
  const deleteRoutine = useHabitStore((s) => s.deleteRoutine);

  const [name, setName] = useState(existing?.name ?? t('Morning routine'));
  const [ids, setIds] = useState<string[]>(existing?.habitIds ?? []);
  const live = habits.filter((h) => !h.archived);
  const chosen = ids.map((id) => live.find((h) => h.id === id)).filter(Boolean) as typeof live;
  const others = live.filter((h) => !ids.includes(h.id));

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    haptic.tick();
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    setIds(next);
  };

  const save = () => {
    if (!name.trim() || !ids.length) return;
    saveRoutine({ id: existing?.id ?? newHabitId(), name: name.trim(), habitIds: ids });
    haptic.success();
    navigation.goBack();
  };

  const row = (h: (typeof live)[number], on: boolean, i: number) => (
    <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <PressableScale
        silent
        onPress={() => {
          haptic.tick();
          setIds((cur) => (on ? cur.filter((x) => x !== h.id) : [...cur, h.id]));
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: on ? ACCENT : 'transparent',
            borderWidth: on ? 0 : 2,
            borderColor: theme.progressTrack,
          }}
        >
          {on && <CheckIcon size={14} color="#FFFFFF" strokeWidth={3} />}
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden' }}>
          <HabitArt artId={h.artId} mode="thumb" />
        </View>
        <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>
          {on ? `${i + 1}. ` : ''}
          {h.title}
        </Txt>
      </PressableScale>
      {on && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[-1, 1].map((d) => (
            <PressableScale key={d} silent onPress={() => move(i, d as -1 | 1)} accessibilityLabel={d < 0 ? t('Move up') : t('Move down')}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: d < 0 ? '180deg' : '0deg' }] }}>
                <ChevronDown size={15} color={theme.textPrimary} strokeWidth={2.4} />
              </View>
            </PressableScale>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Screen
      title={existing ? t('Edit routine') : t('New routine')}
      accent={ACCENT}
      tabBar={false}
      left={
        <GlassButton accessibilityLabel={t('Back')} fill={theme.inputBg} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={theme.textPrimary} strokeWidth={2.4} />
        </GlassButton>
      }
    >
      <Card>
        <Field label={t('Name')} value={name} onChangeText={setName} maxLength={30} />
      </Card>
      <SectionTitle>{t('In this routine (in order)')}</SectionTitle>
      <Card style={{ paddingVertical: 6 }}>
        {chosen.length ? (
          chosen.map((h, i) => row(h, true, i))
        ) : (
          <Txt variant="small" color="secondary" style={{ paddingVertical: 12 }}>
            {t('Tap habits below to add them.')}
          </Txt>
        )}
      </Card>
      {others.length > 0 && (
        <>
          <SectionTitle>{t('Add habits')}</SectionTitle>
          <Card style={{ paddingVertical: 6 }}>{others.map((h) => row(h, false, -1))}</Card>
        </>
      )}
      <Button label={t('Save routine')} color={ACCENT} onPress={save} disabled={!name.trim() || !ids.length} />
      {existing && (
        <Button
          label={t('Delete routine')}
          variant="ghost"
          color={theme.danger}
          icon={<TrashIcon size={17} color={theme.danger} />}
          onPress={() =>
            Alert.alert(t('Delete this routine?'), t('Your habits stay — only the routine is removed.'), [
              { text: t('Cancel'), style: 'cancel' },
              {
                text: t('Delete'),
                style: 'destructive',
                onPress: () => {
                  deleteRoutine(existing.id);
                  navigation.goBack();
                },
              },
            ])
          }
        />
      )}
    </Screen>
  );
}

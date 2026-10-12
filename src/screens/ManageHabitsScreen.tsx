import { View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Screen, Card, SectionTitle } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { ArchiveIcon, ChevronDown, ChevronLeft, PlusIcon } from '@/components/ui/icons';
import { HabitArt } from '@/components/art/HabitArt';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { getTheme } from '@/data/themes';
import { haptic } from '@/utils/haptics';
import type { Habit } from '@/data/types';
import type { RootScreenProps } from '@/navigation/types';
import { t } from '@/i18n';

export function ManageHabitsScreen({ navigation }: RootScreenProps<'ManageHabits'>) {
  const { theme } = useTheme();
  const habits = useHabitStore((s) => s.habits);
  const moveHabit = useHabitStore((s) => s.moveHabit);
  const setArchived = useHabitStore((s) => s.setArchived);

  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);

  const row = (h: Habit, i: number, list: Habit[]) => {
    const c = getTheme(h.themeId);
    return (
      <Animated.View
        key={h.id}
        layout={LinearTransition.springify().damping(18)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 10,
          borderBottomWidth: i === list.length - 1 ? 0 : 1,
          borderBottomColor: theme.hairline,
        }}
      >
        <PressableScale style={{ flex: 1 }} scaleTo={0.98} onPress={() => navigation.navigate('HabitEditor', { id: h.id })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 15, overflow: 'hidden', opacity: h.archived ? 0.5 : 1 }}>
              <HabitArt artId={h.artId} colors={c} compact />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="h3" numberOfLines={1} color={h.archived ? 'secondary' : 'primary'}>
                {h.title}
              </Txt>
              <Txt variant="small" color="secondary">
                {t('Tap to edit')}
              </Txt>
            </View>
          </View>
        </PressableScale>
        {h.archived ? (
          <PressableScale
            onPress={() => {
              haptic.medium();
              setArchived(h.id, false);
            }}
          >
            <View style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: theme.inputBg }}>
              <Txt variant="label">{t('Restore')}</Txt>
            </View>
          </PressableScale>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <MoveBtn disabled={i === 0} up onPress={() => moveHabit(h.id, -1)} />
            <MoveBtn disabled={i === list.length - 1} onPress={() => moveHabit(h.id, 1)} />
            <PressableScale
              accessibilityLabel={t('Archive {habit}', { habit: h.title })}
              onPress={() => {
                haptic.medium();
                setArchived(h.id, true);
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.inputBg }}>
                <ArchiveIcon size={16} color={theme.textSecondary} />
              </View>
            </PressableScale>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <Screen
      title={t('Your habits')}
      subtitle={t('Reorder, archive or edit.')}
      accent="#5E86A4"
      tabBar={false}
      left={
        <GlassButton accessibilityLabel={t('Back')} fill={theme.inputBg} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={theme.textPrimary} strokeWidth={2.4} />
        </GlassButton>
      }
    >
      <Card style={{ paddingVertical: 4 }}>
        {active.length ? (
          active.map((h, i) => row(h, i, active))
        ) : (
          <Txt variant="bodyRegular" color="secondary" style={{ paddingVertical: 16, textAlign: 'center' }}>
            {t('No active habits.')}
          </Txt>
        )}
      </Card>
      <Button label={t('New habit')} icon={<PlusIcon size={18} color={theme.mode === 'dark' ? '#1C1B22' : '#FFFFFF'} />} onPress={() => navigation.navigate('HabitEditor')} />

      {archived.length > 0 && (
        <>
          <SectionTitle>{t('Archived')}</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>{archived.map((h, i) => row(h, i, archived))}</Card>
        </>
      )}
    </Screen>
  );
}

function MoveBtn({ up, disabled, onPress }: { up?: boolean; disabled?: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <PressableScale disabled={disabled} accessibilityLabel={up ? t('Move up') : t('Move down')} onPress={() => (haptic.tick(), onPress())} silent>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.inputBg,
          transform: [{ rotate: up ? '180deg' : '0deg' }],
        }}
      >
        <ChevronDown size={16} color={theme.textPrimary} strokeWidth={2.4} />
      </View>
    </PressableScale>
  );
}

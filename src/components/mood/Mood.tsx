import { useState } from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { Field } from '@/components/ui/Field';
import { Button, PressableScale } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { FaceGrinning, FaceNeutral, FaceSlightlyFrowning, FaceSlightlySmiling, type LucideIcon } from '@/components/ui/lucide';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { t } from '@/i18n';
import { haptic } from '@/utils/haptics';
import type { Habit } from '@/data/types';

export type MoodValue = 1 | 2 | 3 | 4;

export const MOODS: { value: MoodValue; label: string; Icon: LucideIcon; color: string }[] = [
  { value: 1, label: 'Low', Icon: FaceSlightlyFrowning, color: '#7D8BFF' },
  { value: 2, label: 'Okay', Icon: FaceNeutral, color: '#8A8F98' },
  { value: 3, label: 'Good', Icon: FaceSlightlySmiling, color: '#34C7A0' },
  { value: 4, label: 'Great', Icon: FaceGrinning, color: '#F5A623' },
];

export function moodMeta(v: number | undefined) {
  return MOODS.find((m) => m.value === v);
}

/** Small colored face for lists. */
export function MoodDot({ value, size = 18 }: { value?: number; size?: number }) {
  const m = moodMeta(value);
  if (!m) return null;
  return <m.Icon size={size} color={m.color} strokeWidth={2} />;
}

/** "How do you feel?" — shown right after a habit is completed. */
export function MoodSheet({ habit, day }: { habit: Habit; day: string }) {
  const { theme } = useTheme();
  const setMood = useHabitStore((s) => s.setMood);
  const [mood, setMoodLocal] = useState<MoodValue | null>(null);
  const [note, setNote] = useState('');

  const save = () => {
    if (mood) setMood(habit.id, day, mood, note);
    overlay.close();
  };

  return (
    <View style={{ padding: 22, gap: 18 }}>
      <View style={{ gap: 4 }}>
        <Txt variant="h2">{t('How do you feel?')}</Txt>
        <Txt variant="small" color="secondary">
          {t('{habit} is done. A quick check-in helps you spot what lifts your mood.', { habit: habit.title })}
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {MOODS.map((m) => {
          const on = mood === m.value;
          return (
            <PressableScale
              key={m.value}
              silent
              accessibilityLabel={t(m.label)}
              onPress={() => {
                haptic.tick();
                setMoodLocal(m.value);
              }}
              style={{ alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? hexToRgba(m.color, 0.18) : theme.inputBg,
                  borderWidth: 2,
                  borderColor: on ? m.color : 'transparent',
                }}
              >
                <m.Icon size={32} color={on ? m.color : theme.textSecondary} strokeWidth={1.8} />
              </View>
              <Txt variant="label" color={on ? m.color : 'secondary'}>
                {t(m.label)}
              </Txt>
            </PressableScale>
          );
        })}
      </View>

      <Field value={note} onChangeText={setNote} placeholder={t('Add a note (optional)')} maxLength={120} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label={t('Skip')} variant="glass" onPress={overlay.close} style={{ flex: 1 }} />
        <Button label={t('Save')} onPress={save} disabled={!mood} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

/** Opens the mood sheet if the user has check-ins turned on. */
export function askMood(habit: Habit, day: string) {
  if (!useHabitStore.getState().settings.moodPrompt) return;
  setTimeout(() => overlay.open(<MoodSheet habit={habit} day={day} />), 750);
}

import { useState } from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { useHabitStore } from '@/store/useHabitStore';
import { getTheme } from '@/data/themes';
import { relativeDayLabel } from '@/utils/date';
import { fmtNumber } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import type { Habit } from '@/data/types';

/** Dialog to type an exact progress value for a habit on a day. */
export function ValueDialog({ habit, day, initial }: { habit: Habit; day: string; initial: number }) {
  const setValue = useHabitStore((s) => s.setValue);
  const [text, setText] = useState(initial ? fmtNumber(initial).replace(/,/g, '') : '');
  const colors = getTheme(habit.themeId);
  const parsed = Number(text.replace(',', '.'));
  const valid = text.trim() !== '' && Number.isFinite(parsed) && parsed >= 0;

  const save = () => {
    if (!valid) return;
    setValue(habit.id, day, parsed);
    if (parsed >= habit.goalValue) haptic.success();
    overlay.close();
  };

  return (
    <View style={{ padding: 22, gap: 18 }}>
      <View style={{ gap: 4 }}>
        <Txt variant="h2">{habit.title}</Txt>
        <Txt variant="small" color="secondary">
          {relativeDayLabel(day)} · goal {fmtNumber(habit.goalValue)} {habit.unit}
        </Txt>
      </View>
      <Field
        large
        autoFocus
        keyboardType="decimal-pad"
        value={text}
        onChangeText={setText}
        placeholder={`0 ${habit.unit}`}
        onSubmitEditing={save}
        returnKeyType="done"
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Cancel" variant="glass" onPress={overlay.close} style={{ flex: 1 }} />
        <Button label="Save" color={colors.accent} onPress={save} disabled={!valid} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

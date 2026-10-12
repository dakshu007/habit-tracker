import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

/** Open the native Android time dialog; resolves null when dismissed. */
export function pickTime(hour: number, minute: number): Promise<{ hour: number; minute: number } | null> {
  return new Promise((resolve) => {
    const value = new Date();
    value.setHours(hour, minute, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: false,
      onValueChange: (_e, date) => resolve({ hour: date.getHours(), minute: date.getMinutes() }),
      onDismiss: () => resolve(null),
    });
  });
}

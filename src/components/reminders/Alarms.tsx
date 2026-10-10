import { useState } from 'react';
import { Platform, ToastAndroid, View } from 'react-native';

import { DeviceSignals } from '../../../modules/device-signals';
import { Card, SectionTitle } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Button, PressableScale } from '@/components/ui/Glass';
import { AlarmClock, AlarmClockPlus } from '@/components/ui/lucide';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { DAY_LETTERS } from '@/utils/date';
import { pickTime } from '@/utils/pickTime';
import { haptic } from '@/utils/haptics';
import type { Habit } from '@/data/types';
import { t } from '@/i18n';
import { TimeChip } from './DailyNudges';

const ORANGE = '#FF7A2F';
const WEEKDAYS = [1, 2, 3, 4, 5];
const ALL = [0, 1, 2, 3, 4, 5, 6];

export const alarmsSupported = () => Platform.OS === 'android' && !!DeviceSignals?.canSetAlarm();

/** Create an alarm in the phone's Clock app. days: 0 = Sunday … 6 = Saturday. */
export function setPhoneAlarm(hour: number, minute: number, label: string, days: number[]): boolean {
  const ok = DeviceSignals?.setAlarm(hour, minute, label, days, true) ?? false;
  if (ok) haptic.success();
  ToastAndroid.show(ok ? t('Alarm set in your Clock app') : t('No Clock app found on this phone'), ToastAndroid.SHORT);
  return ok;
}

/** The habit's own days, as alarm days. */
export function habitAlarmDays(h: Habit): number[] {
  return h.schedule.kind === 'days' ? h.schedule.days : ALL;
}

/**
 * Reminders → Alarms. Alarms are created in the phone's Clock app so they ring
 * through silent mode and battery saver; this app only sets them up.
 */
export function Alarms() {
  const { theme } = useTheme();
  const [time, setTime] = useState({ hour: 6, minute: 30 });
  const [days, setDays] = useState<number[]>(ALL);

  if (!alarmsSupported()) return null;

  const toggleDay = (d: number) => {
    haptic.tick();
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  };
  const preset = (list: number[]) => (haptic.tick(), setDays(list));
  const same = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

  return (
    <>
      <SectionTitle>{t('Alarms')}</SectionTitle>
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: hexToRgba(ORANGE, 0.16), alignItems: 'center', justifyContent: 'center' }}>
            <AlarmClock size={20} color={ORANGE} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{t('Wake-up alarm')}</Txt>
            <Txt variant="small" color="secondary">
              {t('Saved in your phone’s Clock app, so it rings even on silent.')}
            </Txt>
          </View>
          <TimeChip
            {...time}
            onPress={async () => {
              const v = await pickTime(time.hour, time.minute);
              if (v) setTime(v);
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {ALL.map((d) => {
            const on = days.includes(d);
            return (
              <PressableScale key={d} onPress={() => toggleDay(d)} accessibilityLabel={t(DAY_LETTERS[d])}>
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? ORANGE : theme.inputBg }}>
                  <Txt variant="label" color={on ? 'white' : 'secondary'}>
                    {t(DAY_LETTERS[d])}
                  </Txt>
                </View>
              </PressableScale>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: t('Every day'), list: ALL },
            { label: t('Weekdays'), list: WEEKDAYS },
            { label: t('Once'), list: [] as number[] },
          ].map((p) => {
            const on = same(days, p.list);
            return (
              <PressableScale key={p.label} onPress={() => preset(p.list)}>
                <View style={{ paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: on ? hexToRgba(ORANGE, 0.16) : theme.inputBg }}>
                  <Txt variant="label" color={on ? ORANGE : 'primary'}>
                    {p.label}
                  </Txt>
                </View>
              </PressableScale>
            );
          })}
        </View>

        <Button
          label={t('Set alarm')}
          color={ORANGE}
          icon={<AlarmClockPlus size={18} color="#FFFFFF" strokeWidth={2.2} />}
          onPress={() => setPhoneAlarm(time.hour, time.minute, t('Wake up · Habit Tracker'), days)}
        />
        <PressableScale onPress={() => DeviceSignals?.showAlarms()} style={{ alignSelf: 'center', padding: 4 }}>
          <Txt variant="label" color={ORANGE}>
            {t('See my alarms')}
          </Txt>
        </PressableScale>
      </Card>
    </>
  );
}

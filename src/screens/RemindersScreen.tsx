import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Linking, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Screen, Card, SectionTitle, Toggle, Row } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Button, PressableScale } from '@/components/ui/Glass';
import { BellSmallIcon, MoonIcon, SparkleIcon } from '@/components/ui/icons';
import { HabitArt } from '@/components/art/HabitArt';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { ensurePermission, hasPermission } from '@/services/notifications';
import { getTheme } from '@/data/themes';
import { DAY_LABELS } from '@/utils/date';
import { pickTime } from '@/utils/pickTime';
import { DailyNudges, TimeChip } from '@/components/reminders/DailyNudges';
import { Alarms, alarmsSupported, habitAlarmDays, setPhoneAlarm } from '@/components/reminders/Alarms';
import { AlarmClockPlus } from '@/components/ui/lucide';
import { haptic } from '@/utils/haptics';
import type { Habit } from '@/data/types';
import { t } from '@/i18n';

function scheduleText(h: Habit) {
  if (h.schedule.kind === 'daily') return t('Every day');
  if (h.schedule.kind === 'weekly') return t('{n}× a week', { n: h.schedule.timesPerWeek });
  return h.schedule.days.map((d) => t(DAY_LABELS[d])).join(' · ');
}

export function RemindersScreen() {
  const { theme } = useTheme();
  const habits = useHabitStore((s) => s.habits);
  const nudge = useHabitStore((s) => s.settings.nudge);
  const updateSettings = useHabitStore((s) => s.updateSettings);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const [granted, setGranted] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    hasPermission().then(setGranted);
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const live = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const canAlarm = useMemo(alarmsSupported, []);
  const activeCount = live.filter((h) => h.reminder.enabled).length;

  const enable = async () => {
    const ok = await ensurePermission();
    setGranted(ok);
    if (!ok) Linking.openSettings();
    return ok;
  };

  const toggleHabit = async (h: Habit, on: boolean) => {
    if (on && !granted && !(await enable())) return;
    updateHabit({ ...h, reminder: { ...h.reminder, enabled: on } });
  };

  const setHabitTime = async (h: Habit) => {
    const t = await pickTime(h.reminder.hour, h.reminder.minute);
    if (t) updateHabit({ ...h, reminder: { enabled: true, ...t } });
  };

  const test = async () => {
    if (!granted && !(await enable())) return;
    haptic.success();
    await Notifications.scheduleNotificationAsync({
      content: { title: t('Reminders are working'), body: t('This is how your habit nudges will look.') },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: 'reminders' },
    });
  };

  return (
    <Screen title={t('Reminders')} subtitle={activeCount === 1 ? t('1 habit reminder active') : t('{n} habit reminders active', { n: activeCount })} accent="#FF986D">
      {granted === false && (
        <Card style={{ gap: 12, borderColor: '#FF986D' }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <BellSmallIcon size={24} color="#FF7A2F" />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{t('Notifications are off')}</Txt>
              <Txt variant="small" color="secondary">
                {t('Turn them on so reminders can reach you.')}
              </Txt>
            </View>
          </View>
          <Button label={t('Enable notifications')} color="#FF7A2F" onPress={enable} />
        </Card>
      )}

      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon={<MoonIcon size={20} color="#7D8BFF" />}
          iconBg="#7D8BFF"
          title={t('Evening nudge')}
          subtitle={t('Only if habits are still open that day')}
          right={
            <Toggle
              value={nudge.enabled}
              onChange={async (v) => {
                if (v && !granted && !(await enable())) return;
                updateSettings({ nudge: { ...nudge, enabled: v } });
              }}
            />
          }
        />
        <Row
          last
          title={t('Nudge time')}
          right={
            <TimeChip
              hour={nudge.hour}
              minute={nudge.minute}
              disabled={!nudge.enabled}
              onPress={async () => {
                const t = await pickTime(nudge.hour, nudge.minute);
                if (t) updateSettings({ nudge: { ...nudge, ...t } });
              }}
            />
          }
        />
      </Card>

      <DailyNudges ensureOn={async () => granted || enable()} />

      <Alarms />

      <SectionTitle>{t('Habit reminders')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        {live.length === 0 && (
          <Txt variant="bodyRegular" color="secondary" style={{ paddingVertical: 16, textAlign: 'center' }}>
            {t('Your habits will show up here.')}
          </Txt>
        )}
        {live.map((h, i) => (
          <View
            key={h.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              borderBottomWidth: i === live.length - 1 ? 0 : 1,
              borderBottomColor: theme.hairline,
            }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 14, overflow: 'hidden' }}>
              <HabitArt artId={h.artId} colors={getTheme(h.themeId)} compact />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="h3" numberOfLines={1}>
                {h.title}
              </Txt>
              <Txt variant="small" color="secondary" numberOfLines={1}>
                {scheduleText(h)}
              </Txt>
            </View>
            {h.reminder.enabled && <TimeChip hour={h.reminder.hour} minute={h.reminder.minute} onPress={() => setHabitTime(h)} />}
            {h.reminder.enabled && canAlarm && (
              <PressableScale
                onPress={() => setPhoneAlarm(h.reminder.hour, h.reminder.minute, h.title, habitAlarmDays(h))}
                accessibilityLabel={t('Also set an alarm for {habit}', { habit: h.title })}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                  <AlarmClockPlus size={17} color="#FF7A2F" strokeWidth={2.2} />
                </View>
              </PressableScale>
            )}
            <Toggle value={h.reminder.enabled} onChange={(v) => toggleHabit(h, v)} color={getTheme(h.themeId).accent} />
          </View>
        ))}
      </Card>

      <Button label={t('Send a test notification')} variant="glass" icon={<SparkleIcon size={18} color={theme.textPrimary} />} onPress={test} />
    </Screen>
  );
}

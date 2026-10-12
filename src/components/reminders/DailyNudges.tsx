import { View } from 'react-native';

import { Card, Row, SectionTitle, Toggle } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { Droplet, MoonStar, Sunrise } from '@/components/ui/lucide';
import { useHabitStore, type SmartNudges } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { formatTime } from '@/utils/date';
import { pickTime } from '@/utils/pickTime';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';

export function TimeChip({ hour, minute, onPress, disabled }: { hour: number; minute: number; onPress: () => void; disabled?: boolean }) {
  const { theme } = useTheme();
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={t('Change time')}>
      <View style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: theme.inputBg, justifyContent: 'center', opacity: disabled ? 0.45 : 1 }}>
        <Txt variant="label">{formatTime(hour, minute)}</Txt>
      </View>
    </PressableScale>
  );
}

const EVERY = [1, 2, 3];

/**
 * Reminders → Daily nudges: bedtime, a good-morning plan and water breaks.
 * Scheduled by services/notifications (kind "smart").
 */
export function DailyNudges({ ensureOn }: { ensureOn: () => Promise<boolean> }) {
  const { theme } = useTheme();
  const smart = useHabitStore((s) => s.settings.smart);
  const habits = useHabitStore((s) => s.habits);
  const updateSettings = useHabitStore((s) => s.updateSettings);
  const set = (patch: Partial<SmartNudges>) => updateSettings({ smart: { ...smart, ...patch } });

  const toggle = async (key: 'bedtime' | 'morning' | 'water', on: boolean) => {
    if (on && !(await ensureOn())) return;
    haptic.tick();
    if (key === 'bedtime' && on) {
      // Start from the sleep habit's bedtime when there is one.
      const bed = habits.find((h) => !h.archived && h.phoneSleep)?.phoneSleep?.bed;
      const from = bed != null && !smart.bedtime.enabled ? { hour: Math.floor(bed / 60), minute: bed % 60 } : {};
      set({ bedtime: { ...smart.bedtime, ...from, enabled: true } });
      return;
    }
    set({ [key]: { ...smart[key], enabled: on } } as Partial<SmartNudges>);
  };

  const time = async (key: 'bedtime' | 'morning') => {
    const v = await pickTime(smart[key].hour, smart[key].minute);
    if (v) set({ [key]: { ...smart[key], ...v } } as Partial<SmartNudges>);
  };

  const range = t('{from} to {to}', { from: formatTime(smart.water.from, 0), to: formatTime(smart.water.to, 0) });

  return (
    <>
      <SectionTitle>{t('Daily nudges')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon={<MoonStar size={20} color="#8E7CF5" strokeWidth={2} />}
          iconBg="#8E7CF5"
          title={t('Time to sleep')}
          subtitle={t('A calm reminder to put the phone down')}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {smart.bedtime.enabled && <TimeChip {...smart.bedtime} onPress={() => time('bedtime')} />}
              <Toggle value={smart.bedtime.enabled} color="#8E7CF5" onChange={(v) => toggle('bedtime', v)} />
            </View>
          }
        />
        <Row
          icon={<Sunrise size={20} color="#F5A623" strokeWidth={2} />}
          iconBg="#F5A623"
          title={t('Good morning plan')}
          subtitle={t('Today’s habits, first thing')}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {smart.morning.enabled && <TimeChip {...smart.morning} onPress={() => time('morning')} />}
              <Toggle value={smart.morning.enabled} color="#F5A623" onChange={(v) => toggle('morning', v)} />
            </View>
          }
        />
        <Row
          last={!smart.water.enabled}
          icon={<Droplet size={20} color="#3F95DA" strokeWidth={2} />}
          iconBg="#3F95DA"
          title={t('Water breaks')}
          subtitle={smart.water.enabled ? t('Every {n} h, {range}', { n: smart.water.every, range }) : t('Stops once your water habit is done')}
          right={<Toggle value={smart.water.enabled} color="#3F95DA" onChange={(v) => toggle('water', v)} />}
        />
        {smart.water.enabled && (
          <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 14, paddingLeft: 52 }}>
            {EVERY.map((n) => {
              const on = smart.water.every === n;
              return (
                <PressableScale key={n} onPress={() => (haptic.tick(), set({ water: { ...smart.water, every: n } }))} accessibilityLabel={t('Every {n} h', { n })}>
                  <View style={{ paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: on ? '#3F95DA' : theme.inputBg }}>
                    <Txt variant="label" color={on ? 'white' : 'primary'}>
                      {t('Every {n} h', { n })}
                    </Txt>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        )}
      </Card>
    </>
  );
}

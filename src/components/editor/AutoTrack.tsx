import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { Card, SectionTitle, Toggle } from '@/components/ui/Screen';
import { PressableScale } from '@/components/ui/Glass';
import { HeartPulse } from '@/components/ui/lucide';
import { useTheme } from '@/theme/ThemeContext';
import { getTheme } from '@/data/themes';
import { connectHealth, healthStatus, HEALTH_SOURCES, installHealthConnect, readDay } from '@/services/health';
import { dayKey } from '@/utils/date';
import { qty } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { Habit, HealthSource } from '@/data/types';

/** Suggest the sources that match the habit's current unit first. */
function ordered(unit: string) {
  const u = unit.toLowerCase();
  const fits = (s: (typeof HEALTH_SOURCES)[number]) => s.unit === u || (u === 'min' && s.unit === 'min');
  return [...HEALTH_SOURCES.filter(fits), ...HEALTH_SOURCES.filter((s) => !fits(s))];
}

/** Editor section: fill this habit automatically from Health Connect. */
export function AutoTrack({ h, onChange }: { h: Habit; onChange: (sync: HealthSource | undefined, unit?: string) => void }) {
  const { theme } = useTheme();
  const accent = getTheme(h.themeId).accent;
  const [preview, setPreview] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setPreview(null);
    if (!h.sync) return;
    healthStatus()
      .then((st) => (st === 'ready' ? readDay(h.sync!, dayKey()) : null))
      .then((v) => alive && setPreview(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [h.sync]);

  const enable = async (on: boolean) => {
    if (!on) return onChange(undefined);
    const st = await healthStatus();
    if (st === 'unavailable') {
      Alert.alert(t('Health Connect isn’t available'), t('This phone doesn’t support Health Connect.'));
      return;
    }
    if (st === 'needs-install') {
      Alert.alert(t('Install Health Connect'), t('Health Connect is free from Google. Install it, then turn this on again.'), [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Install'), onPress: installHealthConnect },
      ]);
      return;
    }
    if (st === 'needs-permission' && !(await connectHealth())) {
      Alert.alert(t('No access yet'), t('Allow Habit Tracker to read your activity in Health Connect to auto-track.'));
      return;
    }
    const first = ordered(h.unit)[0];
    onChange(first.id, first.unit);
  };

  return (
    <>
      <SectionTitle>{t('Auto-track')}</SectionTitle>
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.inputBg }}>
            <HeartPulse size={20} color={accent} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{t('Health Connect')}</Txt>
            <Txt variant="small" color="secondary">
              {t('Fill this habit from Samsung Health, Google Fit, Fitbit or your watch.')}
            </Txt>
          </View>
          <Toggle value={!!h.sync} color={accent} onChange={enable} />
        </View>

        {h.sync && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ordered(h.unit).map((s) => {
                const on = s.id === h.sync;
                return (
                  <PressableScale
                    key={s.id}
                    silent
                    onPress={() => {
                      haptic.tick();
                      onChange(s.id, s.unit);
                    }}
                  >
                    <View style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: on ? accent : theme.inputBg }}>
                      <Txt variant="label" color={on ? 'white' : 'secondaryStrong'}>
                        {t(s.label)}
                      </Txt>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            <Txt variant="small" color="secondary">
              {preview === null
                ? t('Syncs whenever you open the app. Manual logging still works.')
                : t('Today so far: {value}', { value: qty(preview, h.unit) })}
            </Txt>
          </>
        )}
      </Card>
    </>
  );
}


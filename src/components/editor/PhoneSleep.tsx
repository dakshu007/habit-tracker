import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { Card, SectionTitle, Toggle } from '@/components/ui/Screen';
import { PressableScale } from '@/components/ui/Glass';
import { MoonStar, ShieldCheck } from '@/components/ui/lucide';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { getTheme } from '@/data/themes';
import { hasUsageAccess, openUsageAccess, phoneSleepSupported, readSleep } from '@/services/phoneSleep';
import { GLANCE_MIN, MIN_STRETCH_MIN, sleepWindow } from '@/logic/sleep';
import { addDays, dayKey, formatTime } from '@/utils/date';
import { pickTime } from '@/utils/pickTime';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { Habit } from '@/data/types';

const DEFAULT = { bed: 22 * 60, wake: 6 * 60 };
const hm = (mins: number) => formatTime(Math.floor(mins / 60), mins % 60);
const clock = (ms: number) => {
  const d = new Date(ms);
  return formatTime(d.getHours(), d.getMinutes());
};

/** Whether a habit looks like a sleep habit (so the editor offers phone sleep detection). */
export function isSleepHabit(h: Habit): boolean {
  const u = h.unit.toLowerCase();
  return !!h.phoneSleep || h.artId === 'aura-moon' || /sleep|bed|nind|नींद/i.test(h.title) || ['night', 'nights'].includes(u);
}

/**
 * Editor section: log sleep from phone use. Inside the bedtime window, time
 * with the screen off counts as sleep — no watch or other app needed.
 */
export function PhoneSleep({ h, onChange }: { h: Habit; onChange: (v: Habit['phoneSleep']) => void }) {
  const { theme, isDark } = useTheme();
  const accent = getTheme(h.themeId).accent;
  const [access, setAccess] = useState(hasUsageAccess);
  const [lastNight, setLastNight] = useState<string | null>(null);
  const win = h.phoneSleep;

  // Coming back from Settings → re-check access.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setAccess(hasUsageAccess()));
    return () => sub.remove();
  }, []);

  // Preview the most recent finished night.
  useEffect(() => {
    let alive = true;
    setLastNight(null);
    if (!win || !access) return;
    const today = dayKey();
    const key = sleepWindow(today, win.bed, win.wake)[1] <= Date.now() ? today : dayKey(addDays(new Date(), -1));
    readSleep(win.bed, win.wake, key)
      .then((r) => {
        if (!alive || !r) return;
        setLastNight(
          r.minutes > 0 && r.asleepAt && r.wokeAt
            ? t('Last night: {h}h {m}m · {from} → {to}', { h: Math.floor(r.minutes / 60), m: r.minutes % 60, from: clock(r.asleepAt), to: clock(r.wokeAt) })
            : t('No sleep found in last night’s window yet.'),
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [win, access]);

  if (!phoneSleepSupported() || !isSleepHabit(h)) return null;

  const pick = async (which: 'bed' | 'wake') => {
    const cur = (win ?? DEFAULT)[which];
    const v = await pickTime(Math.floor(cur / 60), cur % 60);
    if (v) onChange({ ...(win ?? DEFAULT), [which]: v.hour * 60 + v.minute });
  };

  return (
    <>
      <SectionTitle>{t('Sleep tracking')}</SectionTitle>
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.inputBg }}>
            <MoonStar size={20} color={accent} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{t('Sleep from phone use')}</Txt>
            <Txt variant="small" color="secondary">
              {t('No watch needed: while your bedtime window is on, time with the screen off counts as sleep.')}
            </Txt>
          </View>
          <Toggle
            value={!!win}
            color={accent}
            onChange={(on) => {
              haptic.tick();
              onChange(on ? (win ?? DEFAULT) : undefined);
            }}
          />
        </View>

        {win && (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TimeBox label={t('Bedtime')} value={hm(win.bed)} onPress={() => pick('bed')} />
              <TimeBox label={t('Wake up')} value={hm(win.wake)} onPress={() => pick('wake')} />
            </View>

            {!access ? (
              <View style={{ gap: 10, padding: 14, borderRadius: 18, backgroundColor: hexToRgba(accent, isDark ? 0.18 : 0.08) }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <ShieldCheck size={18} color={accent} strokeWidth={2} />
                  <Txt variant="small" style={{ flex: 1 }}>
                    {t('Turn on “Usage access” for Habit Tracker so it can see when your screen was on or off. Only those times are read (never which apps you used), and nothing leaves your phone.')}
                  </Txt>
                </View>
                <PressableScale onPress={() => openUsageAccess()}>
                  <View style={{ height: 42, borderRadius: 21, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt variant="button" color="white">
                      {t('Allow usage access')}
                    </Txt>
                  </View>
                </PressableScale>
              </View>
            ) : (
              <Txt variant="small" color="secondary">
                {lastNight ?? t('Checks your sleep every time you open the app.')}
              </Txt>
            )}

            <Txt variant="small" color="tertiary">
              {t('Checking the time for under {glance} min doesn’t wake you; screen-off stretches under {stretch} min don’t count.', { glance: GLANCE_MIN, stretch: MIN_STRETCH_MIN })}
            </Txt>
          </>
        )}
      </Card>
    </>
  );
}

function TimeBox({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <PressableScale onPress={onPress} style={{ flex: 1 }}>
      <View style={{ padding: 12, borderRadius: 18, backgroundColor: theme.inputBg, gap: 2 }}>
        <Txt variant="micro" color="secondary">
          {label}
        </Txt>
        <Txt variant="h2">{value}</Txt>
      </View>
    </PressableScale>
  );
}

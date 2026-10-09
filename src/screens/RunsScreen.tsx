import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, Card, SectionTitle } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { ChevronLeft, ChevronRight, TrashIcon } from '@/components/ui/icons';
import { Footprints, PartyPopper, Play, Route, Timer, Trophy, Zap, type LucideIcon } from '@/components/ui/lucide';
import { RUN_BLUE, RunMap } from '@/components/run/RunMap';
import { RouteSketch } from '@/components/run/RouteSketch';
import { useLiveRun, useRunStore } from '@/store/useRunStore';
import { loadRoute, type RouteData } from '@/services/runFiles';
import { useHabitStore } from '@/store/useHabitStore';
import { fmtDuration, fmtKm, fmtPace, movingTime, paceSecPerKm, splitDurations } from '@/logic/run';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { dayKey, formatTime, relativeDayLabel, startOfWeek } from '@/utils/date';
import { qty } from '@/utils/format';
import { t } from '@/i18n';
import type { RunSummary } from '@/data/types';
import type { RootScreenProps } from '@/navigation/types';

function runTitle(run: RunSummary): string {
  const h = new Date(run.startedAt).getHours();
  if (h >= 5 && h < 12) return t('Morning run');
  if (h >= 12 && h < 17) return t('Afternoon run');
  if (h >= 17 && h < 21) return t('Evening run');
  return t('Night run');
}

function runWhen(run: RunSummary): string {
  const d = new Date(run.startedAt);
  return `${relativeDayLabel(dayKey(d))} · ${formatTime(d.getHours(), d.getMinutes())}`;
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

export function RunsScreen({ navigation }: RootScreenProps<'Runs'>) {
  const { theme } = useTheme();
  const runs = useRunStore((s) => s.runs);
  const live = useLiveRun((s) => s.live);
  const weekStart = useHabitStore((s) => s.settings.weekStart);

  const totals = useMemo(() => {
    const from = startOfWeek(new Date(), weekStart).getTime();
    const week = runs.filter((r) => r.startedAt >= from).reduce((m, r) => m + r.distance, 0);
    const all = runs.reduce((m, r) => m + r.distance, 0);
    const longest = runs.reduce((m, r) => Math.max(m, r.distance), 0);
    const best = runs.filter((r) => r.distance >= 1000).reduce<number | null>((m, r) => {
      const p = paceSecPerKm(r.movingMs, r.distance);
      return p != null && (m == null || p < m) ? p : m;
    }, null);
    return { week, all, longest, best };
  }, [runs, weekStart]);

  return (
    <Screen
      title={t('Runs')}
      subtitle={t('Every route you’ve run, saved on this phone.')}
      accent={RUN_BLUE}
      tabBar={false}
      left={
        <GlassButton accessibilityLabel={t('Back')} fill={theme.inputBg} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={theme.textPrimary} strokeWidth={2.4} />
        </GlassButton>
      }
    >
      <Button
        label={live ? t('Back to your run') : t('Start a run')}
        color={RUN_BLUE}
        icon={<Play size={18} color="#FFFFFF" fill="#FFFFFF" />}
        onPress={() => navigation.navigate('Run')}
      />

      {runs.length > 0 ? (
        <>
          <Card style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 18, padding: 20 }}>
            <Total Icon={Footprints} label={t('This week')} value={`${fmtKm(totals.week)} km`} />
            <Total Icon={Route} label={t('All time')} value={`${fmtKm(totals.all)} km`} />
            <Total Icon={Trophy} label={t('Longest')} value={`${fmtKm(totals.longest)} km`} />
            <Total Icon={Zap} label={t('Best pace')} value={totals.best != null ? `${fmtPace(totals.best)} /km` : '–'} />
          </Card>

          <SectionTitle>{t('History')}</SectionTitle>
          <Card style={{ paddingVertical: 6 }}>
            {runs.map((r, i) => (
              <PressableScale key={r.id} onPress={() => navigation.navigate('RunDetail', { id: r.id })} scaleTo={0.98}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingVertical: 12,
                    borderBottomWidth: i === runs.length - 1 ? 0 : 1,
                    borderBottomColor: theme.hairline,
                  }}
                >
                  <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: hexToRgba(RUN_BLUE, 0.08) }}>
                    <RouteSketch path={r.sketch} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="h3">{runTitle(r)}</Txt>
                    <Txt variant="small" color="secondary">
                      {runWhen(r)}
                    </Txt>
                    <Txt variant="label" color="secondaryStrong">
                      {fmtKm(r.distance)} km · {fmtDuration(r.movingMs)} · {fmtPace(paceSecPerKm(r.movingMs, r.distance))} /km
                    </Txt>
                  </View>
                  <ChevronRight size={18} color={theme.textTertiary} />
                </View>
              </PressableScale>
            ))}
          </Card>
        </>
      ) : (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 30 }}>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: hexToRgba(RUN_BLUE, 0.12), alignItems: 'center', justifyContent: 'center' }}>
            <Footprints size={30} color={RUN_BLUE} />
          </View>
          <Txt variant="h3">{t('No runs yet')}</Txt>
          <Txt variant="small" color="secondary" style={{ textAlign: 'center' }}>
            {t('Start a run and we’ll map your route, distance and pace — even with the screen off.')}
          </Txt>
        </Card>
      )}
    </Screen>
  );
}

function Total({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: hexToRgba(RUN_BLUE, 0.12), alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={RUN_BLUE} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="h3" numberOfLines={1}>
          {value}
        </Txt>
        <Txt variant="small" color="secondary">
          {label}
        </Txt>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* One run                                                             */
/* ------------------------------------------------------------------ */

export function RunDetailScreen({ navigation, route }: RootScreenProps<'RunDetail'>) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const run = useRunStore((s) => s.runs.find((r) => r.id === route.params.id));
  const habit = useHabitStore((s) => (run?.habitId ? s.habits.find((h) => h.id === run.habitId) : undefined));
  const splits = useMemo(() => (run ? splitDurations(run) : []), [run]);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  useEffect(() => {
    let alive = true;
    loadRoute(route.params.id).then((r) => alive && setRouteData(r));
    return () => {
      alive = false;
    };
  }, [route.params.id]);

  if (!run) return null;

  const fastest = splits.filter((s) => !s.partial).reduce<number | null>((m, s) => (m == null || s.ms < m ? s.ms : m), null);
  const slowest = Math.max(...splits.map((s) => s.ms), 1);
  const avg = paceSecPerKm(run.movingMs, run.distance);
  const mapH = Math.round(height * 0.46);

  const remove = () =>
    Alert.alert(t('Delete this run?'), t('The route is removed. Anything it logged to your habit stays.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: () => {
          useRunStore.getState().deleteRun(run.id);
          navigation.goBack();
        },
      },
    ]);

  const glass = isDark ? 'rgba(30,31,42,0.92)' : 'rgba(255,255,255,0.94)';

  return (
    <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={{ height: mapH }}>
          {routeData && routeData.points.length > 0 ? (
            <RunMap points={routeData.points} gaps={routeData.gaps} mode="summary" padding={{ top: insets.top + 60, bottom: 50 }} />
          ) : (
            <View style={{ flex: 1, backgroundColor: hexToRgba(RUN_BLUE, 0.08) }} />
          )}
        </View>

        <View style={{ marginTop: -28, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: theme.screenBase, paddingHorizontal: 20, paddingTop: 24, gap: 18 }}>
          {route.params.fresh && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 20, backgroundColor: hexToRgba('#34C759', isDark ? 0.18 : 0.12) }}>
              <PartyPopper size={20} color="#34C759" />
              <Txt variant="label" color="success" style={{ flex: 1 }}>
                {habit && run.logged ? t('Run saved · {amount} added to {habit}', { amount: qty(run.logged, habit.unit), habit: habit.title }) : t('Run saved. Nice work!')}
              </Txt>
            </View>
          )}

          <View style={{ gap: 4 }}>
            <Txt variant="micro" color="secondary">
              {runWhen(run)}
            </Txt>
            <Txt variant="title">{runTitle(run)}</Txt>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Txt variant="display" style={{ fontSize: 56, lineHeight: 62 }}>
              {fmtKm(run.distance)}
            </Txt>
            <Txt variant="h2" color="secondary" style={{ marginBottom: 10 }}>
              {t('km')}
            </Txt>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Tile Icon={Timer} label={t('Time')} value={fmtDuration(run.movingMs)} />
            <Tile Icon={Footprints} label={t('Avg pace')} value={`${fmtPace(avg)}`} unit="/km" />
            <Tile Icon={Zap} label={t('Fastest km')} value={fastest != null ? fmtPace(fastest / 1000) : '–'} unit={fastest != null ? '/km' : undefined} />
          </View>

          {habit && run.logged ? (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <Route size={18} color={RUN_BLUE} />
              <Txt variant="small" color="secondary" style={{ flex: 1 }}>
                {t('Logged {amount} to {habit}', { amount: qty(run.logged, habit.unit), habit: habit.title })}
              </Txt>
            </Card>
          ) : null}

          {splits.length > 0 && (
            <>
              <SectionTitle>{t('Splits')}</SectionTitle>
              <Card style={{ gap: 12 }}>
                {splits.map((s) => {
                  const best = !s.partial && s.ms === fastest;
                  return (
                    <View key={s.km} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Txt variant="label" color="secondary" style={{ width: 52 }}>
                        {s.partial ? `${s.partial.toFixed(2)} km` : `${s.km} km`}
                      </Txt>
                      <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: theme.progressTrack, overflow: 'hidden' }}>
                        <View style={{ width: `${Math.max(12, (s.ms / slowest) * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: best ? '#FF8A3D' : RUN_BLUE }} />
                      </View>
                      <Txt variant="label" color={best ? '#FF8A3D' : 'primary'} style={{ width: 52, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                        {fmtPace(s.ms / 1000)}
                      </Txt>
                    </View>
                  );
                })}
                <Txt variant="small" color="tertiary">
                  {t('Pace per kilometre (min:sec). Shorter bar = faster.')}
                </Txt>
              </Card>
            </>
          )}

          {route.params.fresh && <Button label={t('Done')} color={RUN_BLUE} onPress={() => navigation.goBack()} />}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
        <GlassButton accessibilityLabel={t('Back')} fill={glass} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={theme.textPrimary} strokeWidth={2.4} />
        </GlassButton>
        <GlassButton accessibilityLabel={t('Delete run')} fill={glass} onPress={remove}>
          <TrashIcon size={19} color={theme.danger} />
        </GlassButton>
      </View>
    </View>
  );
}

function Tile({ Icon, label, value, unit }: { Icon: LucideIcon; label: string; value: string; unit?: string }) {
  const { theme, isDark } = useTheme();
  return (
    <View style={{ flex: 1, padding: 14, gap: 8, borderRadius: 22, backgroundColor: isDark ? theme.cardElevated : '#FFFFFF', borderWidth: 1, borderColor: theme.hairline }}>
      <Icon size={17} color={RUN_BLUE} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        <Txt variant="statSmall" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Txt>
        {unit ? (
          <Txt variant="small" color="secondary" style={{ marginBottom: 2 }}>
            {unit}
          </Txt>
        ) : null}
      </View>
      <Txt variant="small" color="secondary">
        {label}
      </Txt>
    </View>
  );
}

/** Live-run banner for the home screen: tap to get back to the run. */
export function LiveRunPill({ onPress }: { onPress: () => void }) {
  const live = useLiveRun((s) => s.live);
  const [, tick] = useState(0);
  useEffect(() => {
    if (live?.status !== 'running') return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [live?.status]);
  if (!live) return null;
  const paused = live.status === 'paused';
  return (
    <PressableScale onPress={onPress} accessibilityLabel={t('Back to your run')}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          height: 44,
          paddingHorizontal: 16,
          borderRadius: 22,
          backgroundColor: paused ? '#8A8A95' : RUN_BLUE,
          boxShadow: `0px 8px 20px ${hexToRgba(RUN_BLUE, 0.35)}`,
        }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
        <Txt variant="label" color="white">
          {paused ? t('Run paused') : t('Run in progress')} · {fmtKm(live.distance)} km · {fmtDuration(movingTime(live, Date.now()))}
        </Txt>
      </View>
    </PressableScale>
  );
}

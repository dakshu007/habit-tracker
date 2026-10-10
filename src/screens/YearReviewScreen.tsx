import { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from '@/components/ui/Txt';
import { GlassButton, PressableScale } from '@/components/ui/Glass';
import { ChevronLeft } from '@/components/ui/icons';
import { CalendarCheck, Crown, Flame, Footprints, Sparkles, Star, Trophy, type LucideIcon } from '@/components/ui/lucide';
import { HabitArt } from '@/components/art/HabitArt';
import { useHabitStore } from '@/store/useHabitStore';
import { useRunStore } from '@/store/useRunStore';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { yearReview } from '@/logic/insights';
import { fmtKm } from '@/logic/run';
import { DAY_NAMES, MONTH_LABELS } from '@/utils/date';
import { pct } from '@/utils/format';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

const SKY = ['#7EC2F0', '#3F95DA', '#056EBE'] as const;
const MOOD_COLORS = ['#8E9BF5', '#B9BCC6', '#3FC1A5', '#F5A623'];

function heat(f: number | null | undefined, dark: boolean): string {
  if (f === undefined) return 'transparent';
  if (f === null) return dark ? 'rgba(255,255,255,0.05)' : '#EEF1F5';
  if (f === 0) return dark ? 'rgba(255,255,255,0.09)' : '#E2E6EC';
  if (f < 0.5) return '#BFDDF6';
  if (f < 1) return '#6FB7ED';
  return '#056EBE';
}

/** The year, story-style: totals, a 365-day heatmap, top habit, best month and day. */
export function YearReviewScreen({ navigation, route }: RootScreenProps<'YearReview'>) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const runs = useRunStore((s) => s.runs);
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(route.params?.year ?? thisYear);
  const r = useMemo(() => yearReview(habits, logs, year, today), [habits, logs, year, today]);
  const runKm = useMemo(() => runs.filter((x) => new Date(x.startedAt).getFullYear() === year).reduce((m, x) => m + x.distance, 0), [runs, year]);
  const moodTotal = r.moods.reduce((a, b) => a + b, 0);

  // Heatmap: weeks as columns, Sunday–Saturday rows.
  const weeks = useMemo(() => {
    const first = new Date(year, 0, 1);
    const cols: (string | null)[][] = [];
    let col: (string | null)[] = Array(first.getDay()).fill(null);
    for (let d = new Date(first); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
      const k = `${year}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
      col.push(k);
      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
    }
    if (col.length) cols.push([...col, ...Array(7 - col.length).fill(null)]);
    return cols;
  }, [year]);
  const cell = Math.max(3, Math.floor((width - 40 - 36 - (weeks.length - 1) * 2) / weeks.length));

  const card = { borderRadius: 26, padding: 18, gap: 12, backgroundColor: isDark ? theme.cardElevated : '#FFFFFF', boxShadow: isDark ? undefined : '0px 10px 30px rgba(28,27,34,0.06)' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
      <LinearGradient colors={[...SKY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 40, paddingHorizontal: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <GlassButton accessibilityLabel={t('Back')} fill="rgba(255,255,255,0.22)" onPress={() => navigation.goBack()}>
            <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
          </GlassButton>
          <View style={{ flex: 1 }} />
          {[thisYear - 1, thisYear].map((y) => (
            <PressableScale key={y} silent onPress={() => setYear(y)}>
              <View style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center', backgroundColor: y === year ? '#FFFFFF' : 'rgba(255,255,255,0.2)' }}>
                <Txt variant="label" color={y === year ? SKY[2] : 'white'}>
                  {y}
                </Txt>
              </View>
            </PressableScale>
          ))}
        </View>

        <View style={{ gap: 4, marginTop: 6 }}>
          <Txt variant="micro" color="rgba(255,255,255,0.85)">
            {t('Year in review')}
          </Txt>
          <Txt variant="display" color="white" style={{ fontSize: 56, lineHeight: 62 }}>
            {year}
          </Txt>
          <Txt variant="body" color="rgba(255,255,255,0.92)">
            {r.checkins ? t('{n} check-ins. Every one of them counted.', { n: r.checkins }) : t('Your year starts with the first check-in.')}
          </Txt>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat Icon={CalendarCheck} value={`${r.activeDays}`} label={t('Active days')} />
          <Stat Icon={Sparkles} value={`${r.perfectDays}`} label={t('Perfect days')} />
          <Stat Icon={Flame} value={`${r.longestPerfectRun}`} label={t('Best run')} />
        </View>

        <View style={card}>
          <Txt variant="h3">{t('Your year, day by day')}</Txt>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {weeks.map((w, i) => (
              <View key={i} style={{ gap: 2 }}>
                {w.map((k, j) => (
                  <View key={j} style={{ width: cell, height: cell, borderRadius: cell / 3, backgroundColor: heat(k ? (k > today ? undefined : r.heat[k]) : undefined, isDark) }} />
                ))}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {[0, 3, 6, 9].map((m) => (
              <Txt key={m} variant="small" color="tertiary">
                {t(MONTH_LABELS[m]).slice(0, 3)}
              </Txt>
            ))}
            <Txt variant="small" color="tertiary">
              {t(MONTH_LABELS[11]).slice(0, 3)}
            </Txt>
          </View>
        </View>

        {r.topHabit && (
          <View style={[card, { flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ width: 64, height: 64, borderRadius: 20, overflow: 'hidden' }}>
              <HabitArt artId={r.topHabit.habit.artId} mode="thumb" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="micro" color="secondary">
                {t('Top habit')}
              </Txt>
              <Txt variant="h2">{r.topHabit.habit.title}</Txt>
              <Txt variant="small" color="secondary">
                {t('Done {n} times this year', { n: r.topHabit.done })}
              </Txt>
            </View>
            <Crown size={26} color="#F5A623" strokeWidth={2} />
          </View>
        )}

        <View style={card}>
          {r.mostConsistent && <Line Icon={Trophy} color="#F5A623" title={t('Most consistent')} value={t('{habit} · {pct} of days', { habit: r.mostConsistent.habit.title, pct: pct(r.mostConsistent.rate) })} />}
          {r.bestMonth && <Line Icon={Star} color="#8E7CF5" title={t('Best month')} value={t('{month} · {pct} complete', { month: t(MONTH_LABELS[r.bestMonth.month]), pct: pct(r.bestMonth.rate) })} />}
          {r.bestWeekday && <Line Icon={CalendarCheck} color="#3FC1A5" title={t('Best day of the week')} value={t('{day} · {pct} complete', { day: t(DAY_NAMES[r.bestWeekday.day]), pct: pct(r.bestWeekday.rate) })} />}
          {runKm > 0 && <Line Icon={Footprints} color="#FF8A3D" title={t('Distance run')} value={`${fmtKm(runKm)} km`} />}
        </View>

        {moodTotal > 0 && (
          <View style={card}>
            <Txt variant="h3">{t('How you felt')}</Txt>
            <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' }}>
              {r.moods.map((n, i) => (n ? <View key={i} style={{ flex: n, backgroundColor: MOOD_COLORS[i] }} /> : null))}
            </View>
            <Txt variant="small" color="secondary">
              {t('{n} check-ins felt good or great.', { n: r.moods[2] + r.moods[3] })}
            </Txt>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ Icon, value, label }: { Icon: LucideIcon; value: string; label: string }) {
  const { theme, isDark } = useTheme();
  return (
    <View style={{ flex: 1, borderRadius: 22, padding: 14, gap: 6, backgroundColor: isDark ? theme.cardElevated : '#FFFFFF' }}>
      <Icon size={18} color={SKY[1]} strokeWidth={2} />
      <Txt variant="stat">{value}</Txt>
      <Txt variant="small" color="secondary">
        {label}
      </Txt>
    </View>
  );
}

function Line({ Icon, color, title, value }: { Icon: LucideIcon; color: string; title: string; value: string }) {
  const { isDark } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(color, isDark ? 0.22 : 0.13) }}>
        <Icon size={19} color={color} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="small" color="secondary">
          {title}
        </Txt>
        <Txt variant="h3">{value}</Txt>
      </View>
    </View>
  );
}

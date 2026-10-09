import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { Screen, Card, SectionTitle } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FlameIcon, SparkleIcon, TrophyIcon, CheckIcon, ChevronRight } from '@/components/ui/icons';
import { HabitArt } from '@/components/art/HabitArt';
import { BarChart } from '@/components/charts/BarChart';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { palette } from '@/theme/tokens';
import {
  bestCurrentStreak,
  completionRate,
  dayCompletion,
  levelFor,
  levelTitle,
  perfectDays,
  recentDays,
  streakFor,
  totalCompletions,
  xpFor,
} from '@/logic/habits';
import { getTheme } from '@/data/themes';
import { DAY_NAMES, DAY_LETTERS, fromKey, shiftKey } from '@/utils/date';
import { pct } from '@/utils/format';
import type { RootNav } from '@/navigation/types';

export function StatsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<RootNav>();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  const [range, setRange] = useState<'week' | 'month'>('week');

  const live = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  const stats = useMemo(() => {
    const xp = xpFor(habits, logs);
    const lvl = levelFor(xp);
    const best = bestCurrentStreak(live, logs, today, weekStart);
    const last7 = recentDays(live, logs, today, 7).filter((d) => d.key !== today || (d.value ?? 0) > 0);
    const scored = last7.filter((d) => d.value !== null);
    const rate7 = scored.length ? scored.reduce((s, d) => s + (d.value ?? 0), 0) / scored.length : 0;

    // Best weekday over the last 8 weeks.
    const byDow = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
    for (let i = 1; i <= 56; i++) {
      const k = shiftKey(today, -i);
      const v = dayCompletion(live, logs, k);
      if (v === null) continue;
      const d = fromKey(k).getDay();
      byDow[d].sum += v;
      byDow[d].n++;
    }
    const ranked = byDow.map((x, d) => ({ d, avg: x.n >= 2 ? x.sum / x.n : -1 })).sort((a, b) => b.avg - a.avg);
    const bestDow = ranked[0].avg > 0 ? ranked[0] : null;

    return {
      xp,
      lvl,
      best,
      rate7,
      perfect: perfectDays(habits, logs),
      total: totalCompletions(habits, logs),
      bestDow,
    };
  }, [habits, live, logs, today, weekStart]);

  const bars = useMemo(() => {
    const n = range === 'week' ? 7 : 30;
    return recentDays(live, logs, today, n).map((d, i) => ({
      label: range === 'week' ? DAY_LETTERS[fromKey(d.key).getDay()] : i % 5 === 4 || i === n - 1 ? `${fromKey(d.key).getDate()}` : '',
      value: d.value,
      highlight: d.key === today,
    }));
  }, [live, logs, today, range]);

  const perHabit = useMemo(
    () =>
      live.map((h) => ({
        h,
        streak: streakFor(h, logs, today, weekStart),
        rate: completionRate(h, logs, today, 30, weekStart),
      })),
    [live, logs, today, weekStart],
  );

  return (
    <Screen title="Stats" subtitle="Your consistency, at a glance." accent="#B280FF">
      {/* Level hero */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <LinearGradient colors={['#8E6CFF', '#5E9BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              <Txt variant="title" color="white">
                {stats.lvl.level}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="micro" color="rgba(255,255,255,0.8)">
                Level {stats.lvl.level}
              </Txt>
              <Txt variant="title" color="white">
                {levelTitle(stats.lvl.level)}
              </Txt>
            </View>
            <SparkleIcon size={26} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={{ gap: 8 }}>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.max(3, (stats.lvl.into / stats.lvl.span) * 100)}%`, backgroundColor: '#FFFFFF', borderRadius: 5 }} />
            </View>
            <Txt variant="small" color="rgba(255,255,255,0.85)">
              {stats.lvl.span - stats.lvl.into} XP to level {stats.lvl.level + 1} · {stats.xp} XP total
            </Txt>
          </View>
        </LinearGradient>
      </Card>

      {/* Tiles */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Tile icon={<FlameIcon size={22} />} value={`${stats.best?.streak.current ?? 0}`} label={stats.best?.streak.unit === 'week' ? 'Week streak' : 'Day streak'} delay={60} />
        <Tile icon={<CheckIcon size={20} color={palette.success} strokeWidth={2.8} />} value={pct(stats.rate7)} label="Last 7 days" delay={100} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Tile icon={<TrophyIcon size={20} color="#F5A623" />} value={`${stats.perfect}`} label="Perfect days" delay={140} />
        <Tile icon={<SparkleIcon size={20} color="#B280FF" />} value={`${stats.total}`} label="Check-ins" delay={180} />
      </View>

      {/* Chart */}
      <Card delay={200} style={{ gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt variant="h2">Completion</Txt>
          <View style={{ width: 170 }}>
            <SegmentedControl
              options={[
                { key: 'week', label: '7 days' },
                { key: 'month', label: '30 days' },
              ]}
              value={range}
              onChange={setRange}
            />
          </View>
        </View>
        <BarChart bars={bars} from={palette.progressFillFrom} to="#7FB8FF" height={120} />
        {stats.bestDow && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: theme.inputBg }}>
            <SparkleIcon size={18} color="#B280FF" />
            <Txt variant="small" color="secondaryStrong" style={{ flex: 1 }}>
              You&rsquo;re most consistent on{' '}
              <Txt variant="label">{DAY_NAMES[stats.bestDow.d]}s</Txt>{' '}
              — {pct(stats.bestDow.avg)} on average.
            </Txt>
          </View>
        )}
      </Card>

      <SectionTitle>By habit · last 30 days</SectionTitle>
      <Card delay={240} style={{ paddingVertical: 6 }}>
        {perHabit.length === 0 ? (
          <Txt variant="bodyRegular" color="secondary" style={{ paddingVertical: 16, textAlign: 'center' }}>
            Create a habit to see its stats here.
          </Txt>
        ) : (
          perHabit.map(({ h, streak, rate }, i) => {
            const c = getTheme(h.themeId);
            return (
              <PressableScale key={h.id} scaleTo={0.98} onPress={() => navigation.navigate('HabitDetail', { id: h.id })}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    borderBottomWidth: i === perHabit.length - 1 ? 0 : 1,
                    borderBottomColor: theme.hairline,
                  }}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 15, overflow: 'hidden' }}>
                    <HabitArt artId={h.artId} colors={c} compact />
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>
                        {h.title}
                      </Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <FlameIcon size={15} color={streak.current ? '#FF7A2F' : theme.textTertiary} />
                        <Txt variant="label">{streak.current}</Txt>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: theme.progressTrack, overflow: 'hidden' }}>
                        <View style={{ width: `${rate * 100}%`, height: '100%', borderRadius: 4, backgroundColor: c.accent }} />
                      </View>
                      <Txt variant="label" color="secondary" style={{ width: 38, textAlign: 'right' }}>
                        {pct(rate)}
                      </Txt>
                    </View>
                  </View>
                  <ChevronRight size={18} color={theme.textTertiary} />
                </View>
              </PressableScale>
            );
          })
        )}
      </Card>
    </Screen>
  );
}

function Tile({ icon, value, label, delay }: { icon: React.ReactNode; value: string; label: string; delay: number }) {
  return (
    <Card delay={delay} style={{ flex: 1, gap: 10 }}>
      {icon}
      <View>
        <Txt variant="stat">{value}</Txt>
        <Txt variant="small" color="secondary">
          {label}
        </Txt>
      </View>
    </Card>
  );
}

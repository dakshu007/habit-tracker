import { useMemo, useRef, useState } from 'react';
import { Image, ToastAndroid, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CloseIcon } from '@/components/ui/icons';
import { Flame, Share2, Sparkles } from '@/components/ui/lucide';
import { useHabitStore } from '@/store/useHabitStore';
import { useActiveHabit } from '@/store/useHabitStore';
import { getArt } from '@/data/art';
import { getTheme } from '@/data/themes';
import { dueOn, isDoneOn, recentDays, streakFor, valueOn } from '@/logic/habits';
import { fonts, spacing } from '@/theme/tokens';
import { DAY_LETTERS, MONTH_LABELS, fromKey } from '@/utils/date';
import { fmtNumber, pct, qty } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

type Kind = 'streak' | 'today' | 'week';

/**
 * Story-format share cards (9:16). The card renders at screen size and is
 * captured at 3× for a crisp ~1080px-wide PNG, then handed to the share sheet.
 */
export function ShareScreen({ navigation, route }: RootScreenProps<'Share'>) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const habits = useHabitStore((s) => s.habits);
  const active = useActiveHabit();
  const [kind, setKind] = useState<Kind>(route.params?.kind ?? 'streak');
  const [habitId, setHabitId] = useState(route.params?.habitId ?? active?.id ?? habits.find((h) => !h.archived)?.id);
  const [busy, setBusy] = useState(false);
  const card = useRef<View>(null);

  const live = habits.filter((h) => !h.archived && !h.quit);
  const cardW = Math.min(width - 48, (height - insets.top - insets.bottom - 260) * (9 / 16));
  const cardH = (cardW * 16) / 9;

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Let the button's pressed state settle so the card isn't captured mid-animation.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1920 });
      haptic.success();
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('Share your progress') });
    } catch {
      haptic.warning();
      ToastAndroid.show(t('Couldn’t create the image. Please try again.'), ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#14141A', paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16, paddingHorizontal: spacing.screenX, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Txt variant="h2" color="white" style={{ flex: 1 }}>
          {t('Share your progress')}
        </Txt>
        <GlassButton accessibilityLabel={t('Close')} fill="rgba(255,255,255,0.12)" onPress={() => navigation.goBack()}>
          <CloseIcon size={20} color="#FFFFFF" />
        </GlassButton>
      </View>

      <SegmentedControl<Kind>
        options={[
          { key: 'streak', label: t('Streak') },
          { key: 'today', label: t('Today') },
          { key: 'week', label: t('Week') },
        ]}
        value={kind}
        onChange={(k) => {
          haptic.tick();
          setKind(k);
        }}
      />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View ref={card} collapsable={false} style={{ width: cardW, height: cardH, borderRadius: 24, overflow: 'hidden' }}>
          {kind === 'streak' && habitId ? <StreakCard habitId={habitId} w={cardW} /> : kind === 'today' ? <TodayCard w={cardW} /> : <WeekCard w={cardW} />}
        </View>
      </View>

      {kind === 'streak' && live.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {live.slice(0, 8).map((h) => (
            <PressableScale key={h.id} silent onPress={() => (haptic.tick(), setHabitId(h.id))}>
              <View style={{ width: 40, height: 40, borderRadius: 13, overflow: 'hidden', borderWidth: 2, borderColor: h.id === habitId ? '#FFFFFF' : 'transparent' }}>
                <Image source={getArt(h.artId).thumb} style={{ width: '100%', height: '100%' }} />
              </View>
            </PressableScale>
          ))}
        </View>
      )}

      <Button label={busy ? t('Preparing…') : t('Share')} icon={<Share2 size={18} color="#1C1B22" />} disabled={busy} onPress={share} color="#FFFFFF" />
    </View>
  );
}

/* ------------------------------------------------------------------ */

const S = (w: number) => w / 360; // scale everything off a 360-wide design

function Brand({ w, dark }: { w: number; dark?: boolean }) {
  const s = S(w);
  return (
    <Txt variant="label" color={dark ? 'rgba(28,27,34,0.55)' : 'rgba(255,255,255,0.75)'} style={{ fontSize: 12 * s, letterSpacing: 1 * s }}>
      {t('HABIT TRACKER')}
    </Txt>
  );
}

function StreakCard({ habitId, w }: { habitId: string; w: number }) {
  const s = S(w);
  const habit = useHabitStore((st) => st.habits.find((h) => h.id === habitId));
  const logs = useHabitStore((st) => st.logs);
  const today = useHabitStore((st) => st.today);
  const weekStart = useHabitStore((st) => st.settings.weekStart);
  if (!habit) return null;
  const art = getArt(habit.artId);
  const c = getTheme(habit.themeId);
  const streak = streakFor(habit, logs, today, weekStart);
  const total = Object.values(logs).reduce((sum, d) => sum + (d[habit.id]?.value ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: art.bg }}>
      <Image source={art.source} resizeMode="cover" style={{ width: w, height: w * 1.05 }} />
      <LinearGradient colors={[`${art.bg}00`, art.bg]} style={{ position: 'absolute', top: w * 0.75, left: 0, right: 0, height: w * 0.3 }} />
      <View style={{ position: 'absolute', top: 18 * s, left: 20 * s }}>
        <Brand w={w} dark />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 24 * s, paddingBottom: 26 * s, justifyContent: 'flex-end', gap: 6 * s }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * s }}>
          <Flame size={34 * s} color="#FF7A2F" fill="#FF7A2F" />
          <Txt variant="display" color="#1C1B22" style={{ fontSize: 64 * s, lineHeight: 70 * s, fontFamily: fonts.extrabold }}>
            {streak.current}
          </Txt>
        </View>
        <Txt variant="h2" color="#1C1B22" style={{ fontSize: 22 * s }}>
          {streak.unit === 'week' ? t('week streak of {habit}', { habit: habit.title }) : t('day streak of {habit}', { habit: habit.title })}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10 * s, marginTop: 10 * s }}>
          <Pill s={s} label={t('Best')} value={`${streak.best}`} accent={c.accent} />
          <Pill s={s} label={t('All time')} value={qty(total, habit.unit)} accent={c.accent} />
        </View>
      </View>
    </View>
  );
}

function TodayCard({ w }: { w: number }) {
  const s = S(w);
  const habits = useHabitStore((st) => st.habits);
  const logs = useHabitStore((st) => st.logs);
  const today = useHabitStore((st) => st.today);
  const name = useHabitStore((st) => st.profile.name);
  const due = dueOn(habits, today);
  const done = due.filter((h) => isDoneOn(h, logs, today)).length;
  const d = fromKey(today);

  return (
    <LinearGradient colors={['#6CC3F7', '#5E8BF5', '#9A72F4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 24 * s, gap: 14 * s }}>
      <Brand w={w} />
      <View style={{ marginTop: 16 * s }}>
        <Txt variant="small" color="rgba(255,255,255,0.85)" style={{ fontSize: 15 * s }}>
          {`${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`}
        </Txt>
        <Txt variant="display" color="white" style={{ fontSize: 40 * s, lineHeight: 46 * s }}>
          {done === due.length && due.length ? t('Perfect day') : t('{done} of {total} done', { done, total: due.length })}
        </Txt>
        {name ? (
          <Txt variant="body" color="rgba(255,255,255,0.85)" style={{ fontSize: 15 * s }}>
            {t('by {name}', { name })}
          </Txt>
        ) : null}
      </View>
      <View style={{ gap: 8 * s, marginTop: 6 * s }}>
        {due.slice(0, 6).map((h) => {
          const v = valueOn(logs, today, h.id);
          const ok = v >= h.goalValue;
          return (
            <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 * s, padding: 8 * s, borderRadius: 16 * s, backgroundColor: 'rgba(255,255,255,0.9)' }}>
              <Image source={getArt(h.artId).thumb} style={{ width: 36 * s, height: 36 * s, borderRadius: 10 * s }} />
              <Txt variant="h3" color="#1C1B22" numberOfLines={1} style={{ flex: 1, fontSize: 15 * s }}>
                {h.title}
              </Txt>
              <Txt variant="label" color={ok ? '#1E9E47' : '#8A8A95'} style={{ fontSize: 13 * s }}>
                {ok ? t('Done') : `${fmtNumber(v)}/${fmtNumber(h.goalValue)}`}
              </Txt>
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}

function WeekCard({ w }: { w: number }) {
  const s = S(w);
  const habits = useHabitStore((st) => st.habits);
  const logs = useHabitStore((st) => st.logs);
  const today = useHabitStore((st) => st.today);
  const days = useMemo(() => recentDays(habits.filter((h) => !h.archived), logs, today, 7), [habits, logs, today]);
  const scored = days.filter((d) => d.value !== null);
  const avg = scored.length ? scored.reduce((a, d) => a + (d.value ?? 0), 0) / scored.length : 0;
  const barH = 150 * s;

  return (
    <LinearGradient colors={['#2B2D4A', '#1C1B22']} style={{ flex: 1, padding: 24 * s, gap: 18 * s }}>
      <Brand w={w} />
      <View style={{ marginTop: 16 * s }}>
        <Txt variant="small" color="rgba(255,255,255,0.7)" style={{ fontSize: 15 * s }}>
          {t('My week in habits')}
        </Txt>
        <Txt variant="display" color="white" style={{ fontSize: 56 * s, lineHeight: 62 * s }}>
          {pct(avg)}
        </Txt>
        <Txt variant="body" color="rgba(255,255,255,0.7)" style={{ fontSize: 15 * s }}>
          {t('average completion')}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 * s, height: barH + 24 * s, marginTop: 10 * s }}>
        {days.map((d) => (
          <View key={d.key} style={{ flex: 1, alignItems: 'center', gap: 6 * s }}>
            <View style={{ width: '100%', height: barH, borderRadius: 10 * s, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'flex-end', overflow: 'hidden' }}>
              <LinearGradient colors={['#A3D9FF', '#FF986D']} style={{ height: Math.max(d.value ? 8 * s : 0, (d.value ?? 0) * barH) }} />
            </View>
            <Txt variant="label" color="rgba(255,255,255,0.7)" style={{ fontSize: 12 * s }}>
              {DAY_LETTERS[fromKey(d.key).getDay()]}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * s, marginTop: 'auto' }}>
        <Sparkles size={18 * s} color="#FFD36B" />
        <Txt variant="body" color="white" style={{ fontSize: 15 * s, flex: 1 }}>
          {avg >= 0.8 ? t('Consistency looks good on me.') : t('Showing up, one day at a time.')}
        </Txt>
      </View>
    </LinearGradient>
  );
}

function Pill({ s, label, value, accent }: { s: number; label: string; value: string; accent: string }) {
  return (
    <View style={{ paddingHorizontal: 14 * s, paddingVertical: 10 * s, borderRadius: 16 * s, backgroundColor: 'rgba(255,255,255,0.85)' }}>
      <Txt variant="micro" color="#8A8A95" style={{ fontSize: 10 * s }}>
        {label}
      </Txt>
      <Txt variant="statSmall" color={accent} style={{ fontSize: 18 * s }}>
        {value}
      </Txt>
    </View>
  );
}

import { FlexWidget, ImageWidget, OverlapWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { getArt } from '@/data/art';
import { getTheme } from '@/data/themes';
import type { Habit } from '@/data/types';
import { bestCurrentStreak, dayCompletion, dueOn, valueOn } from '@/logic/habits';
import { fonts } from '@/theme/tokens';
import { shiftKey, DAY_LETTERS, fromKey } from '@/utils/date';
import { fmtNumber, unitFor } from '@/utils/format';
import { t } from '@/i18n/core';
import { completeUri, DARK, knobSvg, LIGHT, rgba, type Palette, type TodayWidgetData } from './TodayWidget';

/** Widget names — must match app.json → react-native-android-widget → widgets[].name. */
export const STREAK_WIDGET = 'StreakWidget';
export const SLEEP_WIDGET = 'SleepWidget';
export const MINI_WIDGET = 'MiniHabit';

const FLAME = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2.5c.6 3.2 4.8 5.6 4.8 10.4A4.8 4.8 0 0 1 12 17.7a4.8 4.8 0 0 1-4.8-4.8c0-2 .9-3.4 2-4.6.2 1.4.9 2.5 2 2.9C11 8.6 11.3 5 12 2.5z" fill="#FF7A2F"/><path d="M12 21.5a4 4 0 0 1-4-4c0-1.7 1.1-2.9 2.2-3.8.1 1.1.7 1.9 1.6 2.2-.2-1.7.3-3.4 1-4.6 1.3 1.6 3.2 3.4 3.2 6.2a4 4 0 0 1-4 4z" fill="#FFB547"/></svg>`;
const MOON = (c: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="${c}"/></svg>`;

const frame = (p: Palette) => ({ width: 'match_parent' as const, height: 'match_parent' as const, borderRadius: 26, backgroundColor: p.bg, padding: 14, flexDirection: 'column' as const });

/* ------------------------------------------------------------------ */
/* Streak — best current streak + this week's dots                     */
/* ------------------------------------------------------------------ */

function StreakBody({ data, p }: { data: TodayWidgetData; p: Palette }) {
  const best = bestCurrentStreak(data.habits, data.logs, data.day, data.weekStart);
  const n = best?.streak.current ?? 0;
  const days = Array.from({ length: 7 }, (_, i) => shiftKey(data.day, i - 6));
  const dot = (k: string) => {
    const f = dayCompletion(data.habits, data.logs, k);
    return f === 1 ? '#FF7A2F' : f && f > 0 ? rgba('#FF7A2F', 0.35) : (p.chip as string);
  };
  return (
    <FlexWidget clickAction="OPEN_APP" style={frame(p)}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
        <SvgWidget svg={FLAME} style={{ width: 20, height: 20 }} />
        <TextWidget text={t('Streak')} style={{ fontSize: 13, fontFamily: fonts.bold, color: p.sub }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', flexGap: 4 }}>
          <TextWidget text={`${n}`} style={{ fontSize: 44, fontFamily: fonts.extrabold, color: p.title }} />
          <TextWidget text={n === 1 ? t('day') : t('days')} style={{ fontSize: 14, fontFamily: fonts.semibold, color: p.sub, marginBottom: 9 }} />
        </FlexWidget>
        <TextWidget
          text={n > 0 && best ? best.habit.title : t('Start a streak today')}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 12.5, fontFamily: fonts.medium, color: p.sub }}
        />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((k) => (
          <FlexWidget key={k} style={{ flexDirection: 'column', alignItems: 'center', flexGap: 3 }}>
            <FlexWidget style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dot(k) as ColorProp }} />
            <TextWidget text={t(DAY_LETTERS[fromKey(k).getDay()])} style={{ fontSize: 9, fontFamily: fonts.semibold, color: p.sub }} />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

export function renderStreakWidget(data: TodayWidgetData) {
  return { light: <StreakBody data={data} p={LIGHT} />, dark: <StreakBody data={data} p={DARK} /> };
}

/* ------------------------------------------------------------------ */
/* Sleep — last night + the week as bars                               */
/* ------------------------------------------------------------------ */

const HOURS = ['hours', 'hour', 'hrs', 'hr', 'h'];

/** The habit that holds sleep hours: phone sleep or Health Connect sleep first. */
export function sleepHabit(habits: Habit[]): Habit | undefined {
  const live = habits.filter((h) => !h.archived && HOURS.includes(h.unit.toLowerCase()));
  return live.find((h) => h.phoneSleep) ?? live.find((h) => h.sync === 'sleep-h') ?? live.find((h) => h.artId === 'aura-moon' || /sleep|नींद/i.test(h.title));
}

function SleepBody({ data, width, p }: { data: TodayWidgetData; width: number; p: Palette }) {
  const purple = '#8E7CF5';
  const h = sleepHabit(data.habits);
  if (!h) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ ...frame(p), justifyContent: 'center' }}>
        <SvgWidget svg={MOON(purple)} style={{ width: 26, height: 26 }} />
        <TextWidget text={t('Track your sleep')} style={{ fontSize: 15, fontFamily: fonts.bold, color: p.title, marginTop: 8 }} />
        <TextWidget text={t('Add a “Sleep 8 Hours” habit, then turn on sleep tracking.')} maxLines={3} style={{ fontSize: 12, fontFamily: fonts.medium, color: p.sub, marginTop: 2 }} />
      </FlexWidget>
    );
  }
  const keys = Array.from({ length: 7 }, (_, i) => shiftKey(data.day, i - 6));
  const vals = keys.map((k) => valueOn(data.logs, k, h.id));
  const last = vals[6];
  const logged = vals.filter((v) => v > 0);
  const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0;
  const top = Math.max(h.goalValue, ...vals, 1);
  const barH = 34;
  const wide = width >= 200;
  return (
    <FlexWidget clickAction="OPEN_APP" style={frame(p)}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
        <SvgWidget svg={MOON(purple)} style={{ width: 18, height: 18 }} />
        <TextWidget text={t('Last night')} style={{ fontSize: 13, fontFamily: fonts.bold, color: p.sub }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', flexGap: 4 }}>
          <TextWidget text={last > 0 ? fmtNumber(last) : '–'} style={{ fontSize: 40, fontFamily: fonts.extrabold, color: p.title }} />
          <TextWidget text={t('h')} style={{ fontSize: 15, fontFamily: fonts.semibold, color: p.sub, marginBottom: 8 }} />
        </FlexWidget>
        <TextWidget
          text={wide && avg > 0 ? t('Goal {goal} h · avg {avg} h', { goal: fmtNumber(h.goalValue), avg: fmtNumber(avg) }) : t('Goal {goal} h', { goal: fmtNumber(h.goalValue) })}
          maxLines={1}
          style={{ fontSize: 12, fontFamily: fonts.medium, color: p.sub }}
        />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', height: barH, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {vals.map((v, i) => (
          <FlexWidget
            key={keys[i]}
            style={{
              width: 12,
              height: Math.max(4, Math.round((v / top) * barH)),
              borderRadius: 4,
              backgroundColor: (v >= h.goalValue ? purple : v > 0 ? rgba(purple, 0.45) : p.chip) as ColorProp,
            }}
          />
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

export function renderSleepWidget(data: TodayWidgetData, width: number) {
  return { light: <SleepBody data={data} width={width} p={LIGHT} />, dark: <SleepBody data={data} width={width} p={DARK} /> };
}

/* ------------------------------------------------------------------ */
/* Mini card — 2×2: art, progress, +step and slide                     */
/* ------------------------------------------------------------------ */

function MiniBody({ data, habitId, width, height, p }: { data: TodayWidgetData; habitId: string | null; width: number; height: number; p: Palette }) {
  const due = dueOn(data.habits, data.day);
  if (!due.length) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ ...frame(p), justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget text={t('Nothing due today')} style={{ fontSize: 14, fontFamily: fonts.bold, color: p.title }} />
      </FlexWidget>
    );
  }
  const h = due.find((x) => x.id === habitId) ?? due[0];
  const v = valueOn(data.logs, data.day, h.id);
  const done = v >= h.goalValue;
  const c = getTheme(h.themeId);
  const art = getArt(h.artId);
  const pad = 8;
  const innerW = Math.max(80, width - pad * 2);
  const barH = 44;
  const imgH = Math.max(50, height - pad * 2 - barH - 6);
  const frac = Math.min(1, h.goalValue ? v / h.goalValue : 0);

  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', borderRadius: 26, backgroundColor: p.bg, padding: pad, flexDirection: 'column' }}>
      <OverlapWidget style={{ width: innerW, height: imgH }} clickAction={done ? 'OPEN_APP' : 'OPEN_URI'} clickActionData={done ? undefined : { uri: completeUri(h.id) }}>
        <ImageWidget image={art.thumb as number} imageWidth={innerW} imageHeight={imgH} radius={18} resizeMode="cover" />
        <FlexWidget style={{ width: innerW, height: imgH, padding: 7, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <TextWidget
            text={done ? t('Done') : `${fmtNumber(v)}/${fmtNumber(h.goalValue)}`}
            style={{ fontSize: 11, fontFamily: fonts.bold, color: done ? '#1E9E47' : '#1C1B22', backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}
          />
          {due.length > 1 ? (
            <TextWidget
              text="›"
              clickAction="NEXT"
              clickActionData={{ id: h.id }}
              accessibilityLabel={t('Next habit')}
              style={{ fontSize: 15, fontFamily: fonts.bold, color: '#1C1B22', backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 11, paddingHorizontal: 8, paddingVertical: 1 }}
            />
          ) : (
            <FlexWidget style={{ width: 1, height: 1 }} />
          )}
        </FlexWidget>
      </OverlapWidget>

      <FlexWidget style={{ width: 'match_parent', height: barH, marginTop: 6, flexDirection: 'row', alignItems: 'center', flexGap: 6, paddingLeft: 4 }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }} clickAction="OPEN_APP">
          <TextWidget text={h.title} maxLines={1} truncate="END" style={{ fontSize: 13.5, fontFamily: fonts.bold, color: p.title }} />
          <FlexWidget style={{ width: 'match_parent', height: 4, borderRadius: 2, backgroundColor: p.chip, marginTop: 5 }}>
            <FlexWidget style={{ width: Math.max(frac > 0 ? 4 : 0, Math.round((innerW - 60) * frac)), height: 4, borderRadius: 2, backgroundColor: (done ? '#34C759' : c.accent) as ColorProp }} />
          </FlexWidget>
        </FlexWidget>
        {done ? (
          <SvgWidget svg={knobSvg(34, true, p)} style={{ width: 34, height: 34 }} />
        ) : (
          <TextWidget
            text={`+${fmtNumber(h.step)}`}
            clickAction="ADD"
            clickActionData={{ id: h.id }}
            accessibilityLabel={t('Add {amount}', { amount: `${fmtNumber(h.step)} ${unitFor(h.step, h.unit)}` })}
            style={{ fontSize: 13, fontFamily: fonts.bold, color: c.accent as ColorProp, backgroundColor: rgba(c.accent, 0.14), borderRadius: 17, paddingHorizontal: 10, paddingVertical: 8 }}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

export function renderMiniWidget(data: TodayWidgetData, habitId: string | null, width: number, height: number) {
  return {
    light: <MiniBody data={data} habitId={habitId} width={width} height={height} p={LIGHT} />,
    dark: <MiniBody data={data} habitId={habitId} width={width} height={height} p={DARK} />,
  };
}

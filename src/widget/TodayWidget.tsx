import { FlexWidget, ImageWidget, ListWidget, OverlapWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { getArt } from '@/data/art';
import { getTheme } from '@/data/themes';
import type { Habit, Logs } from '@/data/types';
import { dueOn, valueOn } from '@/logic/habits';
import { fonts } from '@/theme/tokens';
import { hexToRgba } from '@/theme/color';
import { relativeDayLabel } from '@/utils/date';
import { fmtNumber, qty } from '@/utils/format';
import { t } from '@/i18n/core';


/** Widget names — must match app.json → react-native-android-widget → widgets[].name. */
export const LIST_WIDGET = 'TodayHabits';
export const CARD_WIDGET = 'HabitCard';
/** @deprecated kept for older imports */
export const WIDGET_NAME = LIST_WIDGET;

export interface TodayWidgetData {
  habits: Habit[];
  logs: Logs;
  day: string;
  name: string;
  weekStart: 0 | 1;
}

/* ------------------------------------------------------------------ */
/* Look: calm, warm neutrals with one accent — clean like system widgets */
/* ------------------------------------------------------------------ */

export interface Palette {
  bg: ColorProp;
  surface: ColorProp;
  chip: ColorProp;
  title: ColorProp;
  sub: ColorProp;
  accent: ColorProp;
  knob: string;
  knobTick: string;
}

export const LIGHT: Palette = {
  bg: '#F3F1EC',
  surface: '#FFFFFF',
  chip: '#E8E5DF',
  title: '#1C1B22',
  sub: '#8A8A95',
  accent: '#4C8DF6',
  knob: '#FFFFFF',
  knobTick: '#9A9AA4',
};

export const DARK: Palette = {
  bg: '#1F1F23',
  surface: '#2B2B30',
  chip: '#36363C',
  title: '#F5F5F7',
  sub: '#A1A1AA',
  accent: '#6EA4FF',
  knob: '#FFFFFF',
  knobTick: '#9A9AA4',
};

const SUCCESS = '#34C759';
export const rgba = (hex: string, a: number) => hexToRgba(hex, a) as ColorProp;
export const completeUri = (id: string) => `habittracker://complete/${id}`;

export function knobSvg(size: number, done: boolean, p: Palette): string {
  const r = size / 2;
  const s = size / 40;
  return done
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="${SUCCESS}"/><path d="M${12.5 * s} ${20.5 * s}l${5 * s} ${5 * s} ${10 * s} -${10.5 * s}" fill="none" stroke="#FFFFFF" stroke-width="${3 * s}" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="${p.knob}"/><path d="M${13 * s} ${20.5 * s}l${4.5 * s} ${4.5 * s} ${9 * s} -${9.5 * s}" fill="none" stroke="${p.knobTick}" stroke-width="${2.6 * s}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const chevrons = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M6 5l7 7-7 7M13 5l7 7-7 7" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const arrow = (dir: 'left' | 'right', color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="${dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function ringSvg(frac: number, label: string, color: string, track: string): string {
  const r = 19;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(1, frac)) * c).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="${r}" fill="none" stroke="${track}" stroke-width="5"/><circle cx="24" cy="24" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${dash} ${c.toFixed(2)}" transform="rotate(-90 24 24)"/><text x="24" y="28.5" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="12.5" fill="${color}">${label}</text></svg>`;
}

/** The app's slide control, drawn for a widget. Tapping it opens the real slider. */
function SlidePill({ h, done, height, p }: { h: Habit; done: boolean; height: number; p: Palette }) {
  const knob = height - 10;
  if (done) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          width: 'match_parent',
          height,
          borderRadius: height / 2,
          backgroundColor: rgba(SUCCESS, 0.14),
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 18,
          paddingRight: 5,
        }}
      >
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget text={h.doneLabel} maxLines={1} truncate="END" style={{ fontSize: 14, fontFamily: fonts.semibold, color: '#1E9E47' }} />
        </FlexWidget>
        <SvgWidget svg={knobSvg(knob, true, p)} style={{ width: knob, height: knob }} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: completeUri(h.id) }}
      accessibilityLabel={t('Slide to complete {habit}', { habit: h.title })}
      style={{
        width: 'match_parent',
        height,
        borderRadius: height / 2,
        backgroundColor: p.chip,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 5,
        paddingRight: 14,
        flexGap: 12,
      }}
    >
      <SvgWidget svg={knobSvg(knob, false, p)} style={{ width: knob, height: knob }} />
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget text={t('Slide when you’re done')} maxLines={1} style={{ fontSize: 14.5, fontFamily: fonts.semibold, color: p.title }} />
      </FlexWidget>
      <SvgWidget svg={chevrons(p.sub as string)} style={{ width: 18, height: 18 }} />
    </FlexWidget>
  );
}

/* ------------------------------------------------------------------ */
/* Card widget — one habit, like the app's card                        */
/* ------------------------------------------------------------------ */

function CardBody({ data, habitId, width, height, p }: { data: TodayWidgetData; habitId: string | null; width: number; height: number; p: Palette }) {
  const due = dueOn(data.habits, data.day);
  const pad = 12;
  const innerW = Math.max(120, width - pad * 2);

  if (!due.length) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ width: 'match_parent', height: 'match_parent', borderRadius: 28, backgroundColor: p.bg, padding: 20, justifyContent: 'center', alignItems: 'center' }}
      >
        <TextWidget text={t('Nothing due today')} style={{ fontSize: 17, fontFamily: fonts.bold, color: p.title }} />
        <TextWidget text={t('Tap to add a habit')} style={{ fontSize: 13, fontFamily: fonts.medium, color: p.sub, marginTop: 4 }} />
      </FlexWidget>
    );
  }

  const idx = Math.max(0, due.findIndex((h) => h.id === habitId));
  const h = due[idx];
  const v = valueOn(data.logs, data.day, h.id);
  const done = v >= h.goalValue;
  const c = getTheme(h.themeId);
  const art = getArt(h.artId);
  const doneCount = due.filter((x) => valueOn(data.logs, data.day, x.id) >= x.goalValue).length;

  const pillH = 50;
  const infoH = 50;
  const gaps = 10 * 2;
  const imgH = Math.max(70, height - pad * 2 - pillH - infoH - gaps);

  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', borderRadius: 28, backgroundColor: p.bg, padding: pad, flexDirection: 'column' }}>
      <OverlapWidget style={{ width: innerW, height: imgH }} clickAction="OPEN_APP">
        <ImageWidget image={art.source as number} imageWidth={innerW} imageHeight={imgH} radius={20} resizeMode="cover" />
        <FlexWidget style={{ width: innerW, height: imgH, padding: 10, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <TextWidget
            text={t('{done}/{total} today', { done: doneCount, total: due.length })}
            style={{ fontSize: 11.5, fontFamily: fonts.bold, color: '#1C1B22', backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }}
          />
        </FlexWidget>
      </OverlapWidget>

      <FlexWidget style={{ width: 'match_parent', height: infoH, flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 10, paddingHorizontal: 4 }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }} clickAction="OPEN_APP">
          <TextWidget text={h.title} maxLines={1} truncate="END" style={{ fontSize: 17, fontFamily: fonts.bold, color: p.title }} />
          <TextWidget
            text={`${fmtNumber(v)} / ${qty(h.goalValue, h.unit)}`}
            maxLines={1}
            style={{ fontSize: 12.5, fontFamily: fonts.medium, color: c.accent as ColorProp }}
          />
        </FlexWidget>
        {due.length > 1 && (
          <FlexWidget style={{ flexDirection: 'row', flexGap: 8 }}>
            <FlexWidget
              clickAction="PREV"
              clickActionData={{ id: h.id }}
              accessibilityLabel={t('Previous habit')}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: p.chip, justifyContent: 'center', alignItems: 'center' }}
            >
              <SvgWidget svg={arrow('left', p.title as string)} style={{ width: 18, height: 18 }} />
            </FlexWidget>
            <FlexWidget
              clickAction="NEXT"
              clickActionData={{ id: h.id }}
              accessibilityLabel={t('Next habit')}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: p.chip, justifyContent: 'center', alignItems: 'center' }}
            >
              <SvgWidget svg={arrow('right', p.title as string)} style={{ width: 18, height: 18 }} />
            </FlexWidget>
          </FlexWidget>
        )}
      </FlexWidget>

      <SlidePill h={h} done={done} height={pillH} p={p} />
    </FlexWidget>
  );
}

export function renderCardWidget(data: TodayWidgetData, habitId: string | null, width: number, height: number) {
  return {
    light: <CardBody data={data} habitId={habitId} width={width} height={height} p={LIGHT} />,
    dark: <CardBody data={data} habitId={habitId} width={width} height={height} p={DARK} />,
  };
}

/* ------------------------------------------------------------------ */
/* List widget — all of today's habits                                 */
/* ------------------------------------------------------------------ */

function Row({ h, value, p }: { h: Habit; value: number; p: Palette }) {
  const c = getTheme(h.themeId);
  const art = getArt(h.artId);
  const done = value >= h.goalValue;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 12, padding: 8, paddingRight: 10, marginBottom: 8, borderRadius: 22, backgroundColor: p.surface }}
    >
      <ImageWidget image={art.thumb as number} imageWidth={44} imageHeight={44} radius={14} resizeMode="cover" />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget text={h.title} maxLines={1} truncate="END" style={{ fontSize: 14.5, fontFamily: fonts.bold, color: p.title }} />
        <TextWidget text={`${fmtNumber(value)} / ${qty(h.goalValue, h.unit)}`} maxLines={1} style={{ fontSize: 12, fontFamily: fonts.medium, color: p.sub }} />
      </FlexWidget>
      {done ? (
        <SvgWidget svg={knobSvg(36, true, p)} accessibilityLabel={`${h.title} done`} style={{ width: 36, height: 36 }} />
      ) : (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
          <TextWidget
            text={`+${fmtNumber(h.step)}`}
            clickAction="ADD"
            clickActionData={{ id: h.id }}
            accessibilityLabel={`Add ${qty(h.step, h.unit)} to ${h.title}`}
            style={{ fontSize: 13, fontFamily: fonts.bold, color: c.accent as ColorProp, backgroundColor: rgba(c.accent, 0.13), borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 }}
          />
          {/* Mini slider — opens the real slide-to-complete */}
          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: completeUri(h.id) }}
            accessibilityLabel={t('Slide to complete {habit}', { habit: h.title })}
            style={{ width: 68, height: 36, borderRadius: 18, backgroundColor: p.chip, flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 8 }}
          >
            <SvgWidget svg={knobSvg(28, false, p)} style={{ width: 28, height: 28 }} />
            <SvgWidget svg={chevrons(p.sub as string)} style={{ width: 16, height: 16, marginLeft: 8 }} />
          </FlexWidget>
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

function ListBody({ data, width, height, p }: { data: TodayWidgetData; width: number; height: number; p: Palette }) {
  const due = dueOn(data.habits, data.day);
  const values = due.map((h) => valueOn(data.logs, data.day, h.id));
  const doneCount = due.filter((h, i) => values[i] >= h.goalValue).length;
  const frac = due.length ? doneCount / due.length : 0;
  const pad = 16;
  const innerW = Math.max(60, width - pad * 2);
  const headerH = 50 + 8 + 5 + 14;
  const listH = Math.max(48, height - pad * 2 - headerH);
  const left = due.length - doneCount;

  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', padding: pad, borderRadius: 28, backgroundColor: p.bg }}>
      <FlexWidget clickAction="OPEN_APP" style={{ width: 'match_parent', height: 50, flexDirection: 'row', alignItems: 'center', flexGap: 10 }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={relativeDayLabel(data.day)} style={{ fontSize: 19, fontFamily: fonts.extrabold, color: p.title }} />
          <TextWidget
            text={due.length === 0 ? t('Nothing scheduled') : left === 0 ? t('Perfect day, all done') : `${left === 1 ? t('1 habit to go') : t('{n} habits to go', { n: left })}${data.name ? `, ${data.name}` : ''}`}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 12.5, fontFamily: fonts.medium, color: p.sub }}
          />
        </FlexWidget>
        <SvgWidget svg={ringSvg(frac, `${doneCount}/${due.length}`, p.accent as string, p.chip as string)} style={{ width: 46, height: 46 }} />
      </FlexWidget>

      <FlexWidget style={{ width: innerW, height: 5, borderRadius: 3, backgroundColor: p.chip, marginTop: 8, marginBottom: 14 }}>
        <FlexWidget style={{ width: Math.max(frac > 0 ? 6 : 0, Math.round(innerW * frac)), height: 5, borderRadius: 3, backgroundColor: p.accent }} />
      </FlexWidget>

      {due.length === 0 ? (
        <TextWidget text={t('Tap to plan your day')} clickAction="OPEN_APP" style={{ fontSize: 14, fontFamily: fonts.semibold, color: p.title }} />
      ) : (
        <ListWidget style={{ width: 'match_parent', height: listH }}>
          {due.map((h, i) => (
            <Row key={h.id} h={h} value={values[i]} p={p} />
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
}

export function renderTodayWidget(data: TodayWidgetData, width: number, height: number) {
  return {
    light: <ListBody data={data} width={width} height={height} p={LIGHT} />,
    dark: <ListBody data={data} width={width} height={height} p={DARK} />,
  };
}

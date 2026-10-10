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

/** Widget names: must match app.json → react-native-android-widget → widgets[].name. */
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
  /** Habit waiting for its second "complete" tap (widgets can't swipe, so they confirm instead). */
  confirmId?: string | null;
  /** Free week over without Pro: taps open the paywall instead of logging. */
  locked?: boolean;
}

/* ------------------------------------------------------------------ */
/* Look: calm, warm neutrals with one accent, clean like system widgets */
/* ------------------------------------------------------------------ */

export interface Palette {
  bg: ColorProp;
  surface: ColorProp;
  chip: ColorProp;
  /** Round buttons: a step lighter than surface so they read on every wallpaper. */
  button: ColorProp;
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
  button: '#FFFFFF',
  title: '#1C1B22',
  sub: '#7C7C88',
  accent: '#4C8DF6',
  knob: '#FFFFFF',
  knobTick: '#9A9AA4',
};

export const DARK: Palette = {
  bg: '#1F1F23',
  surface: '#2B2B30',
  chip: '#36363C',
  button: '#45454D',
  title: '#F5F5F7',
  sub: '#A1A1AA',
  accent: '#6EA4FF',
  knob: '#FFFFFF',
  knobTick: '#9A9AA4',
};

export const SUCCESS = '#34C759';
const SUCCESS_TEXT = '#1E9E47';
export const rgba = (hex: string, a: number) => hexToRgba(hex, a) as ColorProp;
/** Opens the paywall (used for taps once the free week is over). */
export const PAYWALL_URI = 'habittracker://paywall';

export function knobSvg(size: number, done: boolean, p: Palette): string {
  const r = size / 2;
  const s = size / 40;
  return done
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="${SUCCESS}"/><path d="M${12.5 * s} ${20.5 * s}l${5 * s} ${5 * s} ${10 * s} -${10.5 * s}" fill="none" stroke="#FFFFFF" stroke-width="${3 * s}" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="${p.knob}"/><path d="M${13 * s} ${20.5 * s}l${4.5 * s} ${4.5 * s} ${9 * s} -${9.5 * s}" fill="none" stroke="${p.knobTick}" stroke-width="${2.6 * s}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** A tick in a filled circle (confirm state). */
const tickSvg = (size: number, fill: string, stroke: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${fill}"/><path d="M12.5 20.5l5 5 10-10.5" fill="none" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const arrowSvg = (dir: 'left' | 'right', color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="${dir === 'left' ? 'M14.5 6l-6 6 6 6' : 'M9.5 6l6 6-6 6'}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function ringSvg(frac: number, label: string, color: string, track: string): string {
  const r = 19;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(1, frac)) * c).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="${r}" fill="none" stroke="${track}" stroke-width="5"/><circle cx="24" cy="24" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${dash} ${c.toFixed(2)}" transform="rotate(-90 24 24)"/><text x="24" y="28.5" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="12.5" fill="${color}">${label}</text></svg>`;
}

/** Click props for "complete this habit" (two taps), or the paywall when locked. */
export function completeClick(id: string, locked?: boolean) {
  return locked ? { clickAction: 'OPEN_URI', clickActionData: { uri: PAYWALL_URI } } : { clickAction: 'DONE', clickActionData: { id } };
}

/** Click props for "+step", or the paywall when locked. */
export function addClick(id: string, locked?: boolean) {
  return locked ? { clickAction: 'OPEN_URI', clickActionData: { uri: PAYWALL_URI } } : { clickAction: 'ADD', clickActionData: { id } };
}

/** A round button with an arrow (switch habit). Big enough to hit, visible on any wallpaper. */
export function ArrowButton({ dir, id, size, p, onImage }: { dir: 'left' | 'right'; id: string; size: number; p: Palette; onImage?: boolean }) {
  const icon = Math.round(size * 0.55);
  return (
    <FlexWidget
      clickAction={dir === 'left' ? 'PREV' : 'NEXT'}
      clickActionData={{ id }}
      accessibilityLabel={dir === 'left' ? t('Previous habit') : t('Next habit')}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: onImage ? 'rgba(255, 255, 255, 0.94)' : p.button,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <SvgWidget svg={arrowSvg(dir, onImage ? '#1C1B22' : (p.title as string))} style={{ width: icon, height: icon }} />
    </FlexWidget>
  );
}

/** "+1 glass" pill. */
export function AddPill({ h, size, locked }: { h: Habit; size: number; locked?: boolean }) {
  const c = getTheme(h.themeId);
  return (
    <FlexWidget
      {...addClick(h.id, locked)}
      accessibilityLabel={`Add ${qty(h.step, h.unit)} to ${h.title}`}
      style={{ height: size, paddingHorizontal: 12, borderRadius: size / 2, backgroundColor: rgba(c.accent, 0.16), justifyContent: 'center', alignItems: 'center' }}
    >
      <TextWidget text={`+${fmtNumber(h.step)}`} style={{ fontSize: 14, fontFamily: fonts.bold, color: c.accent as ColorProp }} />
    </FlexWidget>
  );
}

/** Round complete button for rows: tap, then tap again to confirm. */
export function CheckButton({ h, done, confirm, size, p, locked }: { h: Habit; done: boolean; confirm: boolean; size: number; p: Palette; locked?: boolean }) {
  if (done) return <SvgWidget svg={knobSvg(size, true, p)} accessibilityLabel={t('{habit} done', { habit: h.title })} style={{ width: size, height: size }} />;
  return (
    <FlexWidget
      {...completeClick(h.id, locked)}
      accessibilityLabel={confirm ? t('Tap again to complete {habit}', { habit: h.title }) : t('Complete {habit}', { habit: h.title })}
      style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}
    >
      <SvgWidget svg={confirm ? tickSvg(size, SUCCESS, '#FFFFFF') : tickSvg(size, p.button as string, p.sub as string)} style={{ width: size, height: size }} />
    </FlexWidget>
  );
}

/** The big complete control for the card widget. Replaces the app's slider (widgets can't swipe). */
function CompleteBar({ h, done, confirm, height, p, locked }: { h: Habit; done: boolean; confirm: boolean; height: number; p: Palette; locked?: boolean }) {
  const knob = height - 12;
  if (done) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ width: 'match_parent', height, borderRadius: height / 2, backgroundColor: rgba(SUCCESS, 0.16), flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingRight: 18, flexGap: 12 }}
      >
        <SvgWidget svg={knobSvg(knob, true, p)} style={{ width: knob, height: knob }} />
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget text={h.doneLabel || t('Done!')} maxLines={1} truncate="END" style={{ fontSize: 15, fontFamily: fonts.bold, color: SUCCESS_TEXT }} />
        </FlexWidget>
      </FlexWidget>
    );
  }
  return (
    <FlexWidget
      {...completeClick(h.id, locked)}
      accessibilityLabel={confirm ? t('Tap again to complete {habit}', { habit: h.title }) : t('Complete {habit}', { habit: h.title })}
      style={{
        width: 'match_parent',
        height,
        borderRadius: height / 2,
        backgroundColor: confirm ? SUCCESS : p.chip,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 6,
        paddingRight: 18,
        flexGap: 12,
      }}
    >
      <SvgWidget svg={confirm ? tickSvg(knob, '#FFFFFF', SUCCESS) : knobSvg(knob, false, p)} style={{ width: knob, height: knob }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text={confirm ? t('Tap again to confirm') : t('Tap when you’re done')}
          maxLines={1}
          style={{ fontSize: 15.5, fontFamily: fonts.bold, color: confirm ? '#FFFFFF' : p.title }}
        />
        {confirm ? null : <TextWidget text={t('Marks {habit} complete', { habit: h.title })} maxLines={1} truncate="END" style={{ fontSize: 11.5, fontFamily: fonts.medium, color: p.sub }} />}
      </FlexWidget>
    </FlexWidget>
  );
}

/* ------------------------------------------------------------------ */
/* Card widget: one habit, like the app's card                          */
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

  const barH = 58;
  const infoH = 48;
  const gap = 10;
  const imgH = Math.max(60, height - pad * 2 - barH - infoH - gap * 2);
  const showImage = height >= 200;

  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', borderRadius: 28, backgroundColor: p.bg, padding: pad, flexDirection: 'column', justifyContent: 'space-between' }}>
      {showImage ? (
        <OverlapWidget style={{ width: innerW, height: imgH }} clickAction="OPEN_APP">
          <ImageWidget image={art.source as number} imageWidth={innerW} imageHeight={imgH} radius={20} resizeMode="cover" />
          <FlexWidget style={{ width: innerW, height: imgH, padding: 10, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TextWidget
              text={t('{done}/{total} today', { done: doneCount, total: due.length })}
              style={{ fontSize: 11.5, fontFamily: fonts.bold, color: '#1C1B22', backgroundColor: 'rgba(255, 255, 255, 0.94)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}
            />
          </FlexWidget>
        </OverlapWidget>
      ) : null}

      <FlexWidget style={{ width: 'match_parent', height: infoH, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, flexGap: 8 }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }} clickAction="OPEN_APP">
          <TextWidget text={h.title} maxLines={1} truncate="END" style={{ fontSize: 17, fontFamily: fonts.bold, color: p.title }} />
          <TextWidget text={`${fmtNumber(v)} / ${qty(h.goalValue, h.unit)}`} maxLines={1} style={{ fontSize: 12.5, fontFamily: fonts.semibold, color: c.accent as ColorProp }} />
        </FlexWidget>
        {!done && h.step < h.goalValue ? <AddPill h={h} size={40} locked={data.locked} /> : null}
        {due.length > 1 ? <ArrowButton dir="left" id={h.id} size={40} p={p} /> : null}
        {due.length > 1 ? <ArrowButton dir="right" id={h.id} size={40} p={p} /> : null}
      </FlexWidget>

      <CompleteBar h={h} done={done} confirm={data.confirmId === h.id} height={barH} p={p} locked={data.locked} />
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
/* List widget: all of today's habits                                   */
/* ------------------------------------------------------------------ */

const ROW_H = 62;
const ROW_GAP = 10;

function Row({ h, value, p, confirm, locked }: { h: Habit; value: number; p: Palette; confirm: boolean; locked?: boolean }) {
  const art = getArt(h.artId);
  const done = value >= h.goalValue;
  return (
    // ListWidget drops item margins, so the gap is padding on a wrapper.
    <FlexWidget style={{ width: 'match_parent', paddingBottom: ROW_GAP }}>
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ width: 'match_parent', height: ROW_H, flexDirection: 'row', alignItems: 'center', flexGap: 12, paddingLeft: 9, paddingRight: 9, borderRadius: 20, backgroundColor: p.surface }}
      >
        <ImageWidget image={art.thumb as number} imageWidth={44} imageHeight={44} radius={14} resizeMode="cover" />
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={h.title} maxLines={1} truncate="END" style={{ fontSize: 14.5, fontFamily: fonts.bold, color: p.title }} />
          <TextWidget text={`${fmtNumber(value)} / ${qty(h.goalValue, h.unit)}`} maxLines={1} style={{ fontSize: 12, fontFamily: fonts.medium, color: p.sub, marginTop: 1 }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
          {!done && h.step < h.goalValue ? <AddPill h={h} size={40} locked={locked} /> : null}
          <CheckButton h={h} done={done} confirm={confirm} size={40} p={p} locked={locked} />
        </FlexWidget>
      </FlexWidget>
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
  const headerH = 50 + 10 + 5 + 14;
  const listH = Math.max(ROW_H, height - pad * 2 - headerH);
  const left = due.length - doneCount;
  const fits = due.length * (ROW_H + ROW_GAP) <= listH + ROW_GAP;

  const rows = due.map((h, i) => <Row key={h.id} h={h} value={values[i]} p={p} confirm={data.confirmId === h.id} locked={data.locked} />);

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

      <FlexWidget style={{ width: innerW, height: 5, borderRadius: 3, backgroundColor: p.chip, marginTop: 10, marginBottom: 14 }}>
        <FlexWidget style={{ width: Math.max(frac > 0 ? 6 : 0, Math.round(innerW * frac)), height: 5, borderRadius: 3, backgroundColor: p.accent }} />
      </FlexWidget>

      {due.length === 0 ? (
        <TextWidget text={t('Tap to plan your day')} clickAction="OPEN_APP" style={{ fontSize: 14, fontFamily: fonts.semibold, color: p.title }} />
      ) : fits ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>{rows}</FlexWidget>
      ) : (
        <ListWidget style={{ width: 'match_parent', height: listH }}>{rows}</ListWidget>
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

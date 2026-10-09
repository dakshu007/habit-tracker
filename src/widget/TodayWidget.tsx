import { FlexWidget, ListWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { GLYPH_PATHS } from '@/components/ui/glyphs';
import { getArt } from '@/data/art';
import { getTheme } from '@/data/themes';
import type { Habit, Logs } from '@/data/types';
import { dueOn, valueOn } from '@/logic/habits';
import { fonts } from '@/theme/tokens';
import { hexToRgba } from '@/theme/color';
import { relativeDayLabel } from '@/utils/date';
import { fmtNumber, qty } from '@/utils/format';

export const WIDGET_NAME = 'TodayHabits';

export interface TodayWidgetData {
  habits: Habit[];
  logs: Logs;
  day: string;
  name: string;
}

interface Palette {
  bgFrom: ColorProp;
  bgTo: ColorProp;
  row: ColorProp;
  title: ColorProp;
  sub: ColorProp;
  head: ColorProp;
  headSub: ColorProp;
  track: ColorProp;
  idle: string;
}

const LIGHT: Palette = {
  bgFrom: '#6CC3F7',
  bgTo: '#8E7CF5',
  row: 'rgba(255, 255, 255, 0.93)',
  title: '#1C1B22',
  sub: '#8A8A95',
  head: '#FFFFFF',
  headSub: 'rgba(255, 255, 255, 0.85)',
  track: 'rgba(255, 255, 255, 0.3)',
  idle: '#D5D8DE',
};

const DARK: Palette = {
  bgFrom: '#2B2C3A',
  bgTo: '#1C1B22',
  row: 'rgba(255, 255, 255, 0.08)',
  title: '#FDFDFD',
  sub: '#B0B3B7',
  head: '#FFFFFF',
  headSub: 'rgba(255, 255, 255, 0.7)',
  track: 'rgba(255, 255, 255, 0.14)',
  idle: '#4A4A55',
};

/** Rounded tile with the habit's glyph (aura art) or initial (illustrated art). */
function iconSvg(h: Habit): string {
  const c = getTheme(h.themeId);
  const art = getArt(h.artId);
  const bg = `<rect width="40" height="40" rx="12" fill="${c.accent}" fill-opacity="0.16"/>`;
  if (art.kind === 'aura') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">${bg}<g transform="translate(8 8)"><path d="${GLYPH_PATHS[art.glyph]}" fill="none" stroke="${c.accent}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
  }
  const letter = (h.title.trim()[0] ?? '•').toUpperCase().replace(/[<&>]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">${bg}<text x="20" y="26.5" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="17" fill="${c.accent}">${letter}</text></svg>`;
}

function checkSvg(done: boolean, accent: string, idle: string): string {
  return done
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#34C759"/><path d="M12.5 20.5l5 5 10-10.5" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="${idle}" stroke-width="2.5"/><path d="M13.5 20.5l4.5 4.5 8.5-9" fill="none" stroke="${accent}" stroke-opacity="0.55" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function ringSvg(frac: number, done: number, total: number): string {
  const r = 19;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(1, frac)) * c).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="5"/><circle cx="24" cy="24" r="${r}" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-dasharray="${dash} ${c.toFixed(2)}" transform="rotate(-90 24 24)"/><text x="24" y="28.5" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="13" fill="#FFFFFF">${done}/${total}</text></svg>`;
}

function Row({ h, value, p }: { h: Habit; value: number; p: Palette }) {
  const c = getTheme(h.themeId);
  const done = value >= h.goalValue;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        flexGap: 10,
        padding: 8,
        marginBottom: 7,
        borderRadius: 18,
        backgroundColor: p.row,
      }}
    >
      <SvgWidget svg={iconSvg(h)} style={{ width: 36, height: 36 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget text={h.title} maxLines={1} truncate="END" style={{ fontSize: 14, fontFamily: fonts.bold, color: p.title }} />
        <TextWidget
          text={`${fmtNumber(value)} / ${qty(h.goalValue, h.unit)}`}
          maxLines={1}
          style={{ fontSize: 12, fontFamily: fonts.medium, color: p.sub }}
        />
      </FlexWidget>
      {!done && (
        <TextWidget
          text={`+${fmtNumber(h.step)}`}
          clickAction="ADD"
          clickActionData={{ id: h.id }}
          accessibilityLabel={`Add ${qty(h.step, h.unit)} to ${h.title}`}
          style={{
            fontSize: 13,
            fontFamily: fonts.bold,
            color: c.accent as ColorProp,
            backgroundColor: hexToRgba(c.accent, 0.15) as ColorProp,
            borderRadius: 14,
            paddingHorizontal: 11,
            paddingVertical: 7,
          }}
        />
      )}
      <SvgWidget
        svg={checkSvg(done, c.accent, p.idle)}
        clickAction={done ? 'OPEN_APP' : 'COMPLETE'}
        clickActionData={{ id: h.id }}
        accessibilityLabel={done ? `${h.title} done` : `Complete ${h.title}`}
        style={{ width: 36, height: 36 }}
      />
    </FlexWidget>
  );
}

function Body({ data, width, height, p }: { data: TodayWidgetData; width: number; height: number; p: Palette }) {
  const due = dueOn(data.habits, data.day);
  const values = due.map((h) => valueOn(data.logs, data.day, h.id));
  const doneCount = due.filter((h, i) => values[i] >= h.goalValue).length;
  const frac = due.length ? doneCount / due.length : 0;
  const pad = 14;
  const innerW = Math.max(60, width - pad * 2);
  const listH = Math.max(40, height - pad * 2 - 74);
  const allDone = due.length > 0 && doneCount === due.length;

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        padding: pad,
        borderRadius: 28,
        backgroundGradient: { from: p.bgFrom, to: p.bgTo, orientation: 'TL_BR' },
      }}
    >
      <FlexWidget clickAction="OPEN_APP" style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 10 }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={relativeDayLabel(data.day)} style={{ fontSize: 19, fontFamily: fonts.extrabold, color: p.head }} />
          <TextWidget
            text={
              due.length === 0
                ? 'Nothing scheduled'
                : allDone
                  ? 'Perfect day — all done ✨'
                  : `${due.length - doneCount} ${due.length - doneCount === 1 ? 'habit' : 'habits'} to go${data.name ? `, ${data.name}` : ''}`
            }
            maxLines={1}
            truncate="END"
            style={{ fontSize: 12.5, fontFamily: fonts.medium, color: p.headSub }}
          />
        </FlexWidget>
        <SvgWidget svg={ringSvg(frac, doneCount, due.length)} style={{ width: 46, height: 46 }} />
      </FlexWidget>

      <FlexWidget style={{ width: innerW, height: 5, borderRadius: 3, backgroundColor: p.track, marginTop: 10, marginBottom: 10 }}>
        <FlexWidget style={{ width: Math.max(frac > 0 ? 6 : 0, Math.round(innerW * frac)), height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
      </FlexWidget>

      {due.length === 0 ? (
        <TextWidget
          text="Tap to plan your day"
          clickAction="OPEN_APP"
          style={{ fontSize: 14, fontFamily: fonts.semibold, color: p.head, marginTop: 6 }}
        />
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

/** Light + dark renditions; the launcher picks the one matching system theme. */
export function renderTodayWidget(data: TodayWidgetData, width: number, height: number) {
  return {
    light: <Body data={data} width={width} height={height} p={LIGHT} />,
    dark: <Body data={data} width={width} height={height} p={DARK} />,
  };
}

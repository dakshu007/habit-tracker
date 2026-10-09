import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { useHabitStore } from '@/store/useHabitStore';
import { useRunStore } from '@/store/useRunStore';
import { monthCsv, monthKey, monthReport, type MonthReport } from '@/logic/report';
import { fmtDuration, fmtKm } from '@/logic/run';
import { DAY_LABELS, MONTH_LABELS, fromKey } from '@/utils/date';
import { fmtNumber, unitFor } from '@/utils/format';
import { t } from '@/i18n';

/**
 * Monthly report: a designed PDF (rendered from HTML on the phone) and the raw
 * CSV. Both are built on-device and handed to the share sheet — nothing is uploaded.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pct = (n: number) => `${Math.round(n * 100)}%`;
export const monthLabel = (year: number, month: number) => `${t(MONTH_LABELS[month])} ${year}`;

function heat(frac: number | null, rest: boolean): string {
  if (rest) return '#E6E0FB';
  if (frac === null) return '#F1F3F6';
  if (frac === 0) return '#FDE7E6';
  if (frac < 0.5) return '#CFE6FA';
  if (frac < 1) return '#8CC4EF';
  return '#2F8FDA';
}

function html(r: MonthReport, name: string, weekStart: 0 | 1): string {
  const label = monthLabel(r.year, r.month);
  const first = new Date(r.year, r.month, 1).getDay();
  const lead = (first - weekStart + 7) % 7;
  const total = new Date(r.year, r.month + 1, 0).getDate();
  const byKey = new Map(r.days.map((d) => [d.key, d]));
  const cells: string[] = [];
  for (let i = 0; i < lead; i++) cells.push('<div class="c empty"></div>');
  for (let d = 1; d <= total; d++) {
    const key = `${monthKey(r.year, r.month)}-${`${d}`.padStart(2, '0')}`;
    const day = byKey.get(key);
    const bg = day ? heat(day.frac, day.rest) : '#FAFAFB';
    const fg = day?.frac === 1 ? '#FFFFFF' : '#1C1B22';
    cells.push(`<div class="c" style="background:${bg};color:${fg}">${d}</div>`);
  }
  const heads = [0, 1, 2, 3, 4, 5, 6].map((i) => `<div class="h">${esc(t(DAY_LABELS[(i + weekStart) % 7]))}</div>`).join('');

  const habitRows = r.habits
    .map(
      (h) => `<tr>
        <td class="name">${esc(h.title)}<div class="sub">${esc(t('Goal {goal} {unit}', { goal: fmtNumber(h.goal), unit: unitFor(h.goal, h.unit) }))}</div></td>
        <td class="bar"><div class="track"><div class="fill" style="width:${Math.max(3, h.rate * 100)}%"></div></div></td>
        <td class="num">${h.done}/${h.due}</td>
        <td class="num">${pct(h.rate)}</td>
        <td class="num">${esc(fmtNumber(h.total))} ${esc(unitFor(h.total, h.unit))}</td>
      </tr>`,
    )
    .join('');

  const moodTotal = r.moods.reduce((a, b) => a + b, 0);
  const moodLabels = [t('Low'), t('Okay'), t('Good'), t('Great')];
  const moodColors = ['#8E9BF5', '#B9BCC6', '#3FC1A5', '#F5A623'];
  const moodBar = moodTotal
    ? `<div class="mood">${r.moods
        .map((n, i) => (n ? `<div style="flex:${n};background:${moodColors[i]}"></div>` : ''))
        .join('')}</div><div class="legend">${r.moods.map((n, i) => `<span><i style="background:${moodColors[i]}"></i>${esc(moodLabels[i])} ${n}</span>`).join('')}</div>`
    : `<p class="muted">${esc(t('No mood check-ins this month.'))}</p>`;

  const runs = r.runs.count
    ? `<div class="tiles small">
        <div class="tile"><b>${r.runs.count}</b><span>${esc(t('Runs'))}</span></div>
        <div class="tile"><b>${fmtKm(r.runs.metres)} km</b><span>${esc(t('Distance'))}</span></div>
        <div class="tile"><b>${fmtDuration(r.runs.movingMs)}</b><span>${esc(t('Time'))}</span></div>
        <div class="tile"><b>${fmtKm(r.runs.longest)} km</b><span>${esc(t('Longest'))}</span></div>
      </div>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 28px; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Roboto, 'Noto Sans', 'Noto Sans Devanagari', sans-serif; color: #1C1B22; margin: 0; }
    .hero { background: linear-gradient(135deg, #7EC2F0, #3F95DA 55%, #056EBE); color: #fff; border-radius: 22px; padding: 22px 24px; }
    .hero .k { font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; opacity: .85; }
    .hero h1 { margin: 4px 0 2px; font-size: 26px; }
    .hero p { margin: 0; opacity: .9; font-size: 13px; }
    .tiles { display: flex; gap: 10px; margin: 16px 0; }
    .tile { flex: 1; border: 1px solid #ECEEF2; border-radius: 16px; padding: 12px 14px; }
    .tile b { display: block; font-size: 20px; }
    .tile span { font-size: 11px; color: #8A8A95; }
    .tiles.small .tile b { font-size: 16px; }
    h2 { font-size: 15px; margin: 22px 0 10px; }
    .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
    .h { font-size: 10px; color: #8A8A95; text-align: center; }
    .c { height: 30px; border-radius: 8px; font-size: 11px; display: flex; align-items: center; justify-content: center; }
    .c.empty { background: transparent; }
    .key { display: flex; gap: 12px; font-size: 10px; color: #8A8A95; margin-top: 8px; }
    .key i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: -1px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    td { padding: 8px 6px; border-bottom: 1px solid #F0F1F4; vertical-align: middle; }
    td.name { font-weight: 600; width: 34%; }
    .sub { font-weight: 400; font-size: 10px; color: #8A8A95; }
    td.bar { width: 30%; }
    .track { height: 8px; background: #EEF1F5; border-radius: 4px; overflow: hidden; }
    .fill { height: 100%; background: linear-gradient(90deg, #6FB7ED, #056EBE); border-radius: 4px; }
    td.num { text-align: right; white-space: nowrap; color: #4A4A55; }
    .mood { display: flex; height: 12px; border-radius: 6px; overflow: hidden; }
    .legend { display: flex; gap: 14px; font-size: 11px; color: #4A4A55; margin-top: 8px; }
    .legend i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; }
    .muted { color: #8A8A95; font-size: 12px; }
    .foot { margin-top: 26px; font-size: 10px; color: #B9B9C2; text-align: center; }
  </style></head><body>
    <div class="hero">
      <div class="k">${esc(t('Monthly report'))}</div>
      <h1>${esc(label)}</h1>
      <p>${esc(name ? t('{name}’s habits', { name }) : t('Your habits'))}</p>
    </div>
    <div class="tiles">
      <div class="tile"><b>${pct(r.completion)}</b><span>${esc(t('Completion'))}</span></div>
      <div class="tile"><b>${r.perfectDays}</b><span>${esc(t('Perfect days'))}</span></div>
      <div class="tile"><b>${r.checkins}</b><span>${esc(t('Check-ins'))}</span></div>
      <div class="tile"><b>${r.bestRun}</b><span>${esc(t('Best perfect run'))}</span></div>
    </div>
    <h2>${esc(t('Calendar'))}</h2>
    <div class="grid">${heads}${cells.join('')}</div>
    <div class="key">
      <span><i style="background:#2F8FDA"></i>${esc(t('All done'))}</span>
      <span><i style="background:#8CC4EF"></i>${esc(t('Most'))}</span>
      <span><i style="background:#CFE6FA"></i>${esc(t('Some'))}</span>
      <span><i style="background:#FDE7E6"></i>${esc(t('None'))}</span>
      <span><i style="background:#E6E0FB"></i>${esc(t('Rest day'))}</span>
    </div>
    <h2>${esc(t('Habits'))}</h2>
    ${r.habits.length ? `<table>${habitRows}</table>` : `<p class="muted">${esc(t('No habits tracked this month.'))}</p>`}
    <h2>${esc(t('Mood'))}</h2>
    ${moodBar}
    ${runs ? `<h2>${esc(t('Runs'))}</h2>${runs}` : ''}
    <div class="foot">${esc(t('Made with Habit Tracker · created on your phone'))}</div>
  </body></html>`;
}

function reportFor(year: number, month: number) {
  const { habits, logs, today } = useHabitStore.getState();
  return monthReport(habits, logs, useRunStore.getState().runs, year, month, today);
}

export async function sharePdfReport(year: number, month: number) {
  const s = useHabitStore.getState();
  const { uri } = await Print.printToFileAsync({ html: html(reportFor(year, month), s.profile.name, s.settings.weekStart), width: 595, height: 842 });
  const named = new File(Paths.cache, `Habit report ${monthKey(year, month)}.pdf`);
  if (named.exists) named.delete();
  await new File(uri).move(named);
  await Sharing.shareAsync(named.uri, { mimeType: 'application/pdf', dialogTitle: t('Share your monthly report') });
}

export async function shareCsvReport(year: number, month: number) {
  const { habits, logs } = useHabitStore.getState();
  const file = new File(Paths.cache, `Habit data ${monthKey(year, month)}.csv`);
  file.create({ overwrite: true });
  file.write(monthCsv(habits, logs, year, month));
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: t('Share your habit data') });
}

/** The last `n` months, newest first, for the month picker. */
export function recentMonths(n = 6): { year: number; month: number }[] {
  const now = fromKey(useHabitStore.getState().today);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
}

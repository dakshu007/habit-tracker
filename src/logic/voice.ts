import type { Habit } from '@/data/types';

/**
 * Turns a spoken sentence ("log 2 glasses of water", "ran 5 km",
 * "done meditating", "दो गिलास पानी") into a habit + amount. Pure, so it's testable.
 */

export interface VoiceLog {
  habit: Habit;
  /** Amount to add, in the habit's unit. */
  amount: number;
  /** "done / finished" with no number: fill up to the goal. */
  complete: boolean;
}

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90, hundred: 100,
  half: 0.5, couple: 2,
  // Hindi
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, छः: 6, सात: 7, आठ: 8, नौ: 9, दस: 10, बीस: 20, तीस: 30, आधा: 0.5,
};

const DONE_WORDS = /\b(done|finished|finish|complete|completed|did)\b|पूरा|हो गया|कर लिया/;

type Family = 'min' | 'hour' | 'km' | 'm' | 'mi' | 'count';
const UNIT_WORDS: [RegExp, Family][] = [
  [/^(min|mins|minute|minutes|मिनट)$/, 'min'],
  [/^(h|hr|hrs|hour|hours|घंटा|घंटे)$/, 'hour'],
  [/^(km|kms|kilometer|kilometers|kilometre|kilometres|किलोमीटर)$/, 'km'],
  [/^(m|meter|meters|metre|metres|मीटर)$/, 'm'],
  [/^(mi|mile|miles)$/, 'mi'],
];

function family(unit: string): Family {
  const u = unit.toLowerCase();
  for (const [re, f] of UNIT_WORDS) if (re.test(u)) return f;
  return 'count';
}

/** Words that point at a habit, keyed by its artwork or unit. */
const SYNONYMS: Record<string, string[]> = {
  'aura-drop': ['water', 'drink', 'drank', 'glass', 'glasses', 'hydrate', 'पानी', 'गिलास'],
  'aura-shoe': ['run', 'ran', 'running', 'jog', 'jogged', 'jogging', 'दौड़', 'दौड़ा'],
  'aura-steps': ['walk', 'walked', 'walking', 'steps', 'चला', 'चलना', 'कदम'],
  'aura-book': ['read', 'reading', 'pages', 'page', 'book', 'पढ़ा', 'पढ़ना', 'पन्ने'],
  'aura-lotus': ['meditate', 'meditated', 'meditation', 'meditating', 'ध्यान'],
  'aura-dumbbell': ['workout', 'exercise', 'gym', 'trained', 'कसरत', 'व्यायाम'],
  'aura-moon': ['sleep', 'slept', 'bed', 'नींद', 'सोया'],
  'aura-pen': ['journal', 'wrote', 'write', 'diary'],
  cycling: ['cycle', 'cycled', 'cycling', 'bike', 'biked', 'ride', 'साइकिल'],
  swimming: ['swim', 'swam', 'swimming', 'laps', 'तैराकी'],
  dancing: ['dance', 'danced', 'dancing', 'नाच'],
  'staircase-climbing': ['stairs', 'floors', 'climb', 'climbed', 'सीढ़ी'],
};

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[०-९]/g, (d) => `${DEVANAGARI_DIGITS.indexOf(d)}`)
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/[^\p{L}\p{M}\p{N}.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensFor(h: Habit): Set<string> {
  const words = normalize(`${h.title} ${h.unit}`).split(' ').filter((w) => w.length >= 3);
  return new Set([...words, ...(SYNONYMS[h.artId] ?? [])]);
}

/** Best-matching habit and amount, or null if no habit is mentioned. */
export function parseVoiceLog(text: string, habits: Habit[]): VoiceLog | null {
  const s = normalize(text);
  if (!s) return null;
  const words = s.split(' ');

  // Which habit?
  let best: { h: Habit; score: number } | null = null;
  for (const h of habits) {
    if (h.archived) continue;
    const toks = tokensFor(h);
    let score = 0;
    for (const w of words) if (toks.has(w)) score += 1;
    // Multi-word titles ("drink water") get a bonus when said in full.
    if (s.includes(normalize(h.title))) score += 2;
    if (score > (best?.score ?? 0)) best = { h, score };
  }
  if (!best) return null;
  const habit = best.h;

  // How much?
  // The first real number wins; "a" / "an" ("a glass of water") only counts as 1 if nothing else does.
  let num: number | null = null;
  let numAt = -1;
  for (let i = 0; i < words.length && num === null; i++) {
    const w = words[i];
    if (w === 'a' || w === 'an') continue;
    const n = /^\d+(\.\d+)?$/.test(w) ? Number(w) : WORD_NUMBERS[w];
    if (n !== undefined) {
      num = n;
      numAt = i;
    }
  }
  if (num === null) {
    const i = words.findIndex((w) => w === 'a' || w === 'an');
    if (i >= 0 && i < words.length - 1 && !DONE_WORDS.test(s)) {
      num = 1;
      numAt = i;
    }
  }
  // "one and a half" / "2 and a half"
  if (num !== null && words.slice(numAt + 1, numAt + 4).join(' ') === 'and a half') num += 0.5;

  const said = num !== null ? words.slice(numAt + 1, numAt + 3).map(family).find((f) => f !== 'count') : undefined;

  if (num === null) {
    if (DONE_WORDS.test(s)) return { habit, amount: 0, complete: true };
    return { habit, amount: habit.step, complete: false };
  }
  return { habit, amount: convert(num, said, family(habit.unit)), complete: false };
}

/** Convert between time or distance units when the spoken unit differs from the habit's. */
function convert(n: number, from: Family | undefined, to: Family): number {
  if (!from || from === to || to === 'count') return round(n);
  const toMin: Partial<Record<Family, number>> = { min: 1, hour: 60 };
  const toM: Partial<Record<Family, number>> = { m: 1, km: 1000, mi: 1609.344 };
  if (toMin[from] && toMin[to]) return round((n * toMin[from]!) / toMin[to]!);
  if (toM[from] && toM[to]) return round((n * toM[from]!) / toM[to]!);
  return round(n);
}

const round = (n: number) => Math.round(n * 100) / 100;

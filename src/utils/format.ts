/** Format a value to at most one decimal, dropping a trailing ".0"; thousands get separators. */
export function fmtNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  if (Math.abs(rounded) >= 1000) return Math.round(rounded).toLocaleString('en-US');
  return `${rounded}`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

const SINGULAR: Record<string, string> = {
  hours: 'hour', hrs: 'hr', minutes: 'minute', mins: 'min', glasses: 'glass', pages: 'page', laps: 'lap',
  floors: 'floor', steps: 'step', servings: 'serving', reps: 'rep', times: 'time', entries: 'entry', nights: 'night',
};

/** Unit matched to the amount: "1 hour", "2 hours", "1 glass". */
export function unitFor(value: number, unit: string): string {
  if (Math.abs(value) !== 1) return unit;
  return SINGULAR[unit.toLowerCase()] ?? unit;
}

/** "1 hour", "4.5 km", "8,000 steps". */
export function qty(value: number, unit: string): string {
  return `${fmtNumber(value)} ${unitFor(value, unit)}`;
}

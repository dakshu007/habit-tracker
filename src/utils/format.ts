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

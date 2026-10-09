/** Format a value to at most one decimal, dropping a trailing ".0". */
export function fmtNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

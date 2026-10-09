/**
 * Convert a #RGB / #RRGGBB hex (or pass-through rgb/rgba string) to an rgba()
 * string with the given alpha. Used for the screen gradient's fade-to-clear
 * stop, which in Figma is the SAME accent color at 0 alpha.
 */
export function hexToRgba(color: string, alpha: number): string {
  if (color.startsWith('rgb')) {
    // Already rgb()/rgba() — replace/append alpha.
    const nums = color.match(/[\d.]+/g)?.slice(0, 3) ?? ['0', '0', '0'];
    return `rgba(${nums.join(', ')}, ${alpha})`;
  }

  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse a #RGB / #RRGGBB hex (or rgb/rgba string) into numeric channels. */
export function hexToRgb(color: string): Rgb {
  if (color.startsWith('rgb')) {
    const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return { r, g, b };
  }
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

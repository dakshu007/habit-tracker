import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { type } from '@/theme/tokens';

type Variant = keyof typeof type;

/** Semantic color roles resolved from the active theme. */
type ColorRole = 'primary' | 'secondary' | 'secondaryStrong' | 'tertiary' | 'success' | 'white' | 'inherit';

interface TxtProps extends TextProps {
  variant: Variant;
  /** Theme role, or any raw color string (e.g. a task accent). */
  color?: ColorRole | string;
  style?: TextStyle | TextStyle[];
}

/**
 * Typography primitive — applies an exact Figma type ramp entry plus a theme
 * color role. Pass a raw hex/rgba to `color` for per-task accent text.
 */
export function Txt({ variant, color = 'primary', style, ...rest }: TxtProps) {
  const { theme } = useTheme();

  const roleColor: Record<Exclude<ColorRole, 'inherit'>, string> = {
    primary: theme.textPrimary,
    secondary: theme.textSecondary,
    secondaryStrong: theme.textSecondaryStrong,
    tertiary: theme.textTertiary,
    success: theme.success,
    white: '#FFFFFF',
  };

  const resolved =
    color === 'inherit'
      ? undefined
      : color in roleColor
        ? roleColor[color as keyof typeof roleColor]
        : color; // raw color string

  return <Text {...rest} style={[type[variant], resolved ? { color: resolved } : null, style]} />;
}

import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { type, type TypeVariant } from '@/theme/tokens';

/** Semantic color roles resolved from the active theme. */
type ColorRole = 'primary' | 'secondary' | 'secondaryStrong' | 'tertiary' | 'success' | 'danger' | 'white' | 'inherit';

interface TxtProps extends TextProps {
  variant: TypeVariant;
  /** Theme role, or any raw color string (e.g. a habit accent). */
  color?: ColorRole | string;
  style?: StyleProp<TextStyle>;
}

/**
 * Typography primitive — applies a type ramp entry plus a theme color role.
 * Pass a raw hex/rgba to `color` for per-habit accent text.
 */
export function Txt({ variant, color = 'primary', style, ...rest }: TxtProps) {
  const { theme } = useTheme();

  const roleColor: Record<Exclude<ColorRole, 'inherit'>, string> = {
    primary: theme.textPrimary,
    secondary: theme.textSecondary,
    secondaryStrong: theme.textSecondaryStrong,
    tertiary: theme.textTertiary,
    success: theme.success,
    danger: theme.danger,
    white: '#FFFFFF',
  };

  const resolved =
    color === 'inherit' ? undefined : color in roleColor ? roleColor[color as keyof typeof roleColor] : color;

  return <Text {...rest} style={[type[variant], resolved ? { color: resolved } : null, style]} />;
}

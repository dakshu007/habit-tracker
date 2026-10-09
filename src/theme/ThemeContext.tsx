import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type Theme } from './theme';
import { useHabitStore, type ThemeMode } from '@/store/useHabitStore';

export type { ThemeMode };

interface ThemeContextValue {
  /** Resolved theme object to read colors from. */
  theme: Theme;
  /** The user's preference (may be 'system'). */
  mode: ThemeMode;
  /** True when the resolved theme is dark. */
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Theme mode is owned by the persisted store (so it survives restarts) and
 * resolved here against the live system color scheme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const mode = useHabitStore((s) => s.settings.themeMode);
  const updateSettings = useHabitStore((s) => s.updateSettings);

  const value = useMemo<ThemeContextValue>(() => {
    const resolved = mode === 'system' ? (systemScheme ?? 'light') : mode;
    const isDark = resolved === 'dark';
    return {
      theme: isDark ? darkTheme : lightTheme,
      mode,
      isDark,
      setMode: (themeMode) => updateSettings({ themeMode }),
    };
  }, [mode, systemScheme, updateSettings]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

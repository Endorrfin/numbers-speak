import { createContext, useContext } from 'react';

// `mode` is the user's choice (persisted); `effective` is what is applied to <html data-theme>.
export type ThemeMode = 'system' | 'dark' | 'light';
export type EffectiveTheme = 'dark' | 'light';

export const THEME_KEY = 'numbers-speak.theme';

export type AppStateValue = {
  themeMode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setThemeMode: (m: ThemeMode) => void;
};

export const AppStateCtx = createContext<AppStateValue | null>(null);

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateCtx);
  if (!ctx) throw new Error('useAppState must be used within <AppStateProvider>');
  return ctx;
}

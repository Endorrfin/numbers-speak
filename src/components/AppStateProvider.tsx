import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppStateCtx, THEME_KEY } from '../lib/appState';
import type { EffectiveTheme, ThemeMode } from '../lib/appState';

const THEME_COLOR: Readonly<Record<EffectiveTheme, string>> = { dark: '#10141a', light: '#f7f6f2' };

function loadThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'dark' || v === 'light' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

function prefersLight(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-color-scheme: light)').matches);
}

function applyTheme(eff: EffectiveTheme): void {
  document.documentElement.setAttribute('data-theme', eff);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[eff]);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(loadThemeMode);
  const [systemLight, setSystemLight] = useState<boolean>(prefersLight);

  const effectiveTheme: EffectiveTheme = themeMode === 'system' ? (systemLight ? 'light' : 'dark') : themeMode;

  // Apply the effective theme to <html data-theme> and persist the user's choice.
  useEffect(() => {
    applyTheme(effectiveTheme);
    try {
      localStorage.setItem(THEME_KEY, themeMode);
    } catch {
      /* ignore persistence failures */
    }
  }, [effectiveTheme, themeMode]);

  // Follow OS light/dark changes live (only matters while the mode is 'system').
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setSystemLight(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setThemeMode = useCallback((m: ThemeMode) => setThemeModeState(m), []);

  const value = useMemo(
    () => ({ themeMode, effectiveTheme, setThemeMode }),
    [themeMode, effectiveTheme, setThemeMode],
  );

  return <AppStateCtx.Provider value={value}>{children}</AppStateCtx.Provider>;
}


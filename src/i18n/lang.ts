import { createContext, useContext } from 'react';
import type { Lang, Localized } from '../catalog/types';

export type { Lang, Localized };

export const LANG_KEY = 'numbers-speak.lang';

export type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** Resolve a Localized value in the current language. */
  t: (value: Localized) => string;
};

export const LangCtx = createContext<LangContextValue | null>(null);

export function useLang(): LangContextValue {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error('useLang must be used within <LangProvider>');
  return ctx;
}

/** Resolve a Localized value, falling back to EN (check:data keeps both filled). */
export function pick(value: Localized, lang: Lang): string {
  return value[lang] || value.en;
}

/** BCP 47 locale for Intl formatting. */
export function localeOf(lang: Lang): string {
  return lang === 'uk' ? 'uk-UA' : 'en-GB';
}

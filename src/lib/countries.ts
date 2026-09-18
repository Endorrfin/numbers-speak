// countries.ts — country names and flags from ISO 3166-1 alpha-2 codes (CLAUDE.md §4 data rules).
// Names come from Intl.DisplayNames, so no dataset carries hand-typed names; a few CLDR names are
// too long or awkward for chart labels ("Congo - Kinshasa") and get a short editorial override.
import type { Lang, Localized } from '../catalog/types';
import { localeOf } from '../i18n/lang';

export const ISO2 = /^[A-Z]{2}$/;

const SHORT_NAMES: Readonly<Record<string, Localized>> = {
  CD: { en: 'DR Congo', uk: 'ДР Конго' },
  CG: { en: 'Congo', uk: 'Конго' },
  HK: { en: 'Hong Kong', uk: 'Гонконг' },
  MO: { en: 'Macao', uk: 'Макао' },
  MM: { en: 'Myanmar', uk: 'Мʼянма' },
  PS: { en: 'Palestine', uk: 'Палестина' },
};

const displayNames = new Map<Lang, Intl.DisplayNames | null>();
function namesFor(lang: Lang): Intl.DisplayNames | null {
  if (!displayNames.has(lang)) {
    try {
      displayNames.set(lang, new Intl.DisplayNames([localeOf(lang)], { type: 'region', fallback: 'code' }));
    } catch {
      displayNames.set(lang, null); // very old engines: fall back to the code
    }
  }
  return displayNames.get(lang) ?? null;
}

/** 'UA' → 'Ukraine' / 'Україна'. Unknown or malformed codes come back unchanged. */
export function countryName(code: string, lang: Lang): string {
  const short = SHORT_NAMES[code];
  if (short) return short[lang];
  if (!ISO2.test(code)) return code;
  return namesFor(lang)?.of(code) ?? code;
}

/**
 * URL of the 4:3 SVG flag (flag-icons, MIT), copied into public/flags by scripts/sync-flags.ts.
 * Relative, so it works under any Pages sub-path; the code is validated, so it is safe in a URL.
 */
export function flagUrl(code: string): string | undefined {
  return ISO2.test(code) ? `./flags/4x3/${code.toLowerCase()}.svg` : undefined;
}

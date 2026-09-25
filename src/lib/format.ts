import type { Lang } from '../catalog/types';
import { localeOf } from '../i18n/lang';

/** '2026-09-17' → '17 Sep 2026' / '17 вер. 2026 р.' (UTC, so the date never shifts by timezone). */
export function formatDate(iso: string, lang: Lang): string {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms)) return iso;
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(ms);
}

export function formatPeriod(period: { from: number; to: number }): string {
  return period.from === period.to ? String(period.from) : `${period.from}–${period.to}`;
}

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(localeOf(lang)).format(value);
}

// CHANGED (S2): chart formatters. One cached Intl formatter per (language, style).
const formatters = new Map<string, Intl.NumberFormat>();
function nf(lang: Lang, key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const id = `${lang}:${key}`;
  let f = formatters.get(id);
  if (!f) {
    f = new Intl.NumberFormat(localeOf(lang), options);
    formatters.set(id, f);
  }
  return f;
}

/** 27_720_700_000_000 → '$27.7tn' / '27,7 трлн $' (always 3 significant digits). */
export function formatUsdCompact(value: number, lang: Lang): string {
  return nf(lang, 'usd-compact', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    notation: 'compact',
    minimumSignificantDigits: 3, // '$2.30tn', not '$2.3tn' next to '$2.17tn'
    maximumSignificantDigits: 3,
  }).format(value);
}

/** Tables: exact to 0.1 bn, no unit (the column header names it) — 27_720_700_000_000 → '27,720.7'. */
export function formatUsdBillions(value: number, lang: Lang): string {
  return nf(lang, 'bn', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value / 1e9);
}

/** Axis ticks: fewer digits, same unit words. */
export function formatUsdTick(value: number, lang: Lang): string {
  return nf(lang, 'usd-tick', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** 0.2611 → '26.1%'; shares below 0.1 % keep two significant digits ('0.0042%'), never a bare '0%'. */
export function formatShare(ratio: number, lang: Lang): string {
  if (ratio > 0 && ratio < 0.001) {
    return nf(lang, 'pct-small', { style: 'percent', maximumSignificantDigits: 2 }).format(ratio);
  }
  return nf(lang, 'pct', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ratio);
}

// CHANGED (S3-gdp): per-capita views.
/** Tables: whole US$, no unit (the column header names it) — 86_170 → '86,170'. */
export function formatUsdWhole(value: number, lang: Lang): string {
  return nf(lang, 'whole', { maximumFractionDigits: 0 }).format(value);
}

/** Ratio to an average: 6.26 → '6.3×', 0.0157 → '0.016×' (two significant digits below 1, never '0×'). */
export function formatMultiple(ratio: number, lang: Lang): string {
  const f =
    ratio < 1
      ? nf(lang, 'mult-small', { maximumSignificantDigits: 2 })
      : nf(lang, 'mult', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${f.format(ratio)}×`;
}

// CHANGED (land-area, 2026-09-22): area formatters. Intl's sanctioned unit list has no area unit
// (no "square-kilometer"), so these format the number and append the symbol as plain text — the same
// approach the legacy page used, just without its emoji globe.
const KM2 = ' km²'; // non-breaking space, so the unit never wraps onto its own line

/** 17_098_242 → '17.1M km²' / '17,1 млн км²' (always 3 significant digits, like formatUsdCompact). */
export function formatAreaCompact(value: number, lang: Lang): string {
  return (
    nf(lang, 'area-compact', {
      notation: 'compact',
      minimumSignificantDigits: 3,
      maximumSignificantDigits: 3,
    }).format(value) + KM2
  );
}

/** Axis ticks: fewer digits, same unit. */
export function formatAreaTick(value: number, lang: Lang): string {
  return nf(lang, 'area-tick', { notation: 'compact', maximumFractionDigits: 1 }).format(value) + KM2;
}

/** Tables: exact whole km² — 17_098_242 → '17,098,242 km²'. */
export function formatAreaWhole(value: number, lang: Lang): string {
  return nf(lang, 'area-whole', { maximumFractionDigits: 0 }).format(value) + KM2;
}

// CHANGED (S3-rb): counts (population) and density. Compact counts use Intl's own unit words
// ('1.46bn' / '1,46 млрд'); density is people per km² of land, written with the unit as plain text.
/** 1_463_865_525 → '1.46bn' / '1,46 млрд' (always 3 significant digits, like formatUsdCompact). */
export function formatCountCompact(value: number, lang: Lang): string {
  return nf(lang, 'count-compact', {
    notation: 'compact',
    minimumSignificantDigits: 3,
    maximumSignificantDigits: 3,
  }).format(value);
}

/** Axis ticks: fewer digits. */
export function formatCountTick(value: number, lang: Lang): string {
  return nf(lang, 'count-tick', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** People per km²: 482.4 → '482/km²' / '482/км²', 3.17 → '3.2/km²' (one decimal below 10, never '0/km²'). */
export function formatDensity(value: number, lang: Lang): string {
  const f =
    value < 10
      ? nf(lang, 'density-small', { maximumFractionDigits: 1 })
      : nf(lang, 'density', { maximumFractionDigits: 0 });
  const text = f.format(value);
  return `${text === '0' ? `<${f.format(0.1)}` : text}${lang === 'uk' ? '/км²' : '/km²'}`;
}

/** Axis ticks for density. */
export function formatDensityTick(value: number, lang: Lang): string {
  return nf(lang, 'density-tick', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

// CHANGED (S3-rb): index scores printed to three decimals (the Global Peace Index publishes them so).
/** 1.81 → '1.810' / '1,810' — always three decimals, so equal-looking scores line up in tables. */
export function formatScore(value: number, lang: Lang): string {
  return nf(lang, 'score', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);
}

/** 0.016 → '+0.016', −0.032 → '-0.032' (the locale's minus), 0 → '0.000': a sign on every non-zero change. */
export function formatScoreChange(value: number, lang: Lang): string {
  return nf(lang, 'score-change', { minimumFractionDigits: 3, maximumFractionDigits: 3, signDisplay: 'exceptZero' }).format(value);
}

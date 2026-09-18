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

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

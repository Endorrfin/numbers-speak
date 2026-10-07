// factFormat.ts — CHANGED (S3-cp): render-time text for country facts. The generated JSON holds numbers and format
// ids; units, separators and words come from here (Intl through lib/format.ts), per language.
import type { FactFormat } from '../../catalog/facts';
import type { Lang } from '../../catalog/types';
import { localeOf } from '../../i18n/lang';
import {
  formatAreaWhole,
  formatBarrels,
  formatCountCompact,
  formatDensity,
  formatGramsPerKwh,
  formatKbd,
  formatMwh,
  formatNumber,
  formatScore,
  formatShare,
  formatTwh,
  formatUsdCompact,
  formatUsdPrice,
} from '../../lib/format';

const cache = new Map<string, Intl.NumberFormat>();
function fixed(lang: Lang, digits: number, style?: 'percent'): Intl.NumberFormat {
  const id = `${lang}:${digits}:${style ?? ''}`;
  let f = cache.get(id);
  if (!f) {
    f = new Intl.NumberFormat(localeOf(lang), { style, minimumFractionDigits: style ? 0 : digits, maximumFractionDigits: digits });
    cache.set(id, f);
  }
  return f;
}

export function formatFact(value: number, format: FactFormat, lang: Lang): string {
  switch (format) {
    case 'usd-compact':
      return formatUsdCompact(value, lang);
    case 'usd-whole':
      return formatUsdPrice(value, lang);
    case 'count-compact':
      return formatCountCompact(value, lang);
    case 'density':
      return formatDensity(value, lang);
    case 'int':
      return formatNumber(Math.round(value), lang);
    case 'dec2':
    case 'rate2':
      return fixed(lang, 2).format(value);
    case 'area-whole':
      return formatAreaWhole(value, lang);
    case 'index1':
      return fixed(lang, 1).format(value);
    case 'score':
      return formatScore(value, lang);
    case 'kbd':
      return formatKbd(value, lang);
    case 'barrels':
      return formatBarrels(value, lang);
    case 'twh':
      return formatTwh(value, lang);
    case 'mwh':
      return formatMwh(value, lang);
    case 'share':
      return formatShare(value, lang);
    case 'percent':
      return fixed(lang, 1, 'percent').format(value / 100);
    case 'g-kwh':
      return formatGramsPerKwh(value, lang);
  }
}

// previewFormat.ts — CHANGED (S3-th): render-time text for card previews. The generated JSON holds numbers
// and format ids; the words and separators come from here, per language (Intl through lib/format.ts).
import type { KeyFigure, LabelArg, PreviewFormat, PreviewNum } from '../../catalog/preview';
import type { Lang } from '../../catalog/types';
import { localeOf, pick } from '../../i18n/lang';
import { fill } from '../../i18n/ui';
import { countryName } from '../../lib/countries';
import {
  formatAreaCompact,
  formatCountCompact,
  formatNumber,
  formatScore,
  formatShare,
  formatUsdCompact,
} from '../../lib/format';

const cache = new Map<string, Intl.NumberFormat>();
function nf(lang: Lang, key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const id = `${lang}:${key}`;
  let f = cache.get(id);
  if (!f) {
    f = new Intl.NumberFormat(localeOf(lang), options);
    cache.set(id, f);
  }
  return f;
}

/** One number in one of the preview formats. */
export function formatPreviewNum(value: number, format: PreviewFormat, lang: Lang): string {
  switch (format) {
    case 'int':
      return formatNumber(Math.round(value), lang);
    case 'signed-int':
      return nf(lang, 'signed-int', { maximumFractionDigits: 0, signDisplay: 'exceptZero' }).format(value);
    case 'pct0':
      return nf(lang, 'pct0', { style: 'percent', maximumFractionDigits: 0 }).format(value);
    case 'pct1':
      return formatShare(value, lang);
    case 'score':
      return formatScore(value, lang);
    case 'dec2':
      return nf(lang, 'dec2', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    case 'times':
      return `${nf(lang, 'times', { maximumFractionDigits: 0 }).format(value)}×`;
    case 'count-compact':
      return formatCountCompact(value, lang);
    case 'usd-compact':
      return formatUsdCompact(value, lang);
    case 'usd-m-compact':
      return formatUsdCompact(value * 1e6, lang);
    case 'uah-bn': {
      const n = nf(lang, 'uah-bn', { maximumFractionDigits: 2 }).format(value);
      return lang === 'uk' ? `${n} млрд грн` : `UAH ${n} bn`;
    }
    case 'area-compact':
      return formatAreaCompact(value, lang);
    case 'rate1':
      return nf(lang, 'rate1', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
    case 'years1':
      return nf(lang, 'years1', { style: 'unit', unit: 'year', unitDisplay: 'long', maximumFractionDigits: 1 }).format(value);
    case 'year':
      return String(Math.round(value));
  }
}

const MONTHS_SHORT: Record<Lang, readonly string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  uk: ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'],
};
const MONTHS_LONG: Record<Lang, readonly string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  uk: ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'],
};

/**
 * 'YYYY' → 'YYYY'; 'YYYY-MM' → 'Feb 2022' / 'лют 2022' (short) or 'December 2023' / 'грудень 2023'
 * (long). Fixed tables instead of Intl: ICU versions disagree on 'Sep' vs 'Sept' and add 'р.' in Ukrainian.
 */
export function formatPeriodEnd(period: string, lang: Lang, style: 'short' | 'long' = 'short'): string {
  const [year, month] = period.split('-');
  if (!month) return year ?? period;
  const name = (style === 'long' ? MONTHS_LONG : MONTHS_SHORT)[lang][Number(month) - 1];
  return name ? `${name} ${year}` : period;
}

function formatArg(a: LabelArg, lang: Lang): string {
  switch (a.kind) {
    case 'num':
      return formatPreviewNum(a.value, a.format, lang);
    case 'month':
      return formatPeriodEnd(a.value, lang, 'long');
    case 'country':
      return countryName(a.value, lang);
    case 'text':
      return pick(a.value, lang);
  }
}

const isRange = (v: KeyFigure['value']): v is readonly [PreviewNum, PreviewNum] => Array.isArray(v);

/** The big number: one value, or a range 'a – b'. */
export function formatKeyValue(key: KeyFigure, lang: Lang): string {
  const v = key.value;
  return isRange(v)
    ? `${formatPreviewNum(v[0].value, v[0].format, lang)} – ${formatPreviewNum(v[1].value, v[1].format, lang)}`
    : formatPreviewNum(v.value, v.format, lang);
}

/** The label with its `{name}` placeholders filled. */
export function formatKeyLabel(key: KeyFigure, lang: Lang): string {
  const values: Record<string, string> = {};
  for (const [name, a] of Object.entries(key.args ?? {})) values[name] = formatArg(a, lang);
  return fill(pick(key.label, lang), values);
}

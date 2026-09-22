// specs.ts — chart specs for donations: timeline (TimeSeries) + seasonal (YearChart) angles.
// CHANGED (S3-cd): new.
import { SERIES_COLOR } from '../../charts/palette';
import type { TsSpec } from '../../charts/renderTimeSeries';
import type { YearChartSpec } from '../../charts/renderYearChart';
import type { Lang } from '../../catalog/types';
import { formatNumber } from '../../lib/format';
import { fullYears } from './data';
import type { MonthRow } from './data';
import type { Show } from './state';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_UK = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

export function monthLabel(month: number, lang: Lang): string {
  return (lang === 'uk' ? MONTHS_UK : MONTHS_EN)[month - 1] ?? String(month);
}

/** billion UAH, the dataset's own unit — never derived from a currency Intl formatter, since amounts
 *  are already pre-scaled to billions (3.13 means UAH 3.13bn, not UAH 3.13). */
const UNIT_BN: Record<Lang, string> = { en: 'bn UAH', uk: 'млрд ₴' };

const monthStart = (year: number, month: number): number => Date.UTC(year, month - 1, 1);
const monthEnd = (year: number, month: number): number =>
  month === 12 ? Date.UTC(year + 1, 0, 1) : Date.UTC(year, month, 1);

export function buildTimelineSpec(rows: readonly MonthRow[], lang: Lang): TsSpec {
  const spans = rows.map((r) => ({ start: monthStart(r.year, r.month), end: monthEnd(r.year, r.month) }));
  const xTicks = rows.filter((r) => r.month === 1).map((r) => monthStart(r.year, r.month));
  return {
    spans,
    xTicks,
    xTicksNarrow: xTicks,
    xFormat: (ms) => String(new Date(ms).getUTCFullYear()),
    panels: [
      {
        key: 'amount',
        title: lang === 'uk' ? `Через monobank, ${UNIT_BN.uk}` : `Raised via monobank, ${UNIT_BN.en}`,
        yFormat: (v) => formatNumber(v, lang),
        lines: [{ key: 'amount', color: SERIES_COLOR.primary, values: rows.map((r) => r.amount) }],
      },
    ],
    tooltip: (i) => {
      const r = rows[i]!;
      return {
        title: `${monthLabel(r.month, lang)} ${r.year}`,
        lines: [
          {
            label: lang === 'uk' ? 'Зібрано' : 'Raised',
            value: `${formatNumber(r.amount, lang)} ${UNIT_BN[lang]}`,
            color: SERIES_COLOR.primary,
          },
        ],
      };
    },
  };
}

const YEAR_COLOR = [SERIES_COLOR.s1, SERIES_COLOR.s2, SERIES_COLOR.s3, SERIES_COLOR.s4];

/** Year-over-year overlay, Jan-Dec. Only full calendar years (see data.ts fullYears — 2023 & 2024 here;
 *  2022 starts in February and 2025 stops in November, so both stay on the timeline only). */
export function buildSeasonalSpec(rows: readonly MonthRow[], lang: Lang): YearChartSpec {
  const years = fullYears(rows);
  const byYear = new Map<number, number[]>();
  for (const y of years) byYear.set(y, new Array(12).fill(0) as number[]);
  for (const r of rows) byYear.get(r.year)?.splice(r.month - 1, 1, r.amount);
  const maxVal = Math.max(...rows.map((r) => r.amount));

  return {
    years: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    yDomain: [0, Math.ceil(maxVal * 1.1 * 2) / 2],
    yFormat: (v) => formatNumber(v, lang),
    xTicks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    xTicksNarrow: [1, 4, 7, 10],
    xFormat: (m) => monthLabel(m, lang),
    lines: years.map((y, i) => ({ key: String(y), values: byYear.get(y)!, color: YEAR_COLOR[i % 4]! })),
    tooltip: (i) => ({
      title: monthLabel(i + 1, lang),
      lines: years.map((y, k) => ({
        label: String(y),
        value: `${formatNumber(byYear.get(y)![i]!, lang)} ${UNIT_BN[lang]}`,
        color: YEAR_COLOR[k % 4]!,
      })),
    }),
  };
}

export function chartLabel(show: Show, lang: Lang): string {
  if (show === 'seasonal') {
    return lang === 'uk'
      ? 'Пожертви через monobank за місяцями, порівняння років'
      : 'Monobank donations by month, year over year';
  }
  return lang === 'uk' ? 'Пожертви через monobank за місяцями, 2022–2025' : 'Monobank donations by month, 2022–2025';
}

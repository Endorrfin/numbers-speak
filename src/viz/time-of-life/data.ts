// data.ts — the time-use dataset contract (S3-tl): types, the parser (prep, check:data, browser) and pure
// derivations — the OECD-30 average, one day scaled to a lifetime, weeks of life. Derived values are never stored.
//
// Unit: minutes per average day (weekdays and weekends), people aged 15–64 (a few surveys differ — `ages`).
// Every country/sex row splits the 1,440 minutes of a day into 15 mutually exclusive activities.
import { array, fail, finite, record, string } from '../../lib/dataset';

export const DATA_FILE = 'time-use-oecd-2026.json';

/** Stored activities (prep derives them from the OECD sheet; residuals keep every parent total intact). */
export const ACTIVITY_IDS = [
  'sleep',
  'eating',
  'personal-care',
  'paid-work',
  'study',
  'commute',
  'housework',
  'shopping',
  'care',
  'errands',
  'tv',
  'social',
  'sports',
  'other-leisure',
  'other',
] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

export const SEXES = ['total', 'women', 'men'] as const;
export type Sex = (typeof SEXES)[number];

export type Minutes = Readonly<Record<ActivityId, number>>;

export type CountryRow = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  /** Listed by the OECD among its 30 member countries in the database (others are partner economies). */
  oecd: boolean;
  /** As published, e.g. "2021/22". */
  surveyYear: string;
  /** Age group the survey covers, e.g. "15-64". */
  ages: string;
  minutes: Readonly<Record<Sex, Minutes>>;
};

export type TimeUseDataset = {
  unit: 'minutes per day';
  /** Release date of the OECD workbook, YYYY-MM-DD. */
  release: string;
  countries: CountryRow[];
};

// ── Display model: 14 activities (commute + errands = travel) in four groups ────────────────────────
export const GROUP_IDS = ['needs', 'duties', 'free', 'other'] as const;
export type GroupId = (typeof GROUP_IDS)[number];

export const DISPLAY_IDS = [
  'sleep',
  'eating',
  'personal-care',
  'paid-work',
  'study',
  'travel',
  'housework',
  'shopping',
  'care',
  'tv',
  'social',
  'sports',
  'other-leisure',
  'other',
] as const;
export type DisplayId = (typeof DISPLAY_IDS)[number];

export const DISPLAY_PARTS: Readonly<Record<DisplayId, readonly ActivityId[]>> = {
  sleep: ['sleep'],
  eating: ['eating'],
  'personal-care': ['personal-care'],
  'paid-work': ['paid-work'],
  study: ['study'],
  travel: ['commute', 'errands'],
  housework: ['housework'],
  shopping: ['shopping'],
  care: ['care'],
  tv: ['tv'],
  social: ['social'],
  sports: ['sports'],
  'other-leisure': ['other-leisure'],
  other: ['other'],
};

export const GROUP_OF: Readonly<Record<DisplayId, GroupId>> = {
  sleep: 'needs',
  eating: 'needs',
  'personal-care': 'needs',
  'paid-work': 'duties',
  study: 'duties',
  travel: 'duties',
  housework: 'duties',
  shopping: 'duties',
  care: 'duties',
  tv: 'free',
  social: 'free',
  sports: 'free',
  'other-leisure': 'free',
  other: 'other',
};

/** Countries and gender angles compare one measure: a group, an OECD main category or an activity. */
export const MEASURE_IDS = ['free', 'needs', 'duties', 'paid', 'unpaid', ...DISPLAY_IDS] as const;
export type MeasureId = (typeof MEASURE_IDS)[number];

const MEASURE_PARTS: Readonly<Record<'free' | 'needs' | 'duties' | 'paid' | 'unpaid', readonly ActivityId[]>> = {
  needs: ['sleep', 'eating', 'personal-care'],
  duties: ['paid-work', 'study', 'commute', 'housework', 'shopping', 'care', 'errands'],
  free: ['tv', 'social', 'sports', 'other-leisure'],
  // OECD main categories: "Paid work or study" and "Unpaid work".
  paid: ['paid-work', 'study', 'commute'],
  unpaid: ['housework', 'shopping', 'care', 'errands'],
};

export function partsOf(measure: MeasureId): readonly ActivityId[] {
  return measure in MEASURE_PARTS
    ? MEASURE_PARTS[measure as keyof typeof MEASURE_PARTS]
    : DISPLAY_PARTS[measure as DisplayId];
}

export const sumOf = (m: Minutes, parts: readonly ActivityId[]): number => parts.reduce((s, a) => s + m[a], 0);
export const totalOf = (m: Minutes): number => sumOf(m, ACTIVITY_IDS);
export const measureOf = (m: Minutes, measure: MeasureId): number => sumOf(m, partsOf(measure));

// ── Lifetime scale: the surveys describe ages 15–64, so the page scales one day to those 50 years ───────
export const AGE_FROM = 15;
export const AGE_TO = 64;
export const SPAN_YEARS = AGE_TO - AGE_FROM + 1; // 50
export const DAYS_PER_YEAR = 365.25;
export const WEEKS_PER_YEAR = 52;
export const SPAN_DAYS = SPAN_YEARS * DAYS_PER_YEAR; // 18,262.5
export const SPAN_WEEKS = SPAN_YEARS * WEEKS_PER_YEAR; // 2,600 squares
const DAY = 1440;

export type Amounts = { minutes: number; share: number; years: number; days: number; hours: number };

/** Minutes of an average day → the same share of the 50-year span. `total` is the row's own day length. */
export function amounts(minutes: number, total = DAY): Amounts {
  const share = total > 0 ? minutes / total : 0;
  return {
    minutes,
    share,
    years: share * SPAN_YEARS,
    days: share * SPAN_DAYS,
    hours: share * SPAN_DAYS * 24,
  };
}

// ── Parser ──────────────────────────────────────────────────────────────────────────────────────
const CODE = /^[A-Z]{2}$/;
const AGES = /^\d{2}(-\d{2}| and more)$/;

function parseMinutes(json: unknown, where: string): Minutes {
  const o = record(json, where);
  const out = {} as Record<ActivityId, number>;
  for (const a of ACTIVITY_IDS) out[a] = finite(o[a], `${where}.${a}`, 0, DAY);
  const extra = Object.keys(o).filter((k) => !(ACTIVITY_IDS as readonly string[]).includes(k));
  if (extra.length) fail(where, `unknown activities: ${extra.join(', ')}`);
  const total = totalOf(out);
  // The OECD rows sum to 1,440 ± rounding (1,439.61–1,440.21 in the 2026 release).
  if (Math.abs(total - DAY) > 1) fail(where, `activities sum to ${total.toFixed(2)} min, 1440 ± 1 expected`);
  return out;
}

export function parseTimeUse(json: unknown, where = DATA_FILE): TimeUseDataset {
  const o = record(json, where);
  if (o.unit !== 'minutes per day') fail(`${where}.unit`, "'minutes per day' expected");
  const release = string(o.release, `${where}.release`, /^\d{4}-\d{2}-\d{2}$/);
  const seen = new Set<string>();
  const countries = array(o.countries, `${where}.countries`, 2).map((raw, i): CountryRow => {
    const at = `${where}.countries[${i}]`;
    const c = record(raw, at);
    const code = string(c.code, `${at}.code`, CODE);
    if (seen.has(code)) fail(`${at}.code`, `duplicate ${code}`);
    seen.add(code);
    if (typeof c.oecd !== 'boolean') fail(`${at}.oecd`, 'boolean expected');
    const m = record(c.minutes, `${at}.minutes`);
    const minutes = {} as Record<Sex, Minutes>;
    for (const s of SEXES) minutes[s] = parseMinutes(m[s], `${at}.minutes.${s}`);
    return {
      code,
      oecd: c.oecd,
      surveyYear: string(c.surveyYear, `${at}.surveyYear`, /^\d{4}(\/\d{2,4})?$/),
      ages: string(c.ages, `${at}.ages`, AGES),
      minutes,
    };
  });
  if (!countries.some((c) => c.oecd)) fail(`${where}.countries`, 'at least one OECD country expected');
  return { unit: 'minutes per day', release, countries };
}

/** check:data hook (scripts/check-data.ts). */
export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parseTimeUse(json, file);
}

// ── Derivations ─────────────────────────────────────────────────────────────────────────────────
export const OECD = 'OECD';
export type Place = typeof OECD | string;

/** Unweighted mean of the OECD member countries in the file, per sex and activity (author's calculation). */
export function oecdAverage(dataset: TimeUseDataset): Record<Sex, Minutes> {
  const members = dataset.countries.filter((c) => c.oecd);
  const out = {} as Record<Sex, Minutes>;
  for (const s of SEXES) {
    const m = {} as Record<ActivityId, number>;
    for (const a of ACTIVITY_IDS) m[a] = members.reduce((sum, c) => sum + c.minutes[s][a], 0) / members.length;
    out[s] = m;
  }
  return out;
}

export const oecdCount = (dataset: TimeUseDataset): number => dataset.countries.filter((c) => c.oecd).length;

export function minutesFor(dataset: TimeUseDataset, place: Place, sex: Sex, average = oecdAverage(dataset)): Minutes {
  if (place === OECD) return average[sex];
  return dataset.countries.find((c) => c.code === place)?.minutes[sex] ?? average[sex];
}

export type ActivityRow = { id: DisplayId; group: GroupId } & Amounts;

/** 14 display rows in display order; shares are of the row's own day (so they sum to exactly 100 %). */
export function activityRows(m: Minutes): ActivityRow[] {
  const total = totalOf(m);
  return DISPLAY_IDS.map((id) => ({ id, group: GROUP_OF[id], ...amounts(sumOf(m, DISPLAY_PARTS[id]), total) }));
}

export type GroupRow = { id: GroupId; activities: ActivityRow[] } & Amounts;

export function groupRows(rows: readonly ActivityRow[]): GroupRow[] {
  const total = rows.reduce((s, r) => s + r.minutes, 0);
  return GROUP_IDS.map((id) => {
    const activities = rows.filter((r) => r.group === id);
    return { id, activities, ...amounts(activities.reduce((s, r) => s + r.minutes, 0), total) };
  });
}

/**
 * Whole weeks per activity, summing to exactly `weeks` (largest-remainder rounding, ties in display order).
 * A week grid cannot draw 0.4 of a square; the table keeps the exact values.
 */
export function weeksOf(rows: readonly ActivityRow[], weeks = SPAN_WEEKS): Array<{ id: DisplayId; weeks: number }> {
  const exact = rows.map((r) => r.share * weeks);
  const out = exact.map(Math.floor);
  let left = weeks - out.reduce((s, n) => s + n, 0);
  const order = exact.map((v, i) => ({ i, rem: v - Math.floor(v) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i]! += 1;
    left--;
  }
  return rows.map((r, i) => ({ id: r.id, weeks: out[i]! }));
}

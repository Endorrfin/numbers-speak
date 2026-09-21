// data.ts — Interbrand Best Global Brands, 2000–2025: types, the parser (prep, check:data, browser) and pure
// derivations (a year's ranking, bar-race frames, sector-group shares). CHANGED (S3-br): new entry.
import { ISO2 } from '../../lib/countries';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';
import type { Localized } from '../../catalog/types';

export const DATA_FILE = 'brands-2000-2025.json';
/** The span of DATA_FILE (the parser checks the file against it). */
export const FIRST_YEAR = 2000;
export const LATEST_YEAR = 2025;

/** Interbrand's sectors (kebab keys; the English names live in SECTOR_LABELS). */
export const SECTORS = [
  'technology',
  'electronics',
  'media',
  'telecommunications',
  'business-services',
  'automotive',
  'financial-services',
  'fmcg',
  'beverages',
  'alcohol',
  'restaurants',
  'tobacco',
  'toys-games',
  'pharmaceuticals',
  'luxury',
  'apparel',
  'sporting-goods',
  'retail',
  'diversified',
  'energy',
  'logistics',
  'hospitality',
] as const;
export type Sector = (typeof SECTORS)[number];

/**
 * Colour groups. 22 sectors cannot each get a distinguishable hue, so they fold into six groups
 * (five validated hues + one neutral); the sector itself is named in the tooltip and the table.
 */
export const GROUPS = ['tech', 'auto', 'finance', 'consumer', 'fashion', 'industry'] as const;
export type Group = (typeof GROUPS)[number];

export const SECTOR_GROUP: Readonly<Record<Sector, Group>> = {
  technology: 'tech',
  electronics: 'tech',
  media: 'tech',
  telecommunications: 'tech',
  'business-services': 'tech',
  automotive: 'auto',
  'financial-services': 'finance',
  fmcg: 'consumer',
  beverages: 'consumer',
  alcohol: 'consumer',
  restaurants: 'consumer',
  tobacco: 'consumer',
  'toys-games': 'consumer',
  pharmaceuticals: 'consumer',
  luxury: 'fashion',
  apparel: 'fashion',
  'sporting-goods': 'fashion',
  retail: 'fashion',
  diversified: 'industry',
  energy: 'industry',
  logistics: 'industry',
  hospitality: 'industry',
};

export const GROUP_LABELS: Readonly<Record<Group, Localized>> = {
  tech: { en: 'Technology & media', uk: 'Технології й медіа' },
  auto: { en: 'Automotive', uk: 'Автомобілі' },
  finance: { en: 'Financial services', uk: 'Фінансові послуги' },
  consumer: { en: 'Food, drinks & household', uk: 'Їжа, напої й побут' },
  fashion: { en: 'Luxury, fashion & retail', uk: 'Люкс, мода й рітейл' },
  industry: { en: 'Industry, logistics & travel', uk: 'Індустрія, логістика й подорожі' },
};

export const SECTOR_LABELS: Readonly<Record<Sector, Localized>> = {
  technology: { en: 'Technology', uk: 'Технології' },
  electronics: { en: 'Electronics', uk: 'Електроніка' },
  media: { en: 'Media', uk: 'Медіа' },
  telecommunications: { en: 'Telecommunications', uk: 'Телеком' },
  'business-services': { en: 'Business services', uk: 'Бізнес-послуги' },
  automotive: { en: 'Automotive', uk: 'Автомобілі' },
  'financial-services': { en: 'Financial services', uk: 'Фінансові послуги' },
  fmcg: { en: 'FMCG', uk: 'Товари щоденного вжитку (FMCG)' },
  beverages: { en: 'Beverages', uk: 'Напої' },
  alcohol: { en: 'Alcohol', uk: 'Алкоголь' },
  restaurants: { en: 'Restaurants', uk: 'Ресторани' },
  tobacco: { en: 'Tobacco', uk: 'Тютюн' },
  'toys-games': { en: 'Toys & games', uk: 'Іграшки й ігри' },
  pharmaceuticals: { en: 'Pharmaceuticals', uk: 'Фармацевтика' },
  luxury: { en: 'Luxury', uk: 'Люкс' },
  apparel: { en: 'Apparel', uk: 'Одяг' },
  'sporting-goods': { en: 'Sporting goods', uk: 'Спортивні товари' },
  retail: { en: 'Retail', uk: 'Рітейл' },
  diversified: { en: 'Diversified', uk: 'Диверсифіковані' },
  energy: { en: 'Energy', uk: 'Енергетика' },
  logistics: { en: 'Logistics', uk: 'Логістика' },
  hospitality: { en: 'Hospitality & travel', uk: 'Гостинність і подорожі' },
};

export type Brand = {
  /** kebab-case, stable across years and renames (Salesforce.com → Salesforce). */
  id: string;
  /** Name as Interbrand writes it in the brand's latest ranking. */
  name: string;
  sector: Sector;
  /** ISO 3166-1 alpha-2 of the brand's home country. */
  country: string;
};

export type YearEntry = { id: string; value: number };

export type YearRanking = {
  year: number;
  /** In Interbrand's rank order: value descending (ties keep Interbrand's order). */
  entries: YearEntry[];
};

export type BrandDataset = {
  unit: 'usd-millions';
  from: number;
  to: number;
  brands: Brand[];
  years: YearRanking[];
};

const BRAND_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_VALUE = 2_000_000; // US$ m; the top value is ~$0.5 tn — a unit slip ($ bn → $ m twice) fails loudly
const MAX_ENTRIES = 100;

/** Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path. */
export function parseBrandDataset(json: unknown, where = DATA_FILE): BrandDataset {
  const o = record(json, where);
  if (o.unit !== 'usd-millions') fail(`${where}.unit`, "'usd-millions' expected");
  const from = finite(o.from, `${where}.from`, 1990, 2100);
  const to = finite(o.to, `${where}.to`, from, 2100);
  if (from !== FIRST_YEAR || to !== LATEST_YEAR) fail(`${where}.from/to`, `${FIRST_YEAR}–${LATEST_YEAR} expected`);

  const byId = new Map<string, Brand>();
  const brands = array(o.brands, `${where}.brands`, 1).map((raw, i): Brand => {
    const at = `${where}.brands[${i}]`;
    const b = record(raw, at);
    const id = string(b.id, `${at}.id`, BRAND_ID);
    if (byId.has(id)) fail(`${at}.id`, `duplicate brand ${id}`);
    const brand: Brand = {
      id,
      name: string(b.name, `${at}.name`),
      sector: oneOf(b.sector, SECTORS, `${at}.sector`),
      country: string(b.country, `${at}.country`, ISO2),
    };
    byId.set(id, brand);
    return brand;
  });

  const used = new Set<string>();
  const yearsRaw = array(o.years, `${where}.years`, 1);
  if (yearsRaw.length !== to - from + 1) fail(`${where}.years`, `${to - from + 1} consecutive years expected`);
  const years = yearsRaw.map((raw, i): YearRanking => {
    const at = `${where}.years[${i}]`;
    const y = record(raw, at);
    const year = finite(y.year, `${at}.year`);
    if (year !== from + i) fail(`${at}.year`, `${from + i} expected (years are consecutive and ascending)`);
    const seen = new Set<string>();
    let previous = Infinity;
    const entries = array(y.entries, `${at}.entries`, 1).map((e, j): YearEntry => {
      const ea = `${at}.entries[${j}]`;
      const r = record(e, ea);
      const id = string(r.id, `${ea}.id`, BRAND_ID);
      if (!byId.has(id)) fail(`${ea}.id`, `unknown brand ${id}`);
      if (seen.has(id)) fail(`${ea}.id`, `duplicate brand ${id} in ${year}`);
      seen.add(id);
      used.add(id);
      const value = finite(r.value, `${ea}.value`, 1, MAX_VALUE);
      if (!Number.isInteger(value)) fail(`${ea}.value`, 'whole US$ millions expected');
      if (value > previous) fail(`${ea}.value`, 'entries must be in rank order (value descending)');
      previous = value;
      return { id, value };
    });
    if (entries.length > MAX_ENTRIES) fail(`${at}.entries`, `at most ${MAX_ENTRIES} brands expected`);
    return { year, entries };
  });

  for (const b of brands) if (!used.has(b.id)) fail(`${where}.brands`, `${b.id} is never ranked`);
  return { unit: 'usd-millions', from, to, brands, years };
}

/** check:data entry point (CLAUDE.md §4): the same parser the page uses. */
export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `unexpected data file (expected ${DATA_FILE})`);
  parseBrandDataset(json, file);
}

// ── Derivations ─────────────────────────────────────────────────────────────────────────────────

export const groupOf = (brand: Brand): Group => SECTOR_GROUP[brand.sector];

export type RankedBrand = {
  brand: Brand;
  /** Interbrand's global rank in that year (1 = most valuable), also when a group is selected. */
  rank: number;
  /** US$ millions. */
  value: number;
  /** Value vs the previous year (0.1 = +10 %); null in the first year or when the brand was not ranked. */
  change: number | null;
};

/** One year's ranking, optionally narrowed to a group (ranks stay global). Pure. */
export function rankYear(dataset: BrandDataset, year: number, group: Group | 'all' = 'all'): RankedBrand[] {
  const current = dataset.years.find((y) => y.year === year);
  if (!current) return [];
  const prev = new Map((dataset.years.find((y) => y.year === year - 1)?.entries ?? []).map((e) => [e.id, e.value]));
  const byId = new Map(dataset.brands.map((b) => [b.id, b]));
  const out: RankedBrand[] = [];
  current.entries.forEach((e, i) => {
    const brand = byId.get(e.id)!;
    if (group !== 'all' && groupOf(brand) !== group) return;
    const p = prev.get(e.id);
    out.push({ brand, rank: i + 1, value: e.value, change: p ? e.value / p - 1 : null });
  });
  return out;
}

export type FrameRow = { id: string; value: number };
export type Frame = {
  /** Fractional year of this frame, e.g. 2003.25. */
  time: number;
  /** The top brands at this instant, value descending (ties by id). */
  rows: FrameRow[];
};

/**
 * Bar-race keyframes: `steps` frames per year, values interpolated linearly between rankings.
 * A brand outside a year's ranking counts as 0 there, so it slides in from the bottom and out again.
 * Frame i sits at time from + i / steps; there are (to − from) · steps + 1 frames. Pure.
 */
export function buildFrames(
  dataset: BrandDataset,
  options: { steps: number; top: number; group?: Group | 'all' },
): Frame[] {
  const steps = Math.max(1, Math.floor(options.steps));
  const group = options.group ?? 'all';
  const ids = dataset.brands.filter((b) => group === 'all' || groupOf(b) === group).map((b) => b.id);
  const yearValues = dataset.years.map((y) => new Map(y.entries.map((e) => [e.id, e.value])));
  const frames: Frame[] = [];
  for (let yi = 0; yi < yearValues.length; yi++) {
    const a = yearValues[yi]!;
    const b = yearValues[yi + 1];
    const last = !b;
    for (let s = 0; s < (last ? 1 : steps); s++) {
      const f = s / steps;
      const rows: FrameRow[] = [];
      for (const id of ids) {
        const value = (a.get(id) ?? 0) * (1 - f) + (b?.get(id) ?? 0) * f;
        if (value > 0) rows.push({ id, value });
      }
      rows.sort((p, q) => q.value - p.value || p.id.localeCompare(q.id));
      frames.push({ time: dataset.from + yi + f, rows: rows.slice(0, options.top) });
    }
  }
  return frames;
}

export const frameOfYear = (year: number, from: number, steps: number): number => (year - from) * steps;
/** The whole year a frame belongs to (nearest ranking), for tooltips, the table and the URL. */
export const yearOfFrame = (frame: number, from: number, steps: number): number => from + Math.round(frame / steps);

export type GroupShare = { group: Group; value: number; share: number; count: number };

/** Sum of brand values per group in one year, and each group's share of the ranking's total. Pure. */
export function groupShares(dataset: BrandDataset, year: number): GroupShare[] {
  const ranked = rankYear(dataset, year);
  const total = ranked.reduce((s, r) => s + r.value, 0) || 1;
  return GROUPS.map((group) => {
    const rows = ranked.filter((r) => groupOf(r.brand) === group);
    const value = rows.reduce((s, r) => s + r.value, 0);
    return { group, value, share: value / total, count: rows.length };
  });
}

/*
 * prep.ts — OECD Time Use Database (release 30 Apr 2026) → public/data/time-of-life/time-use-oecd-2026.json.
 * Run: `npm run prep -- time-of-life`.
 *
 * Input: three CSV exports of the sheets "Total", "Men" and "Women" of OECD-time-use-database-updates.xlsx
 * (average minutes per day, weekdays and weekends; see README.md for the rows kept and their checksums).
 * Output: per country and sex, the 1,440 minutes of a day split into 15 mutually exclusive activities.
 * Sub-activities the survey does not report ("..", "-", "(see notes)") are 0 and their time stays in a
 * residual of the same main category, so every OECD main-category total is preserved exactly.
 * The output is validated by the same parser the site uses.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParseRows } from 'd3';
import { ACTIVITY_IDS, DATA_FILE, SEXES, parseTimeUse } from '../../src/viz/time-of-life/data';
import type { ActivityId, CountryRow, Minutes, Sex } from '../../src/viz/time-of-life/data';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/time-of-life');
const RELEASE = '2026-04-30';

/** Sheet column names → ISO 3166-1 alpha-2. The first 30 are the OECD members the sheet lists. */
const ISO: ReadonlyArray<[string, string]> = [
  ['Australia', 'AU'], ['Austria', 'AT'], ['Belgium', 'BE'], ['Canada', 'CA'], ['Denmark', 'DK'],
  ['Estonia', 'EE'], ['Finland', 'FI'], ['France', 'FR'], ['Germany', 'DE'], ['Greece', 'GR'],
  ['Hungary', 'HU'], ['Ireland', 'IE'], ['Italy', 'IT'], ['Japan', 'JP'], ['Korea', 'KR'],
  ['Latvia', 'LV'], ['Lithuania', 'LT'], ['Luxembourg', 'LU'], ['Mexico', 'MX'], ['Netherlands', 'NL'],
  ['New Zealand', 'NZ'], ['Norway', 'NO'], ['Poland', 'PL'], ['Portugal', 'PT'], ['Slovenia', 'SI'],
  ['Spain', 'ES'], ['Sweden', 'SE'], ['Türkiye', 'TR'], ['United Kingdom', 'GB'], ['United States', 'US'],
  ['Bulgaria', 'BG'], ['Croatia', 'HR'], ['China', 'CN'], ['India', 'IN'], ['South Africa', 'ZA'],
];
const OECD_MEMBERS = 30;

const FILES: Readonly<Record<Sex, string>> = {
  total: 'oecd-time-use-2026-total.csv',
  women: 'oecd-time-use-2026-women.csv',
  men: 'oecd-time-use-2026-men.csv',
};

type Sheet = { names: string[]; years: string[]; ages: string[]; rows: Map<string, string[]> };

function readSheet(file: string): Sheet {
  const lines = csvParseRows(readFileSync(join(here, file), 'utf8').replace(/^\uFEFF/, ''));
  const byLabel = (label: string): string[] => {
    const row = lines.find((r) => r[1] === label);
    if (!row) throw new Error(`${file}: row "${label}" not found`);
    return row.slice(2);
  };
  const rows = new Map<string, string[]>();
  for (const r of lines) if (r[0]) rows.set(r[0], r.slice(2));
  // "Lithuania* **" → "Lithuania" (the stars point to footnotes about age brackets).
  return { names: byLabel('Country').map((n) => n.replace(/[*\s]+$/, '').trim()), years: byLabel('Survey year'), ages: byLabel('Age of reference'), rows };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function minutesOf(sheet: Sheet, col: number, where: string): Minutes {
  const v = (code: string, required = false): number => {
    const raw = (sheet.rows.get(code)?.[col] ?? '').trim();
    const n = Number(raw);
    if (raw !== '' && Number.isFinite(n)) return n;
    if (required) throw new Error(`${where}: main category ${code} is missing ("${raw}")`);
    return 0; // "..", "-", "(see notes)", empty — not reported separately
  };
  const residual = (parent: number, parts: number[], name: string): number => {
    const r = parent - parts.reduce((s, x) => s + x, 0);
    if (r < -0.05) throw new Error(`${where}: ${name} residual is ${r.toFixed(2)} (< 0)`);
    return Math.max(0, r);
  };
  const paid = v('1', true);
  const unpaid = v('2', true);
  const personal = v('3', true);
  const leisure = v('4', true);
  const m: Record<ActivityId, number> = {
    sleep: v('3.1'),
    eating: v('3.2'),
    'personal-care': 0,
    'paid-work': 0,
    study: v('1.3') + v('1.4'),
    commute: v('1.2'),
    housework: v('2.1'),
    shopping: v('2.2'),
    care: 0,
    errands: v('2.6'),
    tv: v('4.4'),
    social: v('4.2') + v('4.3'),
    sports: v('4.1'),
    'other-leisure': 0,
    other: v('5', true),
  };
  m['personal-care'] = residual(personal, [m.sleep, m.eating], 'personal care');
  m['paid-work'] = residual(paid, [m.study, m.commute], 'paid work');
  m.care = residual(unpaid, [m.housework, m.shopping, m.errands], 'care & other unpaid');
  m['other-leisure'] = residual(leisure, [m.tv, m.social, m.sports], 'other leisure');
  for (const a of ACTIVITY_IDS) m[a] = round2(m[a]);
  return m;
}

const sheets = Object.fromEntries(SEXES.map((s) => [s, readSheet(FILES[s])])) as Record<Sex, Sheet>;
const base = sheets.total;
if (base.names.length !== ISO.length) throw new Error(`expected ${ISO.length} countries, got ${base.names.length}`);

const countries: CountryRow[] = ISO.map(([name, code], i) => {
  for (const s of SEXES) {
    const sh = sheets[s];
    if (sh.names[i] !== name) throw new Error(`${FILES[s]} column ${i + 3}: "${name}" expected, got "${sh.names[i]}"`);
    if (sh.years[i] !== base.years[i] || sh.ages[i] !== base.ages[i]) throw new Error(`${name}: survey year/ages differ by sex`);
  }
  if (base.names[i] !== name) throw new Error(`column ${i + 3}: "${name}" expected, got "${base.names[i]}"`);
  const minutes = Object.fromEntries(SEXES.map((s) => [s, minutesOf(sheets[s], i, `${name} (${s})`)])) as Record<Sex, Minutes>;
  return {
    code,
    oecd: i < OECD_MEMBERS,
    // "2013/2014" and "2013/14" both appear — keep as published, normalised to the short form.
    surveyYear: base.years[i]!.replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2'),
    ages: base.ages[i]!,
    minutes,
  };
});

const dataset = parseTimeUse({ unit: 'minutes per day', release: RELEASE, countries });

mkdirSync(OUT_DIR, { recursive: true });
// One country per line block: small diffs when the OECD adds a survey.
const body = [
  '{',
  `  "unit": ${JSON.stringify(dataset.unit)},`,
  `  "release": ${JSON.stringify(dataset.release)},`,
  '  "countries": [',
  dataset.countries
    .map((c) => {
      const sexes = SEXES.map((s) => `      ${JSON.stringify(s)}: ${JSON.stringify(c.minutes[s])}`).join(',\n');
      return `    {"code": ${JSON.stringify(c.code)}, "oecd": ${c.oecd}, "surveyYear": ${JSON.stringify(c.surveyYear)}, "ages": ${JSON.stringify(c.ages)}, "minutes": {\n${sexes}\n    }}`;
    })
    .join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, DATA_FILE), body);

console.log(
  `✓ prep time-of-life — ${dataset.countries.length} countries (${dataset.countries.filter((c) => c.oecd).length} OECD), ` +
    `3 sexes × ${ACTIVITY_IDS.length} activities.`,
);

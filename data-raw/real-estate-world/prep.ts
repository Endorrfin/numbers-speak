/*
 * prep.ts — CHANGED (S3-re): real-estate-world raw files → public/data/real-estate-world/numbeo-2026-09.json.
 * Run: `npm run prep -- real-estate-world`.
 *
 * Inputs (this folder; sources, terms and sha256 in README.md):
 *  - numbeo-price-centre.txt   — Numbeo "Price Rankings by City: Price per Square Meter to Buy Apartment in City
 *                                Centre" (US$), copied by hand by the owner (Numbeo's terms forbid automated collection);
 *  - numbeo-price-outside.txt  — the same, "Outside of Centre";
 *  - numbeo-property-index.txt — Numbeo "Current Property Prices Index by City" (the owner saved it as .xlsx in
 *                                docs/data → extract-xlsx.py writes this file; a plain copy works the same);
 *  - city-names.csv            — Numbeo label → ISO code (checked), EN and UK display names and WGS 84 coordinates
 *                                (Wikidata P625; source=review rows await the owner's check, see README.md).
 * CHANGED (S3-re): all three tables come from the owner's workbook docs/data/Real estate.xlsx (27 Sep 2026) via
 * extract-xlsx.py, so the price tables are required again; each row gets a URL id ("kyiv-ua") and coordinates.
 * The tables are joined on Numbeo's city label ("Zug, Switzerland"). The country is the text after the last comma,
 * mapped to ISO by data-raw/_shared/numbeo.ts; the region comes from m49.ts. The script aborts on an unknown country,
 * a missing name or coordinate, a price not in US$, a duplicate or missing rank, a value that rises with rank, a changed
 * column order, a table that shrank below its expected size or two cities with the same id — and then checks the
 * output with the site's parser.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse, geoEqualEarth, geoPath } from 'd3';
import type { ExtendedFeature } from 'd3';
import { M49_REGION } from '../_shared/m49';
import { numbeoCountryCode } from '../_shared/numbeo';
import { DATA_FILE, LAND_FILE, METRICS, RANK_KEY, parseLand, parseRealEstateDataset } from '../../src/viz/real-estate-world/data';
import type { CityRow, LandLayer, Metric, RealEstateDataset } from '../../src/viz/real-estate-world/data';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/real-estate-world');
const RETRIEVED = '2026-09-27'; // CHANGED (S3-re): the owner's workbook with the three tables
const problems: string[] = [];

const FILES = {
  centre: 'numbeo-price-centre.txt',
  outside: 'numbeo-price-outside.txt',
  index: 'numbeo-property-index.txt',
  names: 'city-names.csv',
} as const;
/** Smallest plausible table (Numbeo listed 516 / 514 / 402 cities on 2026-09-27): a shorter copy was cut off. */
const MIN_ROWS = { centre: 450, outside: 450, index: 350 } as const;
/** Column order of the Property Prices Index after "Rank · City"; the copy must keep it. */
const INDEX_COLUMNS = [
  'Price To Income Ratio',
  'Gross Rental Yield City Centre',
  'Gross Rental Yield Outside of Centre',
  'Price To Rent Ratio City Centre',
  'Price To Rent Ratio Outside Of City Centre',
  'Mortgage As A Percentage Of Income',
  'Affordability Index',
] as const;

type Line = { rank: number; label: string; cells: string[]; at: string };

/** A Numbeo table as copied from the browser: tab-separated "rank(.) · city label · values…"; header lines, blank
 *  lines and the empty bar-chart cell are skipped. */
function readTable(file: string, minRows: number): { lines: Line[]; text: string } {
  const path = join(here, file);
  if (!existsSync(path)) {
    problems.push(`${file}: missing — owner step, see README.md`);
    return { lines: [], text: '' };
  }
  const file0 = readFileSync(path, 'utf8');
  const text = file0.charCodeAt(0) === 0xfeff ? file0.slice(1) : file0; // drop a byte-order mark
  const lines: Line[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const cells = raw.split('\t').map((c) => c.trim()).filter(Boolean);
    const m = /^(\d+)\.?$/.exec(cells[0] ?? '');
    if (!m || cells.length < 3) continue;
    lines.push({ rank: Number(m[1]), label: cells[1]!, cells: cells.slice(2), at: `${file} "${cells[1]}"` });
  }
  // CHANGED (S3-re): no optional tables any more — the owner's workbook carries all three (27 Sep 2026).
  if (lines.length < minRows) problems.push(`${file}: ${lines.length} rows parsed, expected ≥ ${minRows} — was the whole table copied?`);
  lines.forEach((l, i) => {
    if (l.rank !== i + 1) problems.push(`${l.at}: rank ${l.rank} at position ${i + 1} — rows missing or reordered`);
  });
  return { lines, text };
}

function num(raw: string | undefined, at: string, usd = false): number {
  const s = (raw ?? '').replace(/\s/g, '');
  if (usd && !s.startsWith('$')) problems.push(`${at}: "${raw}" is not in US$ — open the page with displayCurrency=USD`);
  const n = s.replace(/^\$/, '');
  if (!/^[\d,]+(\.\d+)?$/.test(n)) {
    problems.push(`${at}: "${raw}" is not a number`);
    return NaN;
  }
  return Number(n.replace(/,/g, ''));
}

const sha256 = (file: string): string => (existsSync(join(here, file)) ? createHash('sha256').update(readFileSync(join(here, file))).digest('hex') : '(missing)');

// ── names ────────────────────────────────────────────────────────────────────────────────────────
// CHANGED (S3-re): coordinates and the review flag come with the names.
type Name = { code: string; en: string; uk: string; lat: number; lon: number };
const names = new Map<string, Name>();
let toReview = 0;
function coord(raw: string | undefined, at: string, limit: number): number {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || Math.abs(n) > limit) problems.push(`${at}: coordinate "${raw ?? ''}" is not in ±${limit}`);
  return n;
}
if (existsSync(join(here, FILES.names))) {
  for (const d of csvParse(readFileSync(join(here, FILES.names), 'utf8'))) {
    const at = `${FILES.names} "${d.numbeo ?? ''}"`;
    if (!d.numbeo || !d.code || !d.en || !d.uk) problems.push(`${FILES.names}: incomplete row ${JSON.stringify(d)}`);
    else if (names.has(d.numbeo)) problems.push(`${at}: appears twice`);
    else names.set(d.numbeo, { code: d.code, en: d.en.trim(), uk: d.uk.trim(), lat: coord(d.lat, at, 90), lon: coord(d.lon, at, 180) });
    if (d.source === 'review') toReview += 1;
  }
} else problems.push(`${FILES.names}: missing — authoring step, see README.md`);

/** CHANGED (S3-re): URL id — the EN name in plain Latin letters + the ISO code ("Kraków" → "krakow-pl"). NFD strips
 *  accents; the few letters that do not decompose are mapped by hand. */
const PLAIN: Record<string, string> = { ł: 'l', ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', đ: 'd', ð: 'd', þ: 'th', ı: 'i' };
function cityId(en: string, code: string): string {
  const base = en
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[łøæœßđðþı]/g, (c) => PLAIN[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base}-${code.toLowerCase()}`;
}

// ── tables → rows ────────────────────────────────────────────────────────────────────────────────
const byLabel = new Map<string, CityRow>();
function cityOf(l: Line): CityRow | null {
  const known = byLabel.get(l.label);
  if (known) return known;
  const cut = l.label.lastIndexOf(', ');
  const country = cut > 0 ? l.label.slice(cut + 2) : '';
  const code = numbeoCountryCode(country);
  if (!code) {
    problems.push(`${l.at}: no ISO code for "${country}" — add it to NUMBEO_ALIASES in data-raw/_shared/numbeo.ts`);
    return null;
  }
  const region = M49_REGION.get(code);
  if (!region) problems.push(`${l.at}: ${code} has no M49 region`);
  const name = names.get(l.label);
  if (!name) problems.push(`${l.at}: no display name — add the city to ${FILES.names}`);
  else if (name.code !== code) problems.push(`${l.at}: ${FILES.names} says ${name.code}, the label says ${code}`);
  const en = name?.en ?? l.label;
  // CHANGED (S3-re): id and coordinates (the parser rejects a duplicate id with both labels in the message).
  const row: CityRow = {
    id: cityId(en, code),
    numbeo: l.label,
    name: { en, uk: name?.uk ?? l.label },
    code,
    region: region ?? 'europe',
    lat: name?.lat ?? 0,
    lon: name?.lon ?? 0,
  };
  byLabel.set(l.label, row);
  return row;
}

function take(lines: readonly Line[], metric: Metric, value: (l: Line) => number, extra?: (row: CityRow, l: Line) => void): void {
  const seen = new Set<string>();
  for (const l of lines) {
    if (seen.has(l.label)) problems.push(`${l.at}: listed twice`);
    seen.add(l.label);
    const row = cityOf(l);
    if (!row) continue;
    row[metric] = value(l);
    row[RANK_KEY[metric]] = l.rank;
    extra?.(row, l);
  }
}

const centre = readTable(FILES.centre, MIN_ROWS.centre);
const outside = readTable(FILES.outside, MIN_ROWS.outside);
const index = readTable(FILES.index, MIN_ROWS.index);
let lastIndex = -1;
for (const col of INDEX_COLUMNS) {
  const i = index.text.indexOf(col);
  if (index.text && i <= lastIndex) problems.push(`${FILES.index}: column "${col}" missing or out of order — copy Numbeo's table as shown`);
  lastIndex = i;
}
take(centre.lines, 'centre', (l) => num(l.cells[0], l.at, true));
take(outside.lines, 'outside', (l) => num(l.cells[0], l.at, true));
take(
  index.lines,
  'income',
  (l) => num(l.cells[0], l.at),
  (row, l) => {
    if (l.cells.length !== INDEX_COLUMNS.length) problems.push(`${l.at}: ${l.cells.length} values, expected ${INDEX_COLUMNS.length}`);
    row.mortgage = num(l.cells[5], l.at);
    row.rent = num(l.cells[3], l.at);
    row.rentOutside = num(l.cells[4], l.at); // CHANGED (S3-re)
  },
);

for (const label of names.keys()) if (!byLabel.has(label)) console.warn(`! ${FILES.names}: "${label}" is in no table (stale row — keep or remove)`);
const idOwner = new Map<string, string>(); // CHANGED (S3-re): two labels must not collapse into one id
for (const r of byLabel.values()) {
  const other = idOwner.get(r.id);
  if (other) problems.push(`id "${r.id}" for both "${other}" and "${r.numbeo}" — make the EN names in ${FILES.names} differ`);
  idOwner.set(r.id, r.numbeo);
}

// ── land layer for the map (CHANGED (S3-re)) ─────────────────────────────────────────────────────
// world-atlas 2.0.2 land-110m.json (Natural Earth 1:110m, public domain; world-atlas ISC — licence beside it),
// decoded here (a quantized TopoJSON: delta-encoded arcs), Antarctica dropped, projected once to Equal Earth.
const LAND_RAW = '../_shared/world-atlas-land-110m.json';
const LAND_SHA = 'ead5f68119c49a9250902e7da303bcb209341bbb8fefe7369a439b48b704658a';
const LAND_WIDTH = 1000;
type Topology = {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: Array<Array<[number, number]>>;
  objects: { land: { geometries: Array<{ type: string; arcs: number[][][] }> } };
};
function buildLand(): { layer: LandLayer; polygons: number } | null {
  const raw = readFileSync(join(here, LAND_RAW));
  const sha = createHash('sha256').update(raw).digest('hex');
  if (sha !== LAND_SHA) {
    problems.push(`${LAND_RAW}: sha256 ${sha}, expected ${LAND_SHA} — not the world-atlas 2.0.2 file (README.md)`);
    return null;
  }
  const topo = JSON.parse(raw.toString('utf8')) as Topology;
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]): [number, number] => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
  const ring = (ids: readonly number[]): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    for (const i of ids) {
      const arc = i < 0 ? [...arcs[~i]!].reverse() : arcs[i]!;
      out.push(...(out.length ? arc.slice(1) : arc));
    }
    return out;
  };
  const geometries = topo.objects.land.geometries;
  if (geometries.some((g) => g.type !== 'MultiPolygon')) problems.push(`${LAND_RAW}: expected MultiPolygon geometries`);
  const polygons = geometries
    .flatMap((g) => g.arcs)
    .map((p) => p.map(ring))
    .filter((p) => (p[0] ?? []).some(([, lat]) => lat > -60)); // Antarctica: no city south of 60° S
  const land: ExtendedFeature = { type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: polygons } };
  const projection = geoEqualEarth().fitWidth(LAND_WIDTH, land);
  const path = geoPath(projection).digits(1);
  const [, [, y1]] = path.bounds(land);
  const [a, b] = projection.translate();
  return {
    polygons: polygons.length,
    layer: {
      source: `Natural Earth 1:110m land via world-atlas 2.0.2 (land-110m.json, sha256 ${LAND_SHA.slice(0, 12)}…), Antarctica omitted, Equal Earth`,
      width: LAND_WIDTH,
      height: Math.ceil(y1 * 10) / 10,
      scale: Math.round(projection.scale() * 1e4) / 1e4,
      translate: [Math.round(a * 1e4) / 1e4, Math.round(b * 1e4) / 1e4],
      d: path(land) ?? '',
    },
  };
}
const landLayer = buildLand();

if (problems.length) {
  console.error(`✗ prep real-estate-world — ${problems.length} problem(s):\n  - ${problems.slice(0, 60).join('\n  - ')}`);
  process.exit(1);
}

// ── output ───────────────────────────────────────────────────────────────────────────────────────
const order = (r: CityRow): number[] => [r.centreRank ?? 1e6, r.outsideRank ?? 1e6, r.incomeRank ?? 1e6];
const rows = [...byLabel.values()].sort((a, b) => {
  const x = order(a);
  const y = order(b);
  return x[0]! - y[0]! || x[1]! - y[1]! || x[2]! - y[2]! || a.numbeo.localeCompare(b.numbeo);
});
const dataset: RealEstateDataset = { retrieved: RETRIEVED, rows };
parseRealEstateDataset(dataset, DATA_FILE); // fail fast on the same parser the site uses
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, DATA_FILE),
  ['{', `  "retrieved": "${RETRIEVED}",`, '  "rows": [', rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'), '  ]', '}', ''].join('\n'),
);
if (landLayer) {
  parseLand(landLayer.layer, LAND_FILE); // CHANGED (S3-re): the same parser as the site
  writeFileSync(join(OUT_DIR, LAND_FILE), `${JSON.stringify(landLayer.layer)}\n`);
  console.log(`✓ ${LAND_FILE} — ${landLayer.polygons} land polygons, ${landLayer.layer.width} × ${landLayer.layer.height}, ${landLayer.layer.d.length} path characters.`);
}
const count = (m: Metric): number => rows.filter((r) => r[m] !== undefined).length;
console.log(`✓ ${DATA_FILE} — ${rows.length} cities: ${METRICS.map((m) => `${m} ${count(m)}`).join(' · ')}.`);
for (const f of Object.values(FILES)) console.log(`  ${sha256(f)}  ${f}`);
if (toReview) console.warn(`! ${toReview} name(s) in ${FILES.names} still have source=review — owner step, see README.md`);

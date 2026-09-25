// test-previews.ts — CHANGED (S3-th): card previews. Every src/viz/<id>/preview.ts on its REAL data file
// (key figures and marks checked against the pages' own numbers), the contract validator, the "no country
// picked by code" rule, render-time formatting in both languages, colour tokens and the size budget.
// Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CardPreview, KeyFigure, PreviewNum, RowsMarks } from '../src/catalog/preview';
import { MAX_FLAGS, PREVIEW_TONES, parseCardPreview } from '../src/catalog/preview';
import { extremeRows, topRows, wholeParts } from '../src/catalog/previewKit';
import { formatKeyLabel, formatKeyValue, formatPeriodEnd, formatPreviewNum } from '../src/components/catalog/previewFormat';
import { DatasetError } from '../src/lib/dataset';
import { PREVIEWS_BUDGET_GZIP, buildPreview, generatePreviews, gzipSize, previewFolders } from './lib/previews';
import { ROOT } from './lib/viz-folders';

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ previews: ${name}\n`, e);
    process.exit(1);
  }
}

const one = (k: KeyFigure): PreviewNum => {
  assert.ok(!Array.isArray(k.value), 'single value expected');
  return k.value as PreviewNum;
};
const rowsOf = (p: CardPreview): RowsMarks => {
  assert.equal(p.marks.kind, 'rows');
  return p.marks as RowsMarks;
};
const close = (actual: number, expected: number, eps = 1e-3): void =>
  assert.ok(Math.abs(actual - expected) <= eps, `${actual} ≉ ${expected}`);

const built = new Map<string, CardPreview>();
for (const { id, dir } of previewFolders()) built.set(id, await buildPreview(id, dir));
const get = (id: string): CardPreview => {
  const p = built.get(id);
  assert.ok(p, `no preview for ${id}`);
  return p;
};

await test('every published entry has a preview; every preview passes the contract', async () => {
  const { ids } = await generatePreviews();
  assert.equal(ids.length, 15);
  for (const [id, p] of built) assert.deepEqual(parseCardPreview(p, id), p);
});

await test('global-peace-index: two most + two least peaceful on the 1–5 scale, flags on the extremes', () => {
  const p = get('global-peace-index');
  const m = rowsOf(p);
  assert.deepEqual(m.rows.map((r) => r.code), ['IS', 'NZ', 'SD', 'RU']);
  assert.deepEqual(m.rows.filter((r) => r.flag).map((r) => r.code), ['IS', 'RU']);
  assert.deepEqual(m.domain, [1, 5]);
  assert.deepEqual(m.gap, { after: 2, count: 159 });
  assert.deepEqual((p.key.value as readonly PreviewNum[]).map((v) => v.value), [1.161, 3.367]);
  assert.ok(!m.rows.some((r) => r.code === 'UA'), 'Ukraine (160th) is not an extreme');
});

await test('population-by-country: top five, India + China share of the world', () => {
  const p = get('population-by-country');
  assert.deepEqual(rowsOf(p).rows.map((r) => r.code), ['IN', 'CN', 'US', 'ID', 'PK']);
  close(one(p.key).value, (1_463_865_525 + 1_416_096_094) / 8_231_613_070, 1e-5);
  assert.equal(formatKeyValue(p.key, 'en'), '35%');
  assert.equal(formatKeyLabel(p.key, 'en'), 'India + China: share of the world population');
});

await test('rankings: gdp, gdp-ppp, land-area, crime-index, robotization', () => {
  const gdp = get('gdp-by-country');
  assert.deepEqual(rowsOf(gdp).rows.map((r) => r.code), ['US', 'CN', 'DE', 'JP', 'GB']);
  assert.equal(formatKeyValue(gdp.key, 'en'), '42.5%');
  const ppp = get('gdp-ppp-per-capita');
  assert.deepEqual(rowsOf(ppp).rows.map((r) => r.code), ['SG', 'LU', 'CF', 'BI']);
  assert.equal(formatKeyValue(ppp.key, 'en'), '131×');
  assert.equal(formatKeyValue(get('land-area').key, 'en'), '12.6%');
  assert.equal(formatKeyLabel(get('land-area').key, 'en'), "Russia: share of the world's land");
  const crime = get('crime-index');
  assert.equal(rowsOf(crime).rows[0]!.code, 'TC');
  assert.equal(formatKeyValue(crime.key, 'en'), '20×');
  assert.equal(one(get('robotization').key).value, 132);
});

await test('births-deaths-per-day: the highest ratio of all 235 countries, top five by births', () => {
  const p = get('births-deaths-per-day');
  assert.equal(p.marks.kind, 'butterfly');
  assert.equal(formatKeyValue(p.key, 'en'), '2.18');
  assert.equal(formatKeyLabel(p.key, 'uk'), 'Україна: найбільше смертей на одне народження серед 235 країн');
});

await test('series: births-deaths-ua, donations (record month), volunteers-growth (12 months)', () => {
  const bd = get('births-deaths-ua');
  assert.equal(formatKeyValue(bd.key, 'en'), '2.88');
  assert.equal(formatKeyLabel(bd.key, 'en'), 'deaths per birth, 2025');
  const don = get('donations');
  assert.equal(formatKeyValue(don.key, 'en'), 'UAH 4.71 bn');
  assert.equal(formatKeyValue(don.key, 'uk'), '4,71 млрд грн');
  assert.equal(formatKeyLabel(don.key, 'uk'), 'рекордний місяць · грудень 2023');
  assert.equal(don.marks.kind === 'series' && don.marks.peak?.index, 22);
  const vol = get('volunteers-growth');
  assert.equal(one(vol.key).value, 11_792 - 10_466);
  assert.equal(formatKeyValue(vol.key, 'en'), '+1,326');
});

await test('air-attacks-on-ukraine: 127,044 launched; monthly stacks add up; incomplete months marked', () => {
  const p = get('air-attacks-on-ukraine');
  assert.equal(one(p.key).value, 127_044);
  assert.equal(p.marks.kind, 'columns');
  if (p.marks.kind !== 'columns') return;
  assert.equal(p.marks.stacks.length, 49);
  assert.deepEqual(p.marks.stacks[0], [9, 3]); // Sep 2022: 12 launched, 9 shot down
  assert.deepEqual(p.marks.partial, [0, 48]);
  assert.equal(p.marks.from, '2022-09');
  assert.equal(p.marks.to, '2026-09');
});

await test('brands, time of life, volunteers by region', () => {
  const b = get('global-brands-race');
  assert.deepEqual(rowsOf(b).rows.map((r) => r.name?.en), ['Apple', 'Microsoft', 'Amazon', 'Google', 'Samsung']);
  assert.ok(!rowsOf(b).rows.some((r) => r.flag));
  assert.equal(formatKeyValue(b.key, 'en'), '63%');
  const tl = get('time-of-life');
  assert.equal(formatKeyValue(tl.key, 'en'), '17.6 years');
  assert.equal(formatKeyValue(tl.key, 'uk'), '17,6 року');
  assert.ok(tl.marks.kind === 'grid' && tl.marks.counts.reduce((s, n) => s + n, 0) === 50);
  const vr = get('volunteers-by-region');
  assert.equal(rowsOf(vr).rows[0]!.name?.en, 'Kyiv');
  assert.equal(formatKeyValue(vr.key, 'en'), '24%');
});

await test('no preview picks a country by code: no quoted ISO2 literal in any preview.ts', () => {
  for (const { id, dir } of previewFolders()) {
    const src = readFileSync(join(dir, 'preview.ts'), 'utf8');
    const hit = src.match(/['"`][A-Z]{2}['"`]/);
    assert.equal(hit, null, `src/viz/${id}/preview.ts names a country (${hit?.[0]}) — choose rows by rank`);
  }
});

await test('the validator rejects too many flags, unknown tones, formats and placeholders without args', () => {
  const ok = get('population-by-country');
  const withFlags = structuredClone(ok) as unknown as { marks: { rows: Array<{ flag?: true }> } };
  withFlags.marks.rows.forEach((r) => (r.flag = true));
  assert.throws(() => parseCardPreview(withFlags), new RegExp(`at most ${MAX_FLAGS}`));
  const badTone = structuredClone(ok) as unknown as { marks: { rows: Array<{ tone: string }> } };
  badTone.marks.rows[0]!.tone = 'red; background: url(x)';
  assert.throws(() => parseCardPreview(badTone), DatasetError);
  const badFormat = structuredClone(ok) as unknown as { key: { value: { format: string } } };
  badFormat.key.value.format = 'html';
  assert.throws(() => parseCardPreview(badFormat), DatasetError);
  const noArg = structuredClone(ok) as unknown as { key: { label: { en: string } } };
  noArg.key.label.en = '{missing} share';
  assert.throws(() => parseCardPreview(noArg), /\{missing\} has no arg/);
});

await test('kit: top and extreme rows, whole parts', () => {
  const items = [5, 4, 3, 2, 1].map((v, i) => ({ code: ['AA', 'BB', 'CC', 'DD', 'EE'][i]!, value: v, tone: 'region-asia' as const }));
  assert.deepEqual(topRows(items, 3, 'int', 1).rows.map((r) => !!r.flag), [true, false, false]);
  const ex = extremeRows(items, 2, 'int');
  assert.deepEqual(ex.rows.map((r) => r.code), ['AA', 'BB', 'DD', 'EE']);
  assert.deepEqual(ex.gap, { after: 2, count: 1 });
  assert.throws(() => extremeRows(items.slice(0, 4), 2, 'int'));
  assert.deepEqual(wholeParts([1, 1, 1], 10), [4, 3, 3]);
  assert.deepEqual(wholeParts([0, 0], 5), [0, 0]); // no data: no cells
});

await test('formatting in both languages', () => {
  assert.equal(formatPreviewNum(127_044, 'int', 'en'), '127,044');
  assert.equal(formatPreviewNum(127_044, 'int', 'uk').replace(/\s/g, ' '), '127 044');
  assert.equal(formatPreviewNum(1.161, 'score', 'uk'), '1,161');
  assert.equal(formatPreviewNum(0, 'signed-int', 'en'), '0');
  assert.equal(formatPreviewNum(2025, 'year', 'uk'), '2025');
  assert.equal(formatPeriodEnd('2022-02', 'en'), 'Feb 2022');
  assert.equal(formatPeriodEnd('2022-02', 'uk'), 'лют 2022');
  assert.equal(formatPeriodEnd('1990', 'uk'), '1990');
  assert.equal(formatPeriodEnd('2023-12', 'en', 'long'), 'December 2023');
});

await test('every tone is a colour token defined in theme/tokens.css', () => {
  const css = readFileSync(join(ROOT, 'src/theme/tokens.css'), 'utf8');
  for (const tone of PREVIEW_TONES) assert.ok(css.includes(`--c-${tone}:`), `--c-${tone} missing`);
});

await test('the generated file is deterministic and within the gzip budget', async () => {
  const a = await generatePreviews();
  const b = await generatePreviews();
  assert.equal(a.source, b.source);
  assert.ok(gzipSize(a.source) <= PREVIEWS_BUDGET_GZIP, `${gzipSize(a.source)} B gzip`);
});

console.log(`✓ previews — ${passed} tests passed.`);

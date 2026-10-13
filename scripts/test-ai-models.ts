// test-ai-models.ts — CHANGED (S3-ai1): the AI-models entry — the rule that picks the eight companies (recomputed from the
// raw extracts over every organization), the four dataset contracts and their rejections, the shipped files against the
// raw rows, the derivations the angles draw (periods, lanes, trend, origins), the axis ticks and the URL state.
// Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatasetError } from '../src/lib/dataset';
import {
  DATA_FILES,
  FILES,
  ancestorOrgs,
  accessOf,
  arenaDays,
  candidates,
  computeTrend,
  decimalYear,
  derivedFrom,
  fullPeriod,
  heroCriterion,
  heroOfModel,
  isFull,
  isLanguageModel,
  knownCompany,
  laneSummaries,
  monthEndMs,
  monthOfMs,
  monthStartMs,
  monthsBetween,
  originOf,
  parseArena,
  parseCompute,
  parseOrigins,
  parseReleases,
  partialYear,
  periodMonths,
  resolvePeriod,
  validateDataFile,
  yearTotal,
} from '../src/viz/ai-models/data';
import meta from '../src/viz/ai-models/meta';
import { SHOWS, parseAiState, switchShow, toAiParams } from '../src/viz/ai-models/state';
import { flopTicks, formatFlopTick, formatYearTick, yearTicks } from '../src/viz/ai-models/ticks';
import { formatFlop, formatMonth, formatPowerOfTen } from '../src/lib/format';
import { readArena, readEpoch, readHeroes } from '../data-raw/ai-models/raw';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ ai-models: ${name}\n`, e);
    process.exit(1);
  }
}

/** No-break space (a char code: the agent's shell bridge decodes typed escapes — CLAUDE.md §12). */
const NB = String.fromCharCode(0xa0);
const shipped = (f: string): unknown => JSON.parse(readFileSync(`public/data/ai-models/${f}`, 'utf8'));
const releases = parseReleases(shipped(FILES.releases));
const compute = parseCompute(shipped(FILES.compute));
const origins = parseOrigins(shipped(FILES.origins));
const arena = parseArena(shipped(FILES.arena));
const heroes = readHeroes();
const epoch = readEpoch();
const lineage = ancestorOrgs(epoch);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const rejects = (fn: () => unknown, re: RegExp): void => assert.throws(fn, (e: unknown) => e instanceof DatasetError && re.test(e.message));

test('the rule, recomputed over every organization in both files, names exactly the eight of heroes.csv', () => {
  const all = candidates(readArena(), lineage, heroes);
  assert.deepEqual(heroCriterion(all).sort(), heroes.map((h) => h.id).sort());
  const by = new Map(all.map((c) => [c.name, c]));
  // Days in the top 3 (docs/AI-MODELS-PLAN.md §2, S3-ai0): unchanged.
  assert.deepEqual(
    ['openai', 'anthropic', 'google', 'xai', 'deepseek', 'mistral'].map((id) => by.get(id)!.top3Days),
    [669, 499, 462, 209, 86, 44],
  );
  // Meta and Alibaba pass on derived models only; nobody outside reaches either bar.
  assert.ok(by.get('meta')!.top3Days < 30 && by.get('meta')!.derived >= 100);
  assert.ok(by.get('alibaba')!.top3Days < 30 && by.get('alibaba')!.derived >= 100);
  const outside = all.filter((c) => !heroes.some((h) => h.id === c.name));
  assert.ok(outside.every((c) => c.top3Days < 30 && c.derived < 100));
  assert.ok(outside.length > 100, `${outside.length} organizations were tested`);
});

test('arena: days at No. 1 cover the span exactly; the shipped file equals the raw extract', () => {
  const d = arenaDays(arena);
  assert.equal(d.total, 1042);
  assert.equal([...d.first.values()].reduce((s, v) => s + v, 0), d.total);
  assert.deepEqual(Object.fromEntries([...d.first].sort((a, b) => b[1] - a[1])), { openai: 501, anthropic: 256, google: 222, deepseek: 38, xai: 25 });
  assert.deepEqual(arena, readArena());
  assert.equal(arena.snapshots.length, 239);
});

test('lanes: a model needs the line name AND the company as its organization', () => {
  const h = (model: string, orgs: string[]) => heroOfModel({ model, orgs }, heroes);
  assert.equal(h('GPT-4o', ['OpenAI']), 'openai');
  assert.equal(h('gpt-oss-120b', ['OpenAI']), 'openai'); // case-insensitive
  assert.equal(h('GPT-NeoX-20B', ['EleutherAI']), null); // the mockup's error
  assert.equal(h('Llama Nemotron Ultra 253B', ['Nvidia']), null);
  assert.equal(h('Code Llama-34B', ['Meta AI']), 'meta');
  assert.equal(h('Gemma 3 27B', ['Google DeepMind']), 'google');
  assert.equal(h('Gemma-SEA-LION-v4-27B-IT', ['AI Singapore']), null);
  assert.equal(h('BERT-Large', ['Google']), null); // outside the lines
  // Every shipped lane model passes the same test on its raw row.
  const raw = new Map(epoch.map((m) => [`${m.date} ${m.model}`, m]));
  for (const r of releases.rows) {
    const m = raw.get(`${r.date} ${r.model}`)!;
    assert.ok(m && isLanguageModel(m), r.model);
    assert.equal(heroOfModel(m, heroes), r.hero, r.model);
    assert.equal(m.access, r.access, r.model);
  }
  assert.equal(releases.rows.length, epoch.filter((m) => isLanguageModel(m) && heroOfModel(m, heroes)).length);
  assert.equal(releases.rows.length, 382);
});

test('releases: heroes in the order of their first model, with the rule evidence', () => {
  assert.deepEqual(
    releases.heroes.map((h) => `${h.id} ${h.first.slice(0, 7)}`),
    ['openai 2018-06', 'google 2022-04', 'meta 2023-02', 'anthropic 2023-03', 'alibaba 2023-08', 'mistral 2023-10', 'deepseek 2023-11', 'xai 2023-11'],
  );
  for (const h of releases.heroes) {
    const def = heroes.find((d) => d.id === h.id)!;
    assert.equal(h.derived, derivedFrom(lineage, def.orgs).models, h.id);
  }
  assert.deepEqual(releases.rule.nextTop3, { name: 'AllenAI/UW', days: 9 });
  assert.equal(releases.through, '2026-09-30');
});

test('contracts reject bad files', () => {
  const r = clone(shipped(FILES.releases)) as { rows: Array<Record<string, unknown>>; heroes: Array<Record<string, unknown>> };
  r.rows[0]!.hero = 'nobody';
  rejects(() => parseReleases(r), /hero/);
  const r2 = clone(shipped(FILES.releases)) as { rows: Array<Record<string, unknown>> };
  r2.rows.reverse();
  rejects(() => parseReleases(r2), /sorted/);
  const r3 = clone(shipped(FILES.releases)) as { heroes: Array<Record<string, unknown>> };
  r3.heroes[0]!.first = '2017-01-01';
  rejects(() => parseReleases(r3), /first model/);
  const c = clone(shipped(FILES.compute)) as { rows: Array<Record<string, unknown>> };
  c.rows[0]!.flop = -1;
  rejects(() => parseCompute(c), /flop/);
  const o = clone(shipped(FILES.origins)) as { access: { open: number[] } };
  o.access.open[0]! += 1;
  rejects(() => parseOrigins(o), /by country/);
  const a = clone(shipped(FILES.arena)) as { snapshots: Array<{ top: Array<{ rank: number }> }> };
  a.snapshots[5]!.top[1]!.rank = 1;
  rejects(() => parseArena(a), /exactly one rank 1/);
  const a2 = clone(shipped(FILES.arena)) as { snapshots: Array<{ config: string }> };
  a2.snapshots[0]!.config = 'text_style_control';
  rejects(() => parseArena(a2), /switch/);
  rejects(() => validateDataFile('nope.json', {}), /no parser/);
  assert.deepEqual([...meta.data].sort(), [...DATA_FILES].sort());
});

test('compute: every model with a figure, the trend ×4.7 a year, disclosure per company', () => {
  assert.equal(compute.rows.length, epoch.filter((m) => m.flop !== null).length);
  assert.equal(compute.rows.length, 1242);
  assert.equal(compute.models, 3131);
  const trend = computeTrend(compute.rows);
  assert.equal(Math.round(trend.perYear * 10) / 10, 4.7);
  assert.deepEqual(compute.disclosed.anthropic, [3, 30]);
  for (const h of heroes) {
    const own = epoch.filter((m) => heroOfModel(m, heroes) === h.id);
    assert.deepEqual(compute.disclosed[h.id], [own.filter((m) => m.flop !== null).length, own.length], h.id);
  }
  assert.equal(decimalYear('2024-01-01'), 2024);
  assert.ok(Math.abs(decimalYear('2024-07-02') - 2024.5) < 0.003);
});

test('origins: counts from the raw rows; 2024 China 188 vs U.S. 186; 2026 partial', () => {
  const lang = epoch.filter(isLanguageModel);
  origins.years.forEach((y, i) => {
    const ofYear = lang.filter((m) => m.date.startsWith(String(y)));
    assert.equal(yearTotal(origins, i), ofYear.length, String(y));
    assert.equal(origins.country.cn[i], ofYear.filter((m) => originOf(m.country) === 'cn').length);
    assert.equal(origins.access.open[i], ofYear.filter((m) => m.access === 'open').length);
  });
  const i24 = origins.years.indexOf(2024);
  assert.deepEqual([origins.country.cn[i24], origins.country.us[i24]], [188, 186]);
  assert.deepEqual([origins.access.open[i24], yearTotal(origins, i24)], [273, 485]);
  assert.equal(partialYear(origins), true);
  assert.equal(accessOf('Open weights (non-commercial)'), 'open');
  assert.equal(accessOf('Unreleased'), 'closed');
  assert.equal(accessOf(''), 'unknown');
  assert.equal(originOf('China,United States of America'), 'cn');
  assert.equal(originOf(''), 'other');
});

test('periods: months, clipping, order, full span; lane summaries', () => {
  const full = fullPeriod(releases);
  assert.deepEqual(full, { from: '2017-01', to: '2026-09' });
  assert.deepEqual(resolvePeriod(full, null, null), full);
  assert.deepEqual(resolvePeriod(full, '2025-06', '2024-01'), { from: '2024-01', to: '2025-06' }); // put in order
  assert.deepEqual(resolvePeriod(full, '2010-01', '2030-12'), full); // clipped
  assert.equal(isFull(resolvePeriod(full, '2017-01', '2026-09'), full), true);
  assert.equal(periodMonths({ from: '2024-01', to: '2025-12' }), 24);
  assert.equal(monthsBetween('2024-11', '2025-02').join(), '2024-11,2024-12,2025-01,2025-02');
  assert.equal(monthOfMs(monthEndMs('2024-12') - 1), '2024-12');
  assert.equal(monthOfMs(monthStartMs('2024-12')), '2024-12');
  const sums = laneSummaries(releases, full);
  assert.equal(sums.reduce((s, x) => s + x.models.length, 0), releases.rows.length);
  const y25 = laneSummaries(releases, { from: '2025-01', to: '2025-12' });
  assert.ok(y25.every((s) => s.models.every((m) => m.date.startsWith('2025'))));
  assert.equal(knownCompany(releases.heroes, 'openai'), 'openai');
  assert.equal(knownCompany(releases.heroes, 'nobody'), null);
});

test('ticks and formats of angle B', () => {
  assert.deepEqual(yearTicks([2017, 2026.8]), [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
  assert.deepEqual(yearTicks([2024.1, 2025.9]), [2024.25, 2024.5, 2024.75, 2025, 2025.25, 2025.5, 2025.75]);
  assert.equal(yearTicks([2025.0, 2025.5]).length, 7); // months
  assert.deepEqual(flopTicks([1e14, 1e27]), [1e14, 1e16, 1e18, 1e20, 1e22, 1e24, 1e26]);
  assert.deepEqual(flopTicks([1e24, 1e26]).map((v) => Math.round(Math.log10(v) * 100) / 100), [24, 24.3, 24.7, 25, 25.3, 25.7, 26]);
  assert.equal(formatPowerOfTen(26), '10²⁶');
  assert.equal(formatFlop(3.8e26, 'en'), `3.8${NB}×${NB}10²⁶`);
  assert.equal(formatFlop(3.8e26, 'uk'), `3,8${NB}×${NB}10²⁶`);
  assert.equal(formatFlop(9.96e24, 'en'), `1.0${NB}×${NB}10²⁵`); // rounding carries into the exponent
  assert.equal(formatFlopTick(1e24, 'en'), '10²⁴');
  assert.equal(formatYearTick(2024, 'en'), '2024');
  assert.match(formatYearTick(2024.5, 'en'), /Jul 2024/);
  assert.match(formatMonth('2024-07', 'uk'), /2024/);
});

test('URL state: defaults omitted, shapes checked, angle-only parameters dropped', () => {
  const s = parseAiState({});
  assert.deepEqual(s, { show: 'timeline', company: null, from: null, to: null, split: 'country', view: 'chart' });
  assert.deepEqual(toAiParams(s), {});
  const a = parseAiState({ company: 'openai', from: '2024-01', to: '2025-06', view: 'table' });
  assert.deepEqual(toAiParams(a), { company: 'openai', from: '2024-01', to: '2025-06', view: 'table' });
  assert.deepEqual(toAiParams(switchShow(a, 'scale')), { show: 'scale', company: 'openai', view: 'table' });
  assert.deepEqual(toAiParams(switchShow(a, 'origins')), { show: 'origins', view: 'table' });
  assert.deepEqual(toAiParams(parseAiState({ show: 'origins', split: 'access' })), { show: 'origins', split: 'access' });
  const bad = parseAiState({ show: 'x', company: '<script>', from: '2024-13', to: '24-01', split: 'y', view: 'z' });
  assert.deepEqual(bad, s);
  assert.deepEqual([...SHOWS], ['timeline', 'scale', 'origins']);
});

console.log(`✓ ai-models — ${passed} test groups passed (releases ${releases.rows.length} · compute ${compute.rows.length} · arena ${arena.snapshots.length}).`);

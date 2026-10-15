// test-ai-models.ts — CHANGED (S3-ai1): the AI-models entry — the rule that picks the eight companies (recomputed from the
// raw extracts over every organization), the four dataset contracts and their rejections, the shipped files against the
// raw rows, the derivations the angles draw (periods, lanes, trend, origins), the axis ticks and the URL state.
// CHANGED (S3-ai2): + angles C · D · E — No. 1 runs, claims (raw = shipped, one line per product + measure), lineage trees
// (= the rule's counts), the tree cut, the user axis; six data files.
// CHANGED (S3-ai3): + the headline / "Did you know" numbers (insights.ts), each recomputed here a second way from the
// shipped files, and the timeline's events (first-party launch; first days at No. 1 without the series start).
// Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatasetError } from '../src/lib/dataset';
import {
  DATA_FILES,
  FILES,
  FIRST_YEAR,
  ancestorOrgs,
  accessOf,
  arenaDays,
  arenaLeaders,
  arenaRuns,
  claimSeries,
  familyTrees,
  lineageTree,
  parseClaims,
  parseLineage,
  silentCompanies,
  top3Spans,
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
import { readArena, readClaims, readEpoch, readHeroes } from '../data-raw/ai-models/raw';
import { TREE_CAPS, claimText, familyView, lastDay, userAxis } from '../src/viz/ai-models/views';
import { MANUAL_EVENTS, arenaFirsts, biggestJump, busiestMonth, firstOpenMajority, firstVsLargest, largestOfYear, recentShare } from '../src/viz/ai-models/insights';
import { baseFacts, companyRuns, fastestDoubling, leadFacts, oneIn, topBases } from '../src/viz/ai-models/views';
import { parsePopDataset } from '../src/viz/population-by-country/data';

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
const claimsDs = parseClaims(shipped(FILES.claims)); // CHANGED (S3-ai2)
const lineageDs = parseLineage(shipped(FILES.lineage));
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
  assert.deepEqual([...SHOWS], ['timeline', 'scale', 'arena', 'users', 'lineage', 'origins']);
  // CHANGED (S3-ai2): C · D · E keep the highlighted company and nothing else.
  for (const show of ['arena', 'users', 'lineage'] as const) {
    assert.deepEqual(toAiParams(switchShow(a, show)), { show, company: 'openai', view: 'table' });
    assert.deepEqual(toAiParams(parseAiState({ show, split: 'access', from: '2024-01' })), { show });
  }
});

// ── CHANGED (S3-ai2) ──────────────────────────────────────────────────────────────────────────────

test('C: 32 runs at No. 1 cover the span; days per company 501 · 256 · 222 · 38 · 25; top-3 stretches add up to the rule', () => {
  const runs = arenaRuns(arena);
  assert.equal(runs.length, 32);
  assert.equal(runs[0]!.from, arena.snapshots[0]!.date);
  assert.equal(runs.at(-1)!.to, arena.end);
  runs.forEach((r, i) => {
    if (i > 0) assert.equal(r.from, runs[i - 1]!.to, `run ${i} starts where ${i - 1} ends`);
    if (i > 0) assert.ok(r.model !== runs[i - 1]!.model, `run ${i} changes the model`);
  });
  assert.equal(runs.reduce((s, r) => s + r.days, 0), 1042);
  const leaders = arenaLeaders(arena);
  assert.deepEqual(leaders.map((l) => [l.org, l.first]), [['openai', 501], ['anthropic', 256], ['google', 222], ['deepseek', 38], ['xai', 25]]);
  for (const l of leaders) {
    assert.equal(l.runs.reduce((s, r) => s + r.days, 0), l.first, l.org);
    const top3 = top3Spans(arena, l.org).reduce((s, x) => s + Math.round((Date.parse(x.to) - Date.parse(x.from)) / 86_400_000), 0);
    assert.equal(top3, l.top3, l.org);
    assert.equal(top3, releases.heroes.find((h) => h.id === l.org)!.top3Days, `${l.org} = releases.json`);
  }
  // Every company that held No. 1 is one of the eight (names on the page come from releases.json).
  assert.ok(leaders.every((l) => releases.heroes.some((h) => h.id === l.org)));
  assert.equal(lastDay('2024-03-01'), '2024-02-29');
});

test('D: claims.json = user-claims.csv; first-party https only; lines never join two measures', () => {
  assert.deepEqual(claimsDs, readClaims(heroes));
  assert.equal(claimsDs.claims.length, 19);
  assert.ok(claimsDs.claims.every((c) => c.url.startsWith('https://') && c.quote.length > 10));
  // Only company domains (no press, no trackers).
  const hosts = new Set(claimsDs.claims.map((c) => new URL(c.url).hostname));
  assert.deepEqual([...hosts].sort(), ['blog.google', 'openai.com', 's21.q4cdn.com', 'www.microsoft.com', 'www.sec.gov']);
  const series = claimSeries(claimsDs);
  assert.deepEqual(series.map((s) => s.key), ['chatgpt:weekly_active', 'copilot:monthly_family', 'gemini:monthly_active', 'grok:monthly_incl_x', 'metaai:monthly_in_apps']);
  for (const s of series) assert.ok(s.claims.every((c) => c.product === s.product && c.metric === s.metric));
  assert.equal(claimsDs.claims.find((c) => c.company === 'Microsoft')!.hero, null);
  assert.equal(claimsDs.claims.find((c) => c.product === 'chatgpt')!.hero, 'openai');
  assert.deepEqual(silentCompanies(releases.heroes, claimsDs), ['Anthropic', 'Alibaba', 'Mistral', 'DeepSeek']);
  // The S3-ai2 additions: two openai.com posts and Google I/O 2025.
  assert.deepEqual(series[0]!.claims.slice(0, 2).map((c) => [c.asOf, c.value]), [['2024-10-02', 250e6], ['2025-03-31', 500e6]]);
  assert.deepEqual(series[2]!.claims[0]!.value, 400e6);
  assert.equal(claimText({ value: 8e8, qualifier: 'more_than' }, 'en'), 'more than 800 million');
  assert.equal(claimText({ value: 1e9, qualifier: 'almost' }, 'uk'), `майже 1${NB}млрд`);
  assert.deepEqual(userAxis([1.17e8, 1.2e9]), { domain: [1e8, 2e9], ticks: [1e8, 2e8, 5e8, 1e9, 2e9] });
  const c = clone(shipped(FILES.claims)) as { claims: Array<Record<string, unknown>> };
  c.claims[0]!.url = 'http://example.com';
  rejects(() => parseClaims(c), /url/);
  const c2 = clone(shipped(FILES.claims)) as { claims: Array<Record<string, unknown>> };
  c2.claims[0]!.metric = 'daily';
  rejects(() => parseClaims(c2), /metric/);
  const c3 = clone(shipped(FILES.claims)) as { claims: Array<Record<string, unknown>> };
  c3.claims.reverse();
  rejects(() => parseClaims(c3), /sorted/);
});

test('E: one tree per company with exactly the rule’s counts; per-year counts; roots are the company’s own models', () => {
  assert.deepEqual(lineageDs.heroes.map((h) => `${h.id} ${h.derived}/${h.orgs}`), ['meta 197/157', 'google 122/81', 'alibaba 112/73', 'openai 59/47', 'mistral 32/25', 'deepseek 22/10', 'anthropic 1/0', 'xai 0/0']);
  const byName = new Map(epoch.map((m) => [m.model, m]));
  for (const h of lineageDs.heroes) {
    const rel = releases.heroes.find((x) => x.id === h.id)!;
    const def = heroes.find((x) => x.id === h.id)!;
    assert.equal(h.derived, rel.derived, h.id);
    assert.equal(h.orgs, rel.derivedOrgs, h.id);
    assert.deepEqual({ id: h.id, ...lineageTree(epoch, def.orgs, lineageDs.years) }, h, `${h.id}: shipped = recomputed`);
    for (const n of h.nodes.filter((x) => x.parent === null)) assert.ok(byName.get(n.model)!.orgs.some((o) => def.orgs.includes(o)), `${h.id} root ${n.model}`);
    const trees = familyTrees(h);
    assert.equal(trees.reduce((s, t) => s + t.size, 0), h.derived, `${h.id}: every derived model hangs in a tree once`);
  }
  assert.equal(lineageDs.years.at(-1), 2026);
  const meta = lineageDs.heroes[0]!;
  assert.deepEqual(meta.byYear.slice(5), [2, 82, 94, 19, 0]);
  const big = familyTrees(meta)[0]!;
  assert.equal(big.model, 'LLaMA-7B');
  assert.equal(big.size, 29);
  const l = clone(shipped(FILES.lineage)) as { heroes: Array<{ derived: number; nodes: Array<{ parent: string | null }> }> };
  l.heroes[0]!.derived += 1;
  rejects(() => parseLineage(l), /have a parent/);
  const l2 = clone(shipped(FILES.lineage)) as { heroes: Array<{ nodes: Array<{ parent: string | null }> }> };
  l2.heroes[0]!.nodes.at(-1)!.parent = 'Not a model';
  rejects(() => parseLineage(l2), /not in the tree/);
});

test('E: the tree cut — at most 6 families, 5 children, 3 grandchildren; the rest named as “+n more”', () => {
  const more = (n: number, m: number): string => `+${n} (${m})`;
  for (const h of lineageDs.heroes.filter((x) => x.derived > 0)) {
    const trees = familyTrees(h);
    const { roots, shown } = familyView(trees, TREE_CAPS, more);
    const real = roots.filter((r) => !r.more);
    assert.ok(real.length <= TREE_CAPS.roots);
    assert.equal(roots.some((r) => r.more), trees.length > TREE_CAPS.roots, h.id);
    for (const r of real) {
      assert.ok((r.children ?? []).filter((c) => !c.more).length <= TREE_CAPS.children);
      for (const c of r.children ?? []) {
        assert.ok((c.children ?? []).filter((g) => !g.more).length <= TREE_CAPS.grandchildren);
        for (const g of c.children ?? []) assert.equal(g.children, undefined, 'nothing drawn below the grandchildren');
      }
    }
    // Shown + everything the "+n" leaves and "+k" subtitles stand for = all derived models.
    const count = (list: typeof roots): number =>
      list.reduce((s, d) => {
        if (d.more) return s + Number(/\((\d+)\)/.exec(d.label)![1]);
        const hidden = /\+(\d+)$/.exec(d.sub ?? '');
        return s + (hidden ? Number(hidden[1]) : 0) + count(d.children ?? []);
      }, 0);
    assert.equal(shown + count(roots), h.derived, h.id);
  }
});

// ── CHANGED (S3-ai3): insights ───────────────────────────────────────────────────────────────────────

test('S3-ai3 A: events — the launch is first-party and inside the span; first days at No. 1 skip the series start', () => {
  for (const e of MANUAL_EVENTS) {
    assert.match(e.url, /^https:\/\/openai\.com\//);
    assert.ok(e.date >= `${FIRST_YEAR}-01-01` && e.date <= releases.through, e.key);
    assert.ok(e.quote.length > 20 && e.title.en && e.title.uk);
  }
  // A second way: walk the snapshots, note each organization's first day at rank 1.
  const seen = new Map<string, string>();
  for (const s of arena.snapshots) {
    const org = s.top.find((x) => x.rank === 1)!.org;
    if (!seen.has(org)) seen.set(org, s.date);
  }
  const start = arena.snapshots[0]!.date;
  const expected = [...seen].filter(([, d]) => d !== start).map(([org, date]) => ({ org, date }));
  assert.deepEqual(arenaFirsts(arena).map(({ org, date }) => ({ org, date })), expected);
  assert.ok(expected.length >= 1 && !expected.some((e) => e.date === start));
  // Every company with a first day is one of the eight (its name comes from releases.json).
  for (const f of arenaFirsts(arena)) assert.ok(releases.heroes.some((h) => h.id === f.org), f.org);
});

test('S3-ai3 A: busiest month and the share of the last three years', () => {
  const counts = new Map<string, number>();
  for (const r of releases.rows) counts.set(r.date.slice(0, 7), (counts.get(r.date.slice(0, 7)) ?? 0) + 1);
  const max = Math.max(...counts.values());
  const first = [...counts].filter(([, n]) => n === max).map(([m]) => m).sort()[0];
  assert.deepEqual(busiestMonth(releases.rows), { month: first, n: max });
  assert.equal(busiestMonth([]), null);
  const from = Number(releases.through.slice(0, 4)) - 2;
  const r = recentShare(releases.rows, releases.through, 3);
  assert.deepEqual(r, { from, n: releases.rows.filter((x) => x.date >= `${from}-01-01`).length, total: releases.rows.length });
});

test('S3-ai3 B: first model of the eight with a figure vs the largest; the largest of the first year', () => {
  const eight = compute.rows.filter((r) => r.hero !== null).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.flop - a.flop));
  const top = [...compute.rows].sort((a, b) => b.flop - a.flop)[0]!;
  const c = firstVsLargest(compute.rows);
  assert.equal(c.first, eight[0]);
  assert.equal(c.top, top);
  assert.ok(Math.abs(c.ratio - top.flop / eight[0]!.flop) < 1e-6 * c.ratio);
  assert.ok(Math.abs(c.years * 365.25 * 86400 - c.ratio) < 1e-6 * c.ratio, 'one second → years');
  const y0 = compute.rows.filter((r) => r.date.startsWith(String(FIRST_YEAR))).sort((a, b) => b.flop - a.flop)[0]!;
  assert.equal(largestOfYear(compute.rows, FIRST_YEAR), y0);
  assert.equal(largestOfYear(compute.rows, 1990), null);
});

test('S3-ai3 C: company stretches = model runs merged by company; changes, longest, shortest finished', () => {
  const runs = arenaRuns(arena);
  const cr = companyRuns(arena);
  // A second way: count the snapshots where the leading organization differs from the snapshot before.
  let changes = 0;
  arena.snapshots.forEach((s, i) => {
    if (i && s.top.find((x) => x.rank === 1)!.org !== arena.snapshots[i - 1]!.top.find((x) => x.rank === 1)!.org) changes++;
  });
  const f = leadFacts(cr);
  assert.equal(f.changes, changes);
  assert.equal(cr.reduce((s, r) => s + r.days, 0), runs.reduce((s, r) => s + r.days, 0), 'stretches cover the same days');
  for (let i = 1; i < cr.length; i++) assert.notEqual(cr[i]!.org, cr[i - 1]!.org);
  assert.equal(cr.at(-1)!.open, cr.at(-1)!.to === arena.end);
  assert.equal(f.longest.days, Math.max(...cr.map((r) => r.days)));
  assert.equal(f.shortest.days, Math.min(...cr.filter((r) => !r.open).map((r) => r.days)));
  assert.ok(!f.shortest.open);
  for (const r of cr) assert.ok(r.models.length >= 1 && new Set(r.models).size === r.models.length);
});

test('S3-ai3 D: fastest doubling within one product and one measure; 1 in N people (UN world population)', () => {
  const series = claimSeries(claimsDs);
  let best = Infinity;
  for (const s of series)
    for (let a = 0; a < s.claims.length; a++)
      for (let b = a + 1; b < s.claims.length; b++)
        if (s.claims[b]!.value >= 2 * s.claims[a]!.value) {
          best = Math.min(best, (Date.parse(s.claims[b]!.asOf) - Date.parse(s.claims[a]!.asOf)) / 86_400_000);
          break; // the first doubling after a is the shortest from a
        }
  const d = fastestDoubling(series)!;
  assert.equal(d.days, best);
  assert.ok(d.series.claims[d.b]!.value >= 2 * d.series.claims[d.a]!.value && d.b > d.a);
  assert.equal(fastestDoubling([]), null);
  const pop = parsePopDataset(JSON.parse(readFileSync('public/data/population-by-country/population-2025.json', 'utf8')));
  const biggest = Math.max(...series.map((s) => s.claims.at(-1)!.value));
  const n = oneIn(pop.world, biggest);
  assert.ok(Number.isInteger(n) && n >= 1 && Math.abs(pop.world / biggest - n) <= 0.5);
});

test('S3-ai3 E: the models with the most models built directly on them', () => {
  // A second way: count parents in the shipped nodes (one model counted once, with its largest count).
  const best = new Map<string, number>();
  for (const h of lineageDs.heroes) {
    const kids = new Map<string, Set<string>>();
    for (const n of h.nodes) if (n.parent) kids.set(n.parent, (kids.get(n.parent) ?? new Set()).add(n.model));
    for (const [m, set] of kids) best.set(m, Math.max(best.get(m) ?? 0, set.size));
  }
  const tb = topBases(lineageDs);
  assert.equal(tb[0]!.children, Math.max(...best.values()));
  for (const b of tb.slice(0, 20)) assert.equal(b.children, best.get(b.model), b.model);
  const bf = baseFacts(lineageDs)!;
  assert.deepEqual(bf.top, tb[0]);
  assert.ok(bf.next.length <= 2 && bf.next.every((b) => b.hero !== bf.top.hero));
  assert.equal(new Set(bf.next.map((b) => b.hero)).size, bf.next.length, 'one per company');
});

test('S3-ai3 F: biggest jump among complete years; first year with an open-weights majority', () => {
  const totals = origins.years.map((_, i) => yearTotal(origins, i));
  const last = partialYear(origins) ? totals.length - 2 : totals.length - 1;
  let best = { i: -1, r: 0 };
  for (let i = 1; i <= last; i++) if (totals[i - 1]! > 0 && totals[i]! / totals[i - 1]! > best.r) best = { i, r: totals[i]! / totals[i - 1]! };
  const j = biggestJump(origins)!;
  assert.equal(j.year, origins.years[best.i]);
  assert.equal(j.after, totals[best.i]);
  const k = origins.years.findIndex((_, i) => origins.access.open[i]! * 2 > totals[i]!);
  const m = firstOpenMajority(origins);
  assert.equal(m?.year ?? null, k >= 0 ? origins.years[k] : null);
});

console.log(`✓ ai-models — ${passed} test groups passed (releases ${releases.rows.length} · compute ${compute.rows.length} · arena ${arena.snapshots.length} · claims ${claimsDs.claims.length} · lineage ${lineageDs.heroes.length}).`);

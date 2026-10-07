// test-catalog-split.ts — CHANGED (S3-lz): the eager card / lazy manifest split. Run: npm test.
// The shell (gallery, filters, page head, profile, page counter) gets the card fields from catalog.generated.ts;
// description, sources, licence details, data files and d3 modules load per entry. These checks keep it that way.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CATALOG, getMetaLoader, loadCatalog } from '../src/catalog';
import { loadDetails, primeDetails } from '../src/catalog/details';
import { CARD_FIELDS, toCard } from '../src/catalog/types';
import type { VizMeta } from '../src/catalog/types';
import { CARD_BUDGET_GZIP, generate } from './gen-catalog';
import { GENERATED_PATH, ROOT, listVizFolders } from './lib/viz-folders';

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ catalog-split: ${name}\n`, e);
    process.exit(1);
  }
}

const manifests = await loadCatalog();
const generated = readFileSync(GENERATED_PATH, 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

await test('toCard keeps exactly the card fields, origin by kind only', () => {
  const full: VizMeta = {
    id: 'x',
    title: { en: 'X', uk: 'Ікс' },
    subtitle: { en: 'S', uk: 'П' },
    description: { en: 'Long', uk: 'Довгий' },
    rubrics: ['world'],
    chart: 'ranked-bar',
    geo: 'world',
    period: { from: 2000, to: 2025 },
    tags: ['a'],
    sources: [{ title: 'T', url: 'https://example.org', retrieved: '2026-01-01' }],
    origin: { kind: 'adapted', title: 'Old page', url: 'https://example.org/old', license: 'MIT' },
    data: ['x.json'],
    status: 'published',
    added: '2026-01-01',
    updated: '2026-01-02',
    d3Modules: ['d3-scale'],
    related: ['y'], // CHANGED (S3-nav): a card field
  };
  const card = toCard(full);
  assert.deepEqual(Object.keys(card), [...CARD_FIELDS]); // order = CARD_FIELDS, so the generated file is stable
  assert.deepEqual(card.origin, { kind: 'adapted' });
  for (const key of ['description', 'sources', 'data', 'd3Modules']) assert.ok(!(key in card), key);
  const { period: _period, ...noPeriod } = full;
  assert.ok(!('period' in toCard(noPeriod)), 'an absent optional field stays absent');
});

await test('the shell catalog = toCard of every manifest, in folder order', () => {
  assert.deepEqual(
    CATALOG.map((c) => c.id),
    listVizFolders().map((f) => f.id),
  );
  assert.equal(manifests.length, CATALOG.length);
  manifests.forEach((m, i) => assert.deepEqual(CATALOG[i], toCard(m), m.id));
});

await test('catalog.generated.ts imports no manifest eagerly and carries no description or source', () => {
  assert.doesNotMatch(generated, /^import [^\n]*\/viz\//m, 'a static import of src/viz');
  for (const m of manifests) {
    assert.match(generated, new RegExp(`'${m.id}': \\(\\) => import\\('\\.\\./viz/${m.id}/meta'\\)`), `${m.id} loader`);
    for (const lang of ['en', 'uk'] as const) {
      assert.ok(!generated.includes(JSON.stringify(m.description[lang]).slice(1, 60)), `${m.id} description (${lang})`);
    }
    for (const s of m.sources) assert.ok(!generated.includes(s.url), `${m.id} source ${s.url}`);
  }
});

await test('guard: only an entry’s own files import its meta.ts', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(join(ROOT, 'src'))) {
    const rel = relative(ROOT, file).split('\\').join('/');
    const own = /^src\/viz\/([^/]+)\//.exec(rel)?.[1];
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/^\s*import\s[^;]*?from\s+'([^']+)'/gms)) {
      if (!spec!.startsWith('.')) continue;
      const target = relative(ROOT, resolve(dirname(file), spec!)).split('\\').join('/');
      const entry = /^src\/viz\/([^/]+)(\/|$)/.exec(target)?.[1];
      if (!entry) continue;
      // Outside src/viz nothing imports a visualization folder statically (pages and manifests are lazy);
      // inside, an entry may import another entry's data module (population ← land-area), never its meta.ts.
      if (!own || (entry !== own && /\/meta$/.test(target))) offenders.push(`${rel} → ${spec}`);
    }
  }
  assert.deepEqual(offenders, []);
});

await test('the card data stays within its per-entry budget', async () => {
  const { count, cardsGzip } = await generate();
  assert.equal(count, CATALOG.length);
  assert.ok(cardsGzip / count <= CARD_BUDGET_GZIP, `${Math.round(cardsGzip / count)} B gzip per card`);
  // The budget means something: cards that carried their descriptions would break it.
  const withText = manifests.map((m) => JSON.stringify({ ...toCard(m), description: m.description })).join('\n');
  assert.ok(gzipSync(withText, { level: 9 }).length / count > CARD_BUDGET_GZIP);
});

await test('loadDetails: the manifest module, cached; an unknown id rejects and is not cached', async () => {
  const id = CATALOG[0]!.id;
  const a = await loadDetails(id);
  assert.equal(a, (await getMetaLoader(id)!()).default);
  assert.equal(await loadDetails(id), a);
  await assert.rejects(loadDetails('no-such-entry'));
  await assert.rejects(loadDetails('no-such-entry'));
  primeDetails({ ...a, id: 'primed-entry' });
  assert.equal((await loadDetails('primed-entry')).id, 'primed-entry');
});

console.log(`✓ catalog-split: ${passed} tests passed`);

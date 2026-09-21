// test-bar-race.ts — the BarRace renderer drawn into jsdom (CHANGED (S3-br): new): slots, order, fixed layout,
// enter/exit by key, value labels, ticker, phone layout, safety, cleanup. Run: npm test.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;

const { layoutBarRace, renderBarRace } = await import('../src/charts/renderBarRace');
type Row = import('../src/charts/renderBarRace').BarRaceRow;

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ bar-race: ${name}\n`, e);
    process.exit(1);
  }
}

const doc = dom.window.document;
const freshSvg = (): SVGSVGElement => {
  const host = doc.getElementById('host')!;
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  host.querySelector('svg')!.replaceWith(svg);
  return svg as unknown as SVGSVGElement;
};
const tip = doc.querySelector('.chart-tip') as unknown as HTMLElement;
const row = (key: string, value: number, i: number): Row => ({
  key,
  label: `${i + 1}  ${key}`,
  value,
  color: 'var(--c-sector-tech)',
  imageUrl: './flags/4x3/us.svg',
  tooltip: { title: key, lines: [String(value)] },
});
const frame = (pairs: Array<[string, number]>): Row[] => pairs.map(([k, v], i) => row(k, v, i));
const opts = {
  width: 900,
  slots: 3,
  duration: 0,
  valueFormat: (v: number) => `$${Math.round(v)}`,
  tickFormat: (v: number) => String(v),
  ticker: '2000',
  longestLabel: '3  Hewlett Packard',
  longestValue: '$999',
  tooltip: tip,
};
const keys = (svg: SVGSVGElement): string[] =>
  [...svg.querySelectorAll('.br-row')].map((n) => (n.querySelector('.br-label')!.textContent ?? '').replace(/^\d+\s+/, ''));
const widthOf = (d: string | null): number => Number(/H([\d.]+)A/.exec(d ?? '')?.[1] ?? NaN) + 4;

await test('draws at most `slots` rows with label, flag, bar and value', () => {
  const svg = freshSvg();
  renderBarRace(svg, frame([['A', 100], ['B', 50], ['C', 25], ['D', 10]]), opts);
  assert.equal(svg.querySelectorAll('.br-row').length, 3);
  assert.deepEqual(keys(svg), ['A', 'B', 'C']);
  assert.equal(svg.querySelector('.br-value')!.textContent, '$100');
  assert.equal(svg.querySelector('.br-flag')!.getAttribute('href'), './flags/4x3/us.svg');
  assert.equal(svg.querySelector('.br-ticker')!.textContent, '2000');
});

await test('the longest bar spans the bar width; others scale linearly', () => {
  const svg = freshSvg();
  renderBarRace(svg, frame([['A', 100], ['B', 50]]), opts);
  const L = layoutBarRace(3, 900, opts.longestLabel, opts.longestValue, true);
  const [a, b] = [...svg.querySelectorAll('.br-bar')].map((n) => widthOf(n.getAttribute('d')));
  assert.ok(Math.abs(a! - L.barWidth) < 1e-6);
  assert.ok(Math.abs(b! - L.barWidth / 2) < 1e-6);
});

await test('height is fixed by slots, not by the rows of the frame', () => {
  const svg = freshSvg();
  renderBarRace(svg, frame([['A', 100]]), opts);
  const h1 = svg.getAttribute('height');
  renderBarRace(svg, frame([['A', 100], ['B', 90], ['C', 80]]), opts);
  assert.equal(svg.getAttribute('height'), h1);
  assert.equal(Number(h1), layoutBarRace(3, 900, opts.longestLabel, opts.longestValue, true).height);
});

await test('rows are joined by key: a swap reorders, a newcomer replaces the one that left', () => {
  const svg = freshSvg();
  renderBarRace(svg, frame([['A', 100], ['B', 50], ['C', 25]]), opts);
  const nodeA = [...svg.querySelectorAll('.br-row')][0];
  renderBarRace(svg, frame([['B', 120], ['A', 100], ['D', 30]]), opts);
  assert.equal(svg.querySelectorAll('.br-row').length, 3);
  const nodes = [...svg.querySelectorAll('.br-row')];
  assert.ok(nodes.includes(nodeA!), 'A keeps its element');
  const ys = new Map(nodes.map((n) => [n.querySelector('.br-label')!.textContent!.replace(/^\d+\s+/, ''), n.getAttribute('transform')]));
  assert.equal(ys.get('B'), 'translate(0,24)');
  assert.equal(ys.get('A'), 'translate(0,56)');
  assert.ok(!ys.has('C'));
});

await test('phones: labels stack above the bars', () => {
  const svg = freshSvg();
  renderBarRace(svg, frame([['A', 100]]), { ...opts, width: 360 });
  const L = layoutBarRace(3, 360, opts.longestLabel, opts.longestValue, true);
  assert.ok(L.stacked);
  assert.equal(svg.querySelector('.br-label')!.getAttribute('text-anchor'), 'start');
});

await test('labels are text, never markup', () => {
  const svg = freshSvg();
  const evil = row('<img src=x onerror=alert(1)>', 10, 0);
  renderBarRace(svg, [evil], opts);
  assert.equal(svg.querySelector('img'), null);
  assert.ok(svg.querySelector('.br-label')!.textContent!.includes('<img'));
});

await test('cleanup detaches listeners and keeps the marks', () => {
  const svg = freshSvg();
  const cleanup = renderBarRace(svg, frame([['A', 100]]), opts);
  cleanup();
  assert.equal(svg.querySelectorAll('.br-row').length, 1);
  assert.equal(tip.hidden, true);
});

console.log(`✓ bar-race — ${passed} tests passed.`);

// test-waffle-strip.ts — the unit-grid and strip renderers drawn into jsdom (S3-tl): cell counts, layout,
// direct labels without overlap, recolour by index, safety, cleanup. Run: npm test.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;

const { layoutWaffle, placeLabels, renderWaffle } = await import('../src/charts/renderWaffle');
const { placeSegments, renderStrip } = await import('../src/charts/renderStrip');
type Block = import('../src/charts/renderWaffle').WaffleBlock;

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ waffle/strip: ${name}\n`, e);
    process.exit(1);
  }
}

const doc = dom.window.document;
const freshSvg = (): SVGSVGElement => {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  doc.getElementById('host')!.querySelector('svg')!.replaceWith(svg);
  return svg as unknown as SVGSVGElement;
};
const tip = doc.querySelector('.chart-tip') as unknown as HTMLElement;
const block = (key: string, count: number, extra: Partial<Block> = {}): Block => ({
  key,
  count,
  color: 'var(--c-life-needs)',
  label: `${key} label`,
  tooltip: { title: key, lines: [String(count)] },
  ...extra,
});
const blocks = [block('sleep', 913), block('eating', 175, { alt: true }), block('rest', 1512, { color: 'var(--c-life-free)' })];
const opts = {
  width: 1000,
  reducedMotion: true,
  columns: 52,
  rowLabel: (r: number) => (r % 5 === 0 ? String(15 + r) : null),
  columnTicks: [[0, '1'], [51, '52']] as Array<[number, string]>,
  tooltip: tip,
};

await test('waffle draws one cell per unit, 52 per row, ages every 5 rows', () => {
  const svg = freshSvg();
  renderWaffle(svg, blocks, opts);
  const cells = svg.querySelectorAll('.wf-cell');
  assert.equal(cells.length, 2600);
  assert.equal(svg.querySelectorAll('.wf-row').length, 10);
  assert.equal(cells[0]!.getAttribute('data-key'), 'sleep');
  assert.equal(cells[913]!.getAttribute('data-key'), 'eating');
  assert.equal(cells[52]!.getAttribute('x'), cells[0]!.getAttribute('x')); // row 2 starts under row 1
  assert.equal((cells[913] as unknown as SVGElement).style.fillOpacity, '0.6'); // alt tone
});

await test('waffle layout: phones drop direct labels, cells never below 3 px', () => {
  const wide = layoutWaffle(2600, 1000, 52, true);
  const phone = layoutWaffle(2600, 330, 52, true);
  assert.ok(wide.labelSpace > 0);
  assert.equal(phone.labelSpace, 0);
  assert.ok(phone.cell >= 3);
  assert.equal(phone.rows, 50);
});

await test('direct labels never overlap and stay inside the grid height', () => {
  const L = layoutWaffle(2600, 1000, 52, true);
  const tiny = [block('a', 900), ...['b', 'c', 'd', 'e', 'f'].map((k) => block(k, 20)), block('z', 1600)];
  const placed = placeLabels(tiny, 52, L);
  for (let i = 1; i < placed.length; i++) assert.ok(placed[i]!.y - placed[i - 1]!.y >= 15);
  assert.ok(placed.every((p) => p.y <= L.height));
  const svg = freshSvg();
  renderWaffle(svg, blocks, opts);
  assert.equal(svg.querySelectorAll('.wf-label').length, 3);
});

await test('re-render recolours the same cells (joined by index) and text is never markup', () => {
  const svg = freshSvg();
  renderWaffle(svg, blocks, opts);
  const first = svg.querySelectorAll('.wf-cell')[1000];
  renderWaffle(svg, [block('<b>x</b>', 2600, { color: 'red' })], opts);
  const again = svg.querySelectorAll('.wf-cell')[1000];
  assert.equal(first, again);
  assert.equal(svg.querySelectorAll('b').length, 0);
  assert.equal(svg.querySelector('.wf-label-text')?.textContent, '<b>x</b> label');
});

await test('cleanup detaches pointer handlers and hides the tooltip', () => {
  const svg = freshSvg();
  const cleanup = renderWaffle(svg, blocks, opts);
  tip.hidden = false;
  cleanup();
  assert.equal(tip.hidden, true);
});

const segs = [
  { key: 'sleep', label: 'Sleep', value: 506, valueLabel: '8h 26m', color: 'blue', tooltip: { title: 'Sleep', lines: [] } },
  { key: 'eat', label: 'Eating', value: 97, valueLabel: '1h 37m', color: 'blue', alt: true, tooltip: { title: 'Eating', lines: [] } },
  { key: 'tiny', label: 'Sport', value: 5, valueLabel: '5m', color: 'green', tooltip: { title: 'Sport', lines: [] } },
  { key: 'rest', label: 'Rest', value: 832, valueLabel: '13h 52m', color: 'green', tooltip: { title: 'Rest', lines: [] } },
];

await test('strip: segments span the full width in order; tiny segments get no label', () => {
  const placed = placeSegments(segs, 800);
  assert.equal(placed[0]!.x0, 0);
  assert.ok(Math.abs(placed[placed.length - 1]!.x1 - 800) < 1e-9);
  assert.equal(placed.find((p) => p.key === 'tiny')!.showLabel, false);
  assert.equal(placed[0]!.showLabel, true);
});

await test('strip renders bars, labels and hour ticks', () => {
  const svg = freshSvg();
  renderStrip(svg, segs, { width: 800, reducedMotion: true, ticks: { values: [0, 720, 1440], format: (v) => `${v / 60}h` }, tooltip: tip });
  assert.equal(svg.querySelectorAll('.st-bar').length, 4);
  assert.equal(svg.querySelectorAll('.st-tick').length, 3);
  assert.equal(svg.querySelector('[data-key="sleep"] .st-name')?.textContent, 'Sleep');
  assert.equal(svg.querySelector('[data-key="tiny"] .st-name')?.textContent, '');
});

console.log(`✓ waffle/strip: ${passed} tests passed`);

// test-butterfly.ts — the Butterfly renderer drawn into jsdom (CHANGED (S3-bdd): new): marks, shared scale,
// mirrored layout, tint/highlight, safety, cleanup. Run: npm test.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;

const { layoutButterfly, renderButterfly } = await import('../src/charts/renderButterfly');
type Row = import('../src/charts/renderButterfly').ButterflyRow;

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ butterfly: ${name}\n`, e);
    process.exit(1);
  }
}

const row = (key: string, left: number, right: number, extra: Partial<Row> = {}): Row => ({
  key,
  label: key,
  left,
  right,
  leftLabel: String(left),
  rightLabel: String(right),
  imageUrl: `./flags/4x3/${key.toLowerCase()}.svg`,
  tooltip: { title: key, lines: [`${left} / ${right}`] },
  ...extra,
});
const rows = [row('IN', 100, 40), row('CN', 38, 50, { tint: true }), row('UA', 1, 2, { tint: true, highlight: true })];
const doc = dom.window.document;
const freshSvg = (): SVGSVGElement => {
  const host = doc.getElementById('host')!;
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  host.querySelector('svg')!.replaceWith(svg);
  return svg as unknown as SVGSVGElement;
};
const tip = doc.querySelector('.chart-tip') as unknown as HTMLElement;
const opts = {
  width: 900,
  reducedMotion: true,
  tickFormat: (v: number) => String(v),
  leftColor: 'var(--c-birth)',
  rightColor: 'var(--c-death)',
  leftTitle: 'Born',
  rightTitle: 'Died',
  tooltip: tip,
};
const widthOf = (d: string | null): number => Number(/H([\d.]+)A/.exec(d ?? '')?.[1] ?? NaN) + 4;

await test('draws one row with two bars and two values per datum', () => {
  const svg = freshSvg();
  renderButterfly(svg, rows, opts);
  assert.equal(svg.querySelectorAll('.bf-row').length, 3);
  assert.equal(svg.querySelectorAll('path.bf-bar-left').length, 3);
  assert.equal(svg.querySelectorAll('path.bf-bar-right').length, 3);
  assert.deepEqual([...svg.querySelectorAll('.bf-label')].map((n) => n.textContent), ['IN', 'CN', 'UA']);
  assert.deepEqual([...svg.querySelectorAll('.bf-value-right')].map((n) => n.textContent), ['40', '50', '2']);
  assert.ok(svg.querySelectorAll('.bf-axis-left .tick').length >= 2, 'left axis ticks');
  assert.ok(svg.querySelectorAll('.bf-axis-right .tick').length >= 2, 'right axis ticks');
  assert.deepEqual([...svg.querySelectorAll('.bf-head-text')].map((n) => n.textContent), ['← Born', 'Died →']);
});

await test('one shared scale: a left 100 is twice as long as a right 50', () => {
  const svg = freshSvg();
  renderButterfly(svg, rows, opts);
  const left = widthOf(svg.querySelector('.bf-bar-left')!.getAttribute('d'));
  const right = widthOf(svg.querySelectorAll('.bf-bar-right')[1]!.getAttribute('d'));
  assert.ok(Math.abs(right / left - 0.5) < 0.01, `${right} / ${left}`);
});

await test('left bars are mirrored and sit left of the label column; right bars right of it', () => {
  const svg = freshSvg();
  renderButterfly(svg, rows, opts);
  const L = layoutButterfly(rows, 900);
  assert.ok(L.leftOrigin < L.labelX && L.rightOrigin > L.labelX + L.labelWidth);
  assert.match(svg.querySelector('.bf-bar-left')!.getAttribute('transform')!, /scale\(-1,1\)/);
  const lv = Number(svg.querySelector('.bf-value-left')!.getAttribute('x'));
  const rv = Number(svg.querySelector('.bf-value-right')!.getAttribute('x'));
  assert.ok(lv < L.leftOrigin && rv > L.rightOrigin, `${lv} ${rv}`);
  assert.ok(L.leftOrigin - L.barWidth >= 0 && L.rightOrigin + L.barWidth <= 900, 'bars fit the width');
});

await test('tint and highlight classes and bands follow the data', () => {
  const svg = freshSvg();
  renderButterfly(svg, rows, opts);
  const r = [...svg.querySelectorAll('.bf-row')];
  assert.deepEqual(r.map((n) => n.classList.contains('is-tint')), [false, true, true]);
  assert.deepEqual(r.map((n) => n.classList.contains('is-highlight')), [false, false, true]);
  assert.equal(r[0]!.querySelector('.bf-band')!.getAttribute('display'), 'none');
});

await test('phone layout stacks the label above centred bars', () => {
  const L = layoutButterfly(rows, 380);
  assert.equal(L.stacked, true);
  assert.ok(L.barY > 14, 'bars below the label line');
  assert.ok(Math.abs(L.leftOrigin + L.rightOrigin - 380) < 1e-9, 'centred');
  const svg = freshSvg();
  renderButterfly(svg, rows, { ...opts, width: 380 });
  assert.equal(svg.getAttribute('height'), String(L.height));
  const zeros = [...svg.querySelectorAll('.tick text')].filter((n) => n.textContent === '0');
  assert.equal(zeros.length, 1, 'one zero label in the middle');
});

await test('keyed join: a new page replaces rows without duplicates', () => {
  const svg = freshSvg();
  renderButterfly(svg, rows, opts);
  renderButterfly(svg, [row('US', 10, 8), row('IN', 100, 40)], opts);
  assert.deepEqual([...svg.querySelectorAll('.bf-label')].map((n) => n.textContent).sort(), ['IN', 'US']);
});

await test('data strings are text, never markup', () => {
  const svg = freshSvg();
  renderButterfly(svg, [row('XX', 1, 1, { label: '<img src=x onerror=alert(1)>' })], opts);
  assert.equal(svg.querySelectorAll('img').length, 0);
  assert.ok(svg.querySelector('.bf-label')!.textContent!.startsWith('<img'));
});

await test('cleanup detaches listeners and hides the tooltip', () => {
  const svg = freshSvg();
  const cleanup = renderButterfly(svg, rows, opts);
  tip.hidden = false;
  cleanup();
  assert.equal(tip.hidden, true);
  assert.equal(svg.querySelectorAll('.bf-row').length, 3, 'marks stay for the next call');
});

console.log(`✓ butterfly — ${passed} tests passed.`);

// test-spans-tree.ts — CHANGED (S3-ai2): the three chart cores of AI-models angles C · D · E drawn into jsdom — Spans
// (rows, runs, the top-3 strip, totals as bars and text, the marker, phone layout, hover finds the run, text never markup,
// idempotent), Milestones (one line per series only when it has two points, shapes as classes and paths, names at the
// last point, log axis, hover), Tree (d3-hierarchy layout: one column per depth, links, "+n more" leaves without a dot,
// labels cut to the column with the full text in <title>, an empty forest). Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
for (const k of ['MouseEvent', 'PointerEvent', 'Event', 'SVGElement', 'Element', 'Node']) g[k] = (dom.window as unknown as Record<string, unknown>)[k];

const { layoutSpans, renderSpans } = await import('../src/charts/renderSpans');
const { layoutMilestones, renderMilestones, shapePath } = await import('../src/charts/renderMilestones');
const { fitLabel, layoutTree, renderTree } = await import('../src/charts/renderTree');

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ spans/milestones/tree: ${name}\n`, e);
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
const T = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const move = (el: Element, x: number, y: number): void => {
  // jsdom has no layout: d3.pointer falls back to clientX/Y minus the (zero) bounding box.
  el.dispatchEvent(new dom.window.MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }));
};

const rows = [
  {
    key: 'a',
    label: '<b>Alpha</b>',
    emphasis: true,
    spans: [
      { key: 'a1', t0: T('2024-01-01'), t1: T('2024-07-01'), tooltip: { title: 'model-a1', lines: ['x'] } },
      { key: 'a2', t0: T('2025-01-01'), t1: T('2025-01-03'), tooltip: { title: 'model-a2', lines: [] } },
    ],
    minor: [[T('2023-12-01'), T('2025-02-01')] as const],
    total: 184,
    totalLabel: '184',
  },
  { key: 'b', label: 'Beta', spans: [{ key: 'b1', t0: T('2024-07-01'), t1: T('2025-01-01'), tooltip: { title: 'model-b1', lines: [] } }], total: 30, totalLabel: '30' },
];
const sOpts = { tooltip: tip, domain: [T('2023-12-01'), T('2026-01-01')] as [number, number], formatTick: (t: number) => String(new Date(t).getUTCFullYear()), totalMax: 184 };

await test('spans: rows, runs, the top-3 strip, totals, the marker; text is text', () => {
  const svg = freshSvg();
  renderSpans(svg, rows, { ...sOpts, width: 900, marker: { t: T('2025-05-16'), label: 'switch' } });
  assert.equal(svg.querySelectorAll('g.gs-row').length, 2);
  assert.equal(svg.querySelectorAll('g.gs-row.is-emphasis').length, 1);
  assert.equal(svg.querySelectorAll('rect.gs-span').length, 3);
  assert.equal(svg.querySelectorAll('rect.gs-minor').length, 1);
  assert.equal(svg.querySelectorAll('rect.gs-total-bar').length, 2);
  assert.deepEqual([...svg.querySelectorAll('text.gs-name')].map((t) => t.textContent), ['<b>Alpha</b>', 'Beta']);
  assert.equal(svg.querySelector('b'), null);
  assert.deepEqual([...svg.querySelectorAll('text.gs-total')].map((t) => t.textContent), ['184', '30']);
  assert.equal(svg.querySelector('.gs-marker text')!.textContent, 'switch');
  // A two-day run still has a visible width.
  const widths = [...svg.querySelectorAll('rect.gs-span')].map((r) => Number(r.getAttribute('width')));
  assert.ok(widths.every((w) => w >= 1.5));
  // Totals: the longest bar is the full room; the other is in proportion.
  const bars = [...svg.querySelectorAll('rect.gs-total-bar')].map((r) => Number(r.getAttribute('width')));
  assert.ok(Math.abs(bars[1]! / bars[0]! - 30 / 184) < 0.01);
  // Idempotent: a second call redraws, never duplicates.
  renderSpans(svg, rows, { ...sOpts, width: 900 });
  assert.equal(svg.querySelectorAll('rect.gs-span').length, 3);
  assert.equal(svg.querySelectorAll('.gs-marker').length, 0);
});

await test('spans: hover shows the run under the pointer; phone layout puts labels above and drops the bars', () => {
  const svg = freshSvg();
  const cleanup = renderSpans(svg, rows, { ...sOpts, width: 900 });
  const L = layoutSpans(900, 2);
  const span = svg.querySelector('rect.gs-span')!;
  const x = Number(span.getAttribute('x')) + Number(span.getAttribute('width')) / 2;
  move(svg.querySelector('rect.gs-hit')!, x, L.rowY[0]!);
  assert.equal(tip.hidden, false);
  assert.equal(tip.querySelector('strong')!.textContent, 'model-a1');
  move(svg.querySelector('rect.gs-hit')!, x, L.rowY[1]!); // row b has nothing in the first half of 2024
  assert.equal(tip.hidden, true);
  cleanup();
  const phone = freshSvg();
  renderSpans(phone, rows, { ...sOpts, width: 360 });
  assert.equal(phone.querySelectorAll('rect.gs-total-bar').length, 0);
  assert.equal(phone.querySelector('text.gs-name')!.getAttribute('text-anchor'), 'start');
  assert.ok(layoutSpans(360, 2).rowH > layoutSpans(900, 2).rowH);
});

const series = [
  {
    key: 'p:w',
    label: 'Product <i>P</i>',
    shape: 'circle' as const,
    emphasis: true,
    points: [
      { key: '1', t: T('2024-10-01'), v: 2.5e8, tooltip: { title: 'P', lines: ['250 M'] } },
      { key: '2', t: T('2026-10-01'), v: 1.2e9, tooltip: { title: 'P', lines: ['1.2 B'] } },
    ],
  },
  { key: 'q:m', label: 'Q', shape: 'square' as const, points: [{ key: '3', t: T('2025-05-01'), v: 4e8, tooltip: { title: 'Q', lines: [] } }] },
  { key: 'r:x', label: 'R', shape: 'triangle' as const, points: [{ key: '4', t: T('2026-03-31'), v: 1.17e8, tooltip: { title: 'R', lines: [] } }] },
];
const mOpts = {
  tooltip: tip,
  x: { domain: [T('2024-08-01'), T('2026-11-01')] as [number, number], format: (t: number) => String(new Date(t).getUTCFullYear()) },
  y: { domain: [1e8, 2e9] as [number, number], ticks: [1e8, 2e8, 5e8, 1e9, 2e9], format: (v: number) => `${v / 1e6}M`, label: 'Users' },
};

await test('milestones: a line only for a series with two points; shapes by class; names at the last point', () => {
  const svg = freshSvg();
  const cleanup = renderMilestones(svg, series, { ...mOpts, width: 900 });
  assert.equal(svg.querySelectorAll('path.ms-line').length, 1);
  assert.equal(svg.querySelectorAll('path.ms-line.is-emphasis').length, 1);
  assert.equal(svg.querySelectorAll('path.ms-point').length, 4);
  for (const s of ['circle', 'square', 'triangle']) assert.ok(svg.querySelector(`path.ms-point.is-${s}`), s);
  assert.deepEqual([...svg.querySelectorAll('text.ms-label')].map((t) => t.textContent).sort(), ['Product <i>P</i>', 'Q', 'R']);
  assert.equal(svg.querySelector('i'), null);
  assert.equal(svg.querySelectorAll('text.ms-ty').length, 5);
  // Log axis: 1e9 sits higher than 1e8 by the same distance as 1e8 sits above… the domain's bottom is 1e8.
  const L = layoutMilestones(900);
  const ys = [...svg.querySelectorAll('line.ms-gy')].map((l) => Number(l.getAttribute('y1')));
  assert.equal(ys[0], L.bottom);
  assert.equal(ys.at(-1), L.top);
  // Hover the last point of P.
  const pts = [...svg.querySelectorAll('path.ms-point.is-emphasis')];
  const m = /M([\d.]+),([\d.]+)/.exec(pts.at(-1)!.getAttribute('d')!)!;
  move(svg.querySelector('rect.ms-hit')!, Number(m[1]) + 5, Number(m[2]));
  assert.equal(tip.hidden, false);
  assert.equal(tip.textContent, 'P1.2 B');
  cleanup();
  assert.equal(tip.hidden, true);
  assert.match(shapePath('square', 10, 10, 5), /^M5\.5,5\.5H14\.5V14\.5H5\.5Z$/);
  assert.match(shapePath('triangle', 0, 0, 4), /^M0,-5L5,4L-5,4Z$/);
});

const forest = [
  {
    key: 'r0',
    label: 'Base model with a very long name indeed',
    sub: 'Org · 2023',
    children: [
      { key: 'r0/0', label: 'Child <b>A</b>', sub: 'X · 2024', children: [{ key: 'r0/0/0', label: 'Grandchild', sub: 'Y · 2025 · +4' }] },
      { key: 'r0/more', label: '+3 more (7 models)', more: true },
    ],
  },
  { key: 'r1', label: 'Second base' },
];

await test('tree: d3-hierarchy layout — a column per depth, links, "+n more" without a dot, cut labels with <title>', () => {
  const svg = freshSvg();
  renderTree(svg, forest, { width: 600 });
  const L = layoutTree(600, forest);
  assert.equal(L.depth, 3);
  assert.equal(svg.querySelectorAll('g.tr-node').length, 5);
  assert.equal(svg.querySelectorAll('g.tr-node.is-root').length, 2);
  assert.equal(svg.querySelectorAll('g.tr-node.is-more').length, 1);
  assert.equal(svg.querySelectorAll('circle.tr-dot').length, 4);
  assert.equal(svg.querySelectorAll('path.tr-link').length, 3);
  assert.equal(svg.querySelectorAll('path.tr-link.is-more').length, 1);
  const xs = [...svg.querySelectorAll('g.tr-node')].map((n) => Number(/translate\(([\d.]+)/.exec(n.getAttribute('transform')!)![1]));
  assert.deepEqual([...new Set(xs)].sort((a, b) => a - b), [L.left, L.left + L.colW, L.left + 2 * L.colW]);
  const labels = [...svg.querySelectorAll('text.tr-label')].map((t) => t.textContent!);
  assert.ok(labels[0]!.endsWith('…') && labels[0]!.length < forest[0]!.label.length, labels[0]);
  assert.equal(svg.querySelector('g.tr-node title')!.textContent, 'Base model with a very long name indeed');
  assert.ok(labels.includes('Child <b>A</b>'));
  assert.equal(svg.querySelector('b'), null);
  assert.equal(L.height, 3 * L.rowH); // three leaves: Grandchild, "+3 more", Second base
  renderTree(svg, forest, { width: 600 });
  assert.equal(svg.querySelectorAll('g.tr-node').length, 5); // idempotent
  renderTree(svg, [], { width: 600 });
  assert.equal(svg.querySelectorAll('g.tr-node').length, 0);
  assert.equal(fitLabel('short', 200), 'short');
  assert.equal(fitLabel('abcdefghijkl', 40), 'abcd…'); // 40 px = 5 characters, the ellipsis included
});

await test('tree: d3-hierarchy comes from its own package, never through the d3 umbrella', () => {
  const src = readFileSync('src/charts/renderTree.ts', 'utf8');
  assert.match(src, /from 'd3-hierarchy';/);
  assert.ok(!/import \{[^}]*\b(hierarchy|tree)\b[^}]*\} from 'd3';/.test(src));
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string> };
  assert.ok(pkg.dependencies['d3-hierarchy'], 'd3-hierarchy is declared in package.json');
});

console.log(`✓ spans/milestones/tree — ${passed} tests passed.`);

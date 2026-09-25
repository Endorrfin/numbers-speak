// test-ranked-bar.ts — the RankedBar renderer drawn into jsdom: marks, layout, safety, motion, cleanup.
// SSR smoke cannot see D3 (it draws in effects), so this is where chart drawing is checked. Run: npm test.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;

// CHANGED (S3-fx): + axisTicks / rankedBarDomain (optional baseline).
const { axisTicks, barPath, fitLabel, layoutRankedBar, rankedBarDomain, renderRankedBar } = await import('../src/charts/renderRankedBar');
const { scaleLinear } = await import('d3');
type Row = import('../src/charts/renderRankedBar').RankedBarRow;

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ ranked-bar: ${name}\n`, e);
    process.exit(1);
  }
}

const row = (key: string, value: number, label = key): Row => ({
  key,
  label,
  value,
  color: 'var(--c-region-asia)',
  valueLabel: `$${value}`,
  imageUrl: `./flags/4x3/${key.toLowerCase()}.svg`,
  tooltip: { title: label, lines: [`Value: ${value}`] },
});
const rows = [row('US', 100), row('CN', 64), row('DE', 16)];
const doc = dom.window.document;
const freshSvg = (): SVGSVGElement => {
  const host = doc.getElementById('host')!;
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  host.querySelector('svg')!.replaceWith(svg);
  return svg as unknown as SVGSVGElement;
};
const tip = doc.querySelector('.chart-tip') as unknown as HTMLElement;
const opts = { width: 900, reducedMotion: true, tickFormat: (v: number) => `$${v}`, tooltip: tip };
const widthOf = (d: string | null): number => Number(/H([\d.]+)A/.exec(d ?? '')?.[1] ?? NaN) + 4;

await test('draws one row, bar, label and value per datum', () => {
  const svg = freshSvg();
  renderRankedBar(svg, rows, opts);
  assert.equal(svg.querySelectorAll('.rb-row').length, 3);
  assert.equal(svg.querySelectorAll('path.rb-bar').length, 3);
  assert.deepEqual([...svg.querySelectorAll('.rb-label')].map((n) => n.textContent), ['US', 'CN', 'DE']);
  assert.deepEqual([...svg.querySelectorAll('.rb-value')].map((n) => n.textContent), ['$100', '$64', '$16']);
  assert.ok(svg.querySelectorAll('.rb-axis .tick').length >= 2, 'axis ticks');
});

await test('bar widths are proportional to values (reduced motion: final state immediately)', () => {
  const svg = freshSvg();
  renderRankedBar(svg, rows, opts);
  const [a, b] = [...svg.querySelectorAll('.rb-bar')].map((p) => widthOf(p.getAttribute('d')));
  assert.ok(Math.abs(b! / a! - 0.64) < 0.01, `${b} / ${a}`);
});

await test('data strings are text, never markup', () => {
  const svg = freshSvg();
  const evil = '<img src=x onerror=alert(1)>';
  renderRankedBar(svg, [row('XX', 5, evil)], opts);
  assert.equal(svg.querySelector('img'), null);
  assert.equal(svg.querySelector('.rb-label')!.textContent!.startsWith('<img'), true);
});

await test('re-render joins by key: fewer rows remove the rest, same keys keep their nodes', () => {
  const svg = freshSvg();
  renderRankedBar(svg, rows, opts);
  const us = svg.querySelector('.rb-row');
  renderRankedBar(svg, rows.slice(0, 2), opts);
  assert.equal(svg.querySelectorAll('.rb-row').length, 2);
  assert.equal(svg.querySelector('.rb-row'), us);
});

await test('empty rows draw an empty frame without throwing', () => {
  const svg = freshSvg();
  renderRankedBar(svg, [], opts);
  assert.equal(svg.querySelectorAll('.rb-row').length, 0);
});

await test('phones: labels stack above the bars; desktop: labels sit left', () => {
  assert.equal(layoutRankedBar(rows, 360).stacked, true);
  assert.equal(layoutRankedBar(rows, 360).barX, 0);
  const wide = layoutRankedBar(rows, 1200);
  assert.equal(wide.stacked, false);
  assert.ok(wide.barX > 0 && wide.barX + wide.barWidth < 1200);
});

await test('long labels are shortened with an ellipsis and keep the full text in <title>', () => {
  assert.equal(fitLabel('Central African Republic', 80), 'Central A…');
  const svg = freshSvg();
  renderRankedBar(svg, [row('CF', 5, '170  Central African Republic')], { ...opts, width: 600 });
  const label = svg.querySelector('.rb-label')!;
  assert.match(label.textContent ?? '', /…/);
  assert.equal(label.querySelector('title')?.textContent, '170  Central African Republic');
});

await test('bar path: square baseline, rounded end, never negative', () => {
  assert.equal(barPath(100, 18), 'M0,0H96A4,4 0 0 1 100,4V14A4,4 0 0 1 96,18H0Z');
  assert.doesNotMatch(barPath(0, 18), /-/);
});

await test('tooltip shows plain text on pointer enter and hides on leave; cleanup detaches', () => {
  const svg = freshSvg();
  const cleanup = renderRankedBar(svg, rows, opts);
  const hit = svg.querySelector('.rb-hit')!;
  hit.dispatchEvent(new dom.window.MouseEvent('pointerenter', { clientX: 10, clientY: 10 }));
  assert.equal(tip.hidden, false);
  assert.equal(tip.querySelector('strong')?.textContent, 'US');
  assert.ok(svg.querySelector('.rb-row')!.classList.contains('is-hover'));
  hit.dispatchEvent(new dom.window.MouseEvent('pointerleave'));
  assert.equal(tip.hidden, true);
  cleanup();
  hit.dispatchEvent(new dom.window.MouseEvent('pointerenter', { clientX: 10, clientY: 10 }));
  assert.equal(tip.hidden, true, 'listener removed by cleanup');
});

await test('with motion: bars grow from zero to their final width', async () => {
  const svg = freshSvg();
  renderRankedBar(svg, rows, { ...opts, reducedMotion: false });
  const bar = svg.querySelector('.rb-bar')!;
  assert.ok(!(widthOf(bar.getAttribute('d')) > 0), 'not drawn at full width immediately');
  await new Promise((r) => setTimeout(r, 700));
  assert.ok(widthOf(bar.getAttribute('d')) > 100, 'full width after the transition');
});

// ── CHANGED (S3-fx): optional baseline + axis title (GPI: scale 1–5, page 1 = 1.161–1.538) ───────────
const endOf = (d: string | null): number => Number(/0 0 1 ([\d.]+),/.exec(d ?? '')?.[1] ?? NaN); // bar's data end, px
const tickTexts = (svg: SVGSVGElement): string[] => [...svg.querySelectorAll('.rb-axis .tick text')].map((n) => n.textContent ?? '');
const gpi = [row('IS', 1.161), row('NZ', 1.343), row('HU', 1.538)];
const gpiOpts = { ...opts, tickFormat: (v: number) => String(v), baseline: 1 };
const AXIS_TITLE = 'Score on a 1–5 scale · bars start at 1';

await test('without the option nothing changes: same SVG as baseline 0, domain and first tick from 0, no axis title', () => {
  const a = freshSvg();
  renderRankedBar(a, rows, opts);
  const before = a.outerHTML;
  const b = freshSvg();
  renderRankedBar(b, rows, { ...opts, baseline: 0, axisLabel: '' });
  assert.equal(b.outerHTML, before);
  assert.deepEqual(rankedBarDomain(rows), [0, 100]);
  assert.equal(tickTexts(b)[0], '$0');
  assert.equal(b.querySelector('.rb-axis-label'), null);
  assert.equal(layoutRankedBar(rows, 900).axisHeight, 24);
  assert.equal(b.getAttribute('height'), String(24 + 3 * 30 + 4));
});

await test('baseline: domain [baseline, max], bar length ∝ value − baseline, first tick = baseline', () => {
  assert.deepEqual(rankedBarDomain(gpi, 1), [1, 1.538]);
  const svg = freshSvg();
  renderRankedBar(svg, gpi, gpiOpts);
  const [is, nz, hu] = [...svg.querySelectorAll('.rb-bar')].map((p) => endOf(p.getAttribute('d')));
  const L = layoutRankedBar(gpi, 900);
  assert.ok(Math.abs(hu! - L.barWidth) < 0.5, 'the largest bar spans the plot');
  assert.ok(Math.abs(is! / hu! - 0.161 / 0.538) < 0.005, `IS ${is} / HU ${hu}`);
  assert.ok(Math.abs(nz! / hu! - 0.343 / 0.538) < 0.005, `NZ ${nz} / HU ${hu}`);
  assert.equal(tickTexts(svg)[0], '1');
  // From 0 the same page spans 75–100 % of the plot — the flat look the option fixes.
  const zero = freshSvg();
  renderRankedBar(zero, gpi, { ...gpiOpts, baseline: 0 });
  const z = [...zero.querySelectorAll('.rb-bar')].map((p) => endOf(p.getAttribute('d')));
  assert.ok(z[0]! / z[2]! > 0.75 && is! / hu! < 0.31);
});

await test('values at or below the baseline draw a 0-px bar (clamped), never a negative one', () => {
  const svg = freshSvg();
  renderRankedBar(svg, [row('A', 2), row('B', 1), row('C', 0.5)], gpiOpts);
  const ends = [...svg.querySelectorAll('.rb-bar')].map((p) => p.getAttribute('d') ?? '');
  assert.equal(endOf(ends[1]!), 0);
  assert.equal(endOf(ends[2]!), 0);
  for (const d of ends) assert.doesNotMatch(d, /-/);
  const L = layoutRankedBar([row('A', 2)], 900);
  assert.equal(svg.querySelectorAll('.rb-value')[2]!.getAttribute('x'), String(L.barX + 6));
  assert.deepEqual(rankedBarDomain([row('B', 1)], 1), [1, 2], 'a page that never passes the baseline still has a scale');
  assert.deepEqual(rankedBarDomain([], 1), [1, 2]);
});

await test('axisTicks: baseline first, ticks too close to it dropped, baseline 0 = d3 ticks', () => {
  const zero = scaleLinear().domain([0, 100]).range([0, 600]);
  assert.deepEqual(axisTicks(zero, 5, 0), zero.ticks(5));
  const gp = scaleLinear().domain([1, 1.538]).range([0, 300]);
  assert.deepEqual(axisTicks(gp, 2, 1), [1, 1.2, 1.4]);
  const odd = scaleLinear().domain([0.9, 10]).range([0, 200]); // d3: 2, 4, 6, 8, 10 — 2 sits 24 px from 0.9
  assert.deepEqual(axisTicks(odd, 5, 0.9), [0.9, 4, 6, 8, 10]);
});

await test('axis title: plain text above the ticks at the baseline tick, +16 px axis, removed when unset', () => {
  const svg = freshSvg();
  renderRankedBar(svg, gpi, { ...gpiOpts, axisLabel: AXIS_TITLE });
  const title = svg.querySelector('.rb-axis-label')!;
  const L = layoutRankedBar(gpi, 900, 560, true);
  assert.equal(title.textContent, AXIS_TITLE);
  assert.equal(title.getAttribute('x'), String(L.barX));
  assert.equal(L.axisHeight, 40);
  assert.equal(svg.getAttribute('height'), String(40 + 3 * 30 + 4));
  const axisY = Number(/translate\([\d.]+,([\d.]+)\)/.exec(svg.querySelector('.rb-axis')!.getAttribute('transform') ?? '')?.[1]);
  assert.ok(Number(title.getAttribute('y')) < axisY - 12, 'title sits above the tick labels');
  renderRankedBar(svg, gpi, gpiOpts);
  assert.equal(svg.querySelector('.rb-axis-label'), null, 'unset → removed on re-render');
  assert.equal(svg.getAttribute('height'), String(24 + 3 * 30 + 4));
  const evil = freshSvg();
  renderRankedBar(evil, gpi, { ...gpiOpts, axisLabel: '<img src=x onerror=alert(1)>' });
  assert.equal(evil.querySelector('img'), null);
});

await test('phones (stacked, 360 px): title and first tick at x = 0; a narrow chart shortens the title, full text in <title>', () => {
  const svg = freshSvg();
  renderRankedBar(svg, gpi, { ...gpiOpts, width: 360, axisLabel: AXIS_TITLE });
  assert.equal(svg.querySelector('.rb-axis-label')!.getAttribute('x'), '0');
  assert.equal(svg.querySelector('.rb-axis-label')!.textContent, AXIS_TITLE, 'fits at 360 px');
  assert.equal(tickTexts(svg)[0], '1');
  const narrow = freshSvg();
  renderRankedBar(narrow, gpi, { ...gpiOpts, width: 160, axisLabel: AXIS_TITLE });
  const t = narrow.querySelector('.rb-axis-label')!;
  assert.match(t.firstChild?.textContent ?? '', /…$/);
  assert.equal(t.querySelector('title')?.textContent, AXIS_TITLE);
});

console.log(`✓ ranked-bar: ${passed} jsdom render tests passed.`);
process.exit(0);

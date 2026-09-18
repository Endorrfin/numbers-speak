// test-ranked-bar.ts — the RankedBar renderer drawn into jsdom: marks, layout, safety, motion, cleanup.
// SSR smoke cannot see D3 (it draws in effects), so this is where chart drawing is checked. Run: npm test.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;

const { barPath, fitLabel, layoutRankedBar, renderRankedBar } = await import('../src/charts/renderRankedBar');
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

console.log(`✓ ranked-bar: ${passed} jsdom render tests passed.`);
process.exit(0);

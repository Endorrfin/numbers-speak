// test-year-chart.ts — the YearChart renderer drawn into jsdom: layers, bands, notes, safety, redraw,
// hover and cleanup. SSR smoke cannot see D3 (it draws in effects), so drawing is checked here. Run: npm test.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;

const { layoutYearChart, renderYearChart, yearBarPath } = await import('../src/charts/renderYearChart');
type Spec = import('../src/charts/renderYearChart').YearChartSpec;

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ year-chart: ${name}\n`, e);
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
const years = [2000, 2001, 2002, 2003, 2004];
const a = [5, 4, 3, 2, 1];
const b = [4, 5, 6, 5, 4];
const spec = (extra: Partial<Spec> = {}): Spec => ({
  years,
  yDomain: [0, 10],
  yFormat: (v) => String(v),
  yLabel: 'thousand people',
  bands: [{ from: 2003, to: 2004, label: '* partial coverage', shortLabel: '*', level: 1 }],
  gaps: [{ key: 'g', a, b, fillAbove: 'red', fillBelow: 'blue' }],
  lines: [
    { key: 'a', values: a, color: 'var(--c-birth)' },
    { key: 'b', values: b, color: 'var(--c-death)' },
  ],
  notes: [
    { index: 1, value: 5, lines: ['key note'], dx: 0, dy: -30, anchor: 'middle', key: true },
    { index: 3, value: 2, lines: ['minor', 'two lines'], dx: 20, dy: 30, anchor: 'start' },
  ],
  markers: [{ key: 'b', index: 4, value: 4, color: 'var(--c-death)', label: '4.0' }],
  hoverPoints: (i) => [{ value: b[i]!, color: 'var(--c-death)' }],
  tooltip: (i) => ({ title: String(years[i]), lines: [{ label: 'B', value: String(b[i]), color: 'var(--c-death)' }] }),
  ...extra,
});
const wide = { width: 900, reducedMotion: true, tooltip: tip };
const narrow = { width: 380, reducedMotion: true, tooltip: tip };

await test('draws lines, gap fills (clipped both ways), band, unit, markers', () => {
  const svg = freshSvg();
  renderYearChart(svg, spec(), wide);
  assert.equal(svg.querySelectorAll('path.yc-line').length, 2);
  assert.equal(svg.querySelectorAll('path.yc-gap').length, 2);
  assert.equal(svg.querySelectorAll('clipPath').length, 2);
  assert.equal(svg.querySelectorAll('rect.yc-band').length, 1);
  assert.equal(svg.querySelector('.yc-band-label')?.textContent, '* partial coverage');
  assert.equal(svg.querySelector('.yc-unit')?.textContent, 'thousand people');
  assert.equal(svg.querySelector('.yc-end-label')?.textContent, '4.0');
  assert.equal(svg.getAttribute('viewBox'), `0 0 900 ${layoutYearChart(spec(), 900).height}`);
});

await test('narrow: short band label, only key notes', () => {
  const svg = freshSvg();
  renderYearChart(svg, spec(), narrow);
  assert.equal(svg.querySelector('.yc-band-label')?.textContent, '*');
  assert.deepEqual([...svg.querySelectorAll('.yc-note')].map((n) => n.textContent), ['key note']);
  const wideSvg = freshSvg();
  renderYearChart(wideSvg, spec(), wide);
  assert.equal(wideSvg.querySelectorAll('.yc-note').length, 2);
  assert.equal(wideSvg.querySelectorAll('.yc-note tspan').length, 3, 'multi-line notes');
});

await test('bars: one per year, rounded data end, negative values grow down', () => {
  const svg = freshSvg();
  renderYearChart(svg, spec({ yDomain: [-10, 10], lines: [], gaps: [], bars: [{ key: 'n', values: [2, -3, -5, 0, -1], color: (v) => (v > 0 ? 'blue' : 'red') }] }), wide);
  const bars = [...svg.querySelectorAll('path.yc-bar')];
  assert.equal(bars.length, 5);
  assert.equal(bars[3]!.getAttribute('d'), '', 'zero value draws nothing');
  assert.equal((bars[0] as unknown as SVGElement).style.fill, 'blue');
  assert.equal((bars[1] as unknown as SVGElement).style.fill, 'red');
  assert.match(yearBarPath(0, 10, 100, 50), /^M0,100V54Q/);
  assert.match(yearBarPath(0, 10, 100, 150), /^M0,100V146Q/);
});

await test('text is written as text, never as markup', () => {
  const svg = freshSvg();
  const evil = '<img src=x onerror=alert(1)>';
  renderYearChart(svg, spec({ yLabel: evil, notes: [{ index: 0, value: 5, lines: [evil], dx: 0, dy: 0, anchor: 'start', key: true }] }), wide);
  assert.equal(svg.querySelectorAll('img').length, 0);
  assert.equal(svg.querySelector('.yc-unit')?.textContent, evil);
});

await test('redraw is idempotent (no duplicated layers)', () => {
  const svg = freshSvg();
  renderYearChart(svg, spec(), wide);
  renderYearChart(svg, spec(), narrow);
  assert.equal(svg.querySelectorAll('.yc-root').length, 1);
  assert.equal(svg.querySelectorAll('path.yc-line').length, 2);
  assert.equal(svg.querySelectorAll('clipPath').length, 2);
});

await test('hover shows the nearest year in a text-only tooltip; cleanup hides it and detaches', () => {
  const svg = freshSvg();
  const cleanup = renderYearChart(svg, spec(), wide);
  const hit = svg.querySelector('.yc-hit')!;
  // jsdom has no layout: getBoundingClientRect is all zeros, so the pointer maps to x = 0 → first year.
  hit.dispatchEvent(new dom.window.MouseEvent('pointermove', { bubbles: true, clientX: 0 }) as unknown as Event);
  assert.equal(tip.hidden, false);
  assert.equal(tip.querySelector('strong')?.textContent, '2000');
  assert.equal(svg.querySelectorAll('.yc-hover-dot').length, 1);
  cleanup();
  assert.equal(tip.hidden, true);
  hit.dispatchEvent(new dom.window.MouseEvent('pointermove', { bubbles: true, clientX: 0 }) as unknown as Event);
  assert.equal(tip.hidden, true, 'listeners detached');
});

await test('xFormat labels the x-axis from the index (CHANGED (S3-cd)); default stays the raw value', () => {
  const svg = freshSvg();
  renderYearChart(svg, spec({ years: [1, 2, 3], xTicks: [1, 2, 3] }), wide);
  const labels = [...svg.querySelectorAll('.yc-axis-x .tick text')].map((t) => t.textContent);
  assert.deepEqual(labels, ['1', '2', '3']);

  const svg2 = freshSvg();
  const monthName = (i: number) => ['Jan', 'Feb', 'Mar'][i - 1] ?? String(i);
  renderYearChart(svg2, spec({ years: [1, 2, 3], xTicks: [1, 2, 3], xFormat: monthName }), wide);
  const labels2 = [...svg2.querySelectorAll('.yc-axis-x .tick text')].map((t) => t.textContent);
  assert.deepEqual(labels2, ['Jan', 'Feb', 'Mar']);
});

console.log(`✓ year-chart: ${passed} tests passed.`);

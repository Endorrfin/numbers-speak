// test-calendar-heatmap.ts — the CalendarHeatmap renderer drawn into jsdom: Monday-start grid cells, quantile
// levels, layout at width, year/month labels, legend, hover tooltip, safety, redraw and cleanup.
// Run: npm test. CHANGED (S3-aa3): new.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;

const { calendarYearCells, layoutCalendarHeatmap, quantizeLevels, renderCalendarHeatmap } = await import(
  '../src/charts/renderCalendarHeatmap'
);
type Spec = import('../src/charts/renderCalendarHeatmap').ChSpec;
type Grid = import('../src/charts/renderCalendarHeatmap').ChGrid;
type Cell = import('../src/charts/renderCalendarHeatmap').ChCell;

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ calendar-heatmap: ${name}\n`, e);
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

const dowMon0 = (date: string): number => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;

const cell = (date: string, col: number, row: number, value: number, level: number): Cell => ({ date, col, row, value, level });
const grid2025 = (extra: Partial<Grid> = {}): Grid => ({
  year: 2025,
  label: '2025',
  cols: 1,
  cells: [cell('2025-01-01', 0, 2, 5, 1), cell('2025-01-02', 0, 3, 12, 3), cell('2025-01-03', 0, 4, 0, 0)],
  months: [{ col: 0, label: 'Jan' }],
  ...extra,
});
const spec = (extra: Partial<Spec> = {}): Spec => ({
  grids: [grid2025()],
  levelColors: ['var(--c-heat-0)', 'var(--c-heat-1)', 'var(--c-heat-2)', 'var(--c-heat-3)', 'var(--c-heat-4)'],
  scaleLabel: { less: 'Fewer', more: 'More' },
  tooltip: (c) => ({ title: c.date, lines: [{ label: 'x <b>', value: String(c.value), color: 'red' }] }),
  ...extra,
});
const wide = { width: 900, reducedMotion: true, tooltip: tip };

await test('calendarYearCells: Monday-start weeks, full year coverage, grid in bounds', () => {
  const { cells, cols } = calendarYearCells(2025, () => 0, () => 0);
  assert.equal(cells.length, 365);
  assert.equal(cells[0]!.date, '2025-01-01');
  assert.equal(cells[cells.length - 1]!.date, '2025-12-31');
  for (const c of cells) {
    assert.equal(c.row, dowMon0(c.date), `row for ${c.date}`);
    assert.ok(c.col >= 0 && c.col < cols);
  }
  assert.equal(calendarYearCells(2024, () => 0, () => 0).cells.length, 366); // leap year
});

await test('calendarYearCells: value/level come from the caller, per date', () => {
  const values: Record<string, number> = { '2025-03-01': 7 };
  const { cells } = calendarYearCells(
    2025,
    (date) => values[date] ?? 0,
    (v) => (v > 0 ? 9 : 0),
  );
  const march1 = cells.find((c) => c.date === '2025-03-01')!;
  assert.equal(march1.value, 7);
  assert.equal(march1.level, 9);
  assert.ok(cells.filter((c) => c.date !== '2025-03-01').every((c) => c.level === 0));
});

await test('quantizeLevels: quantile breaks, non-positive → 0, monotone, capped at steps', () => {
  const levelOf = quantizeLevels([0, -3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4);
  assert.equal(levelOf(0), 0);
  assert.equal(levelOf(-3), 0);
  assert.equal(levelOf(1), 1);
  assert.equal(levelOf(9), 4);
  assert.equal(levelOf(10), 4);
  let prev = 0;
  for (let v = 0; v <= 10; v++) {
    const lv = levelOf(v);
    assert.ok(lv >= prev, `level dropped at ${v}`);
    prev = lv;
  }
  assert.equal(quantizeLevels([], 4)(5), 0);
  assert.equal(quantizeLevels([0, 0, 0], 4)(5), 0);
});

await test('layout: shrinks to fit, never overflows the given width, grows with grid count', () => {
  const wideCols = spec({ grids: [grid2025({ cols: 53 })] });
  for (const w of [320, 375, 480, 768, 1200]) {
    const L = layoutCalendarHeatmap(wideCols, w);
    const avail = w - L.left - 4;
    assert.ok(L.cell >= 2, `cell too small at ${w}`);
    assert.ok(53 * (L.cell + L.gap) <= avail, `overflow at width ${w}`);
  }
  const one = layoutCalendarHeatmap(spec(), 900);
  const two = layoutCalendarHeatmap(spec({ grids: [grid2025(), grid2025({ year: 2026, label: '2026' })] }), 900);
  assert.ok(two.height > one.height);
});

await test('draws grids, cells, year/month labels, legend', () => {
  const svg = freshSvg();
  renderCalendarHeatmap(svg, spec(), wide);
  assert.equal(svg.querySelectorAll('.ch-cell').length, 3);
  assert.equal(svg.querySelector('.ch-year-label')!.textContent, '2025');
  assert.equal(svg.querySelector('.ch-month-label')!.textContent, 'Jan');
  assert.equal(svg.querySelectorAll('.ch-legend-swatch').length, 5);
  assert.deepEqual([...svg.querySelectorAll('.ch-legend-word')].map((n) => n.textContent), ['Fewer', 'More']);
});

await test('strings are text, never markup', () => {
  const svg = freshSvg();
  renderCalendarHeatmap(svg, spec({ grids: [grid2025({ label: '2025 <script>' })] }), wide);
  assert.equal(svg.querySelector('.ch-year-label')!.textContent, '2025 <script>');
  assert.equal(svg.querySelectorAll('script').length, 0);
});

await test('hover: highlight + tooltip; leave clears it; cleanup hides tip; redraw is idempotent', () => {
  const svg = freshSvg();
  const cleanup = renderCalendarHeatmap(svg, spec(), wide);
  const first = svg.querySelector('.ch-cell')!;
  first.dispatchEvent(new dom.window.MouseEvent('pointerenter', { bubbles: true, clientX: 5, clientY: 5 }) as unknown as Event);
  assert.equal(tip.hidden, false);
  assert.ok(first.classList.contains('is-hover'));
  assert.equal(tip.querySelector('strong')!.textContent, '2025-01-01');
  assert.ok(tip.textContent!.includes('x <b>'));
  first.dispatchEvent(new dom.window.MouseEvent('pointerleave', { bubbles: true }) as unknown as Event);
  assert.equal(tip.hidden, true);
  assert.equal(first.classList.contains('is-hover'), false);
  cleanup();
  assert.equal(tip.hidden, true);
  const count = svg.querySelectorAll('*').length;
  renderCalendarHeatmap(svg, spec(), wide);
  assert.equal(svg.querySelectorAll('*').length, count);
});

await test('empty spec draws nothing; cleanup is a no-op', () => {
  const svg = freshSvg();
  const cleanup = renderCalendarHeatmap(svg, spec({ grids: [] }), wide);
  assert.equal(svg.querySelectorAll('.ch-cell').length, 0);
  cleanup();
});

console.log(`✓ calendar-heatmap — ${passed} test groups passed.`);

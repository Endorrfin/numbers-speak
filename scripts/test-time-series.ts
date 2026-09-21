// test-time-series.ts — the TimeSeries and StackedRows renderers drawn into jsdom: panels, stacks, texture,
// partial buckets, bands, gapped lines, notes, hover, safety, redraw and cleanup. Run: npm test.
// CHANGED (S3-aa): new.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;

const { layoutTimeSeries, panelMax, renderTimeSeries } = await import('../src/charts/renderTimeSeries');
const { hBarPath, layoutStackedRows, renderStackedRows } = await import('../src/charts/renderStackedRows');
type Spec = import('../src/charts/renderTimeSeries').TsSpec;

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ time-series: ${name}\n`, e);
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
const month = (i: number) => ({ start: Date.UTC(2025, i, 1), end: Date.UTC(2025, i + 1, 1) });
const spans = [0, 1, 2, 3, 4, 5].map(month);
const spec = (extra: Partial<Spec> = {}): Spec => ({
  spans,
  partial: [true, false, false, false, false, true],
  panels: [
    {
      key: 'a',
      title: 'Missiles <script>',
      yFormat: (v) => String(v),
      stacks: [
        { key: 'down', color: 'blue', values: [5, 4, 0, 3, 2, 1] },
        { key: 'lost', color: 'blue', texture: 'hatch', values: [1, 0, 0, 1, 0, 0] },
        { key: 'through', color: 'red', values: [1, 1, 0, 1, 1, 0] },
      ],
      notes: [{ index: 0, value: 7, lines: ['Peak: 7'], key: true }],
    },
    {
      key: 'b',
      title: 'Rate',
      yFormat: (v) => `${Math.round(v * 100)}%`,
      yMax: 1,
      lines: [{ key: 'x', color: 'green', values: [0.5, null, 0.7, null, 0.6, 0.8] }],
    },
  ],
  bands: [{ start: Date.UTC(2025, 4, 1), end: Date.UTC(2025, 6, 1), label: '* hidden', shortLabel: '*', panels: ['a'] }],
  xTicks: [Date.UTC(2025, 0, 1), Date.UTC(2025, 3, 1)],
  xFormat: (ms) => String(new Date(ms).getUTCMonth() + 1),
  tooltip: (i) => ({ title: `M${i}`, lines: [{ label: 'x <b>', value: '1', color: 'blue' }] }),
  ...extra,
});
const wide = { width: 900, reducedMotion: true, tooltip: tip };

await test('layout: one title row per panel, stacked panels, nice maxima', () => {
  const L = layoutTimeSeries(spec(), 900);
  assert.equal(L.panels.length, 2);
  assert.ok(L.panels[1]!.top > L.panels[0]!.top + L.panels[0]!.height);
  assert.equal(panelMax(spec().panels[0]!, 6), 8); // 7 → nice 8
  assert.equal(L.panels[1]!.yMax, 1);
  assert.ok(layoutTimeSeries(spec(), 380).narrow);
});

await test('draws panels, stacked segments, texture, partial buckets, band, gapped line, notes', () => {
  const svg = freshSvg();
  renderTimeSeries(svg, spec(), wide);
  assert.equal(svg.querySelectorAll('.ts-title').length, 2);
  assert.equal(svg.querySelectorAll('.ts-seg').length, 11); // non-zero values only (5 + 2 + 4)
  assert.equal(svg.querySelectorAll('pattern').length, 1);
  assert.match(svg.querySelector('.ts-seg[data-key="lost"]')!.getAttribute('fill')!, /^url\(#ts\d+-a-lost\)$/);
  assert.equal(svg.querySelectorAll('.ts-seg.is-partial').length, 4);
  assert.equal(svg.querySelectorAll('.ts-band').length, 1);
  assert.equal(svg.querySelector('.ts-band-label')!.textContent, '* hidden');
  const d = svg.querySelector('.ts-line')!.getAttribute('d')!;
  assert.equal((d.match(/M/g) ?? []).length, 3); // three runs around two gaps
  assert.equal(svg.querySelectorAll('.ts-dot').length, 4); // ≤ 60 buckets → every defined point
  assert.equal(svg.querySelector('.ts-note')!.textContent, 'Peak: 7');
  assert.equal(svg.querySelectorAll('.yc-axis-x .tick').length, 2);
});

await test('strings are text, never markup', () => {
  const svg = freshSvg();
  renderTimeSeries(svg, spec(), wide);
  assert.equal(svg.querySelector('.ts-title')!.textContent, 'Missiles <script>');
  assert.equal(svg.querySelectorAll('script').length, 0);
});

await test('hover: highlight + tooltip; cleanup hides it; redraw is idempotent', () => {
  const svg = freshSvg();
  const cleanup = renderTimeSeries(svg, spec(), wide);
  const hit = svg.querySelector('.yc-hit')!;
  hit.dispatchEvent(new dom.window.MouseEvent('pointermove', { bubbles: true, clientX: 0 }) as unknown as Event);
  assert.equal(tip.hidden, false);
  assert.equal(tip.querySelector('strong')!.textContent, 'M0');
  assert.equal(tip.querySelectorAll('b').length, 1);
  assert.ok(tip.textContent!.includes('x <b>'));
  assert.equal(svg.querySelector('.ts-hover')!.getAttribute('display'), null);
  cleanup();
  assert.equal(tip.hidden, true);
  const count = svg.querySelectorAll('*').length;
  renderTimeSeries(svg, spec(), wide);
  assert.equal(svg.querySelectorAll('*').length, count);
});

await test('narrow: only key notes; empty spec draws nothing', () => {
  const svg = freshSvg();
  const s = spec();
  s.panels[0]!.notes = [{ index: 1, value: 5, lines: ['minor'] }];
  renderTimeSeries(svg, s, { ...wide, width: 380 });
  assert.equal(svg.querySelectorAll('.ts-note').length, 0);
  const empty = freshSvg();
  renderTimeSeries(empty, spec({ spans: [] }), wide);
  assert.equal(empty.querySelectorAll('.ts-seg').length, 0);
});

await test('stacked rows: segments, value labels, hover, narrow layout', () => {
  const rows = {
    rows: [
      {
        key: 'a',
        label: '7 Sep 2025',
        sublabel: '17:00–09:30',
        segments: [
          { key: 'cruise', value: 13, color: 'blue' },
          { key: 'drones', value: 810, color: 'olive' },
        ],
        valueLabel: '823',
        tooltip: { title: 'A', lines: [{ label: 'x', value: '1' }] },
      },
      { key: 'b', label: '13 May 2026', segments: [{ key: 'drones', value: 753, color: 'olive' }], valueLabel: '753' },
    ],
  };
  const svg = freshSvg();
  const cleanup = renderStackedRows(svg, rows, wide);
  assert.equal(svg.querySelectorAll('.sr-row').length, 2);
  assert.equal(svg.querySelectorAll('.sr-seg').length, 3);
  assert.deepEqual([...svg.querySelectorAll('.sr-value')].map((n) => n.textContent), ['823', '753']);
  assert.equal(svg.querySelector('.sr-sublabel')!.textContent, '17:00–09:30');
  svg.querySelector('.sr-row')!.dispatchEvent(new dom.window.MouseEvent('pointermove', { bubbles: true, clientX: 10 }) as unknown as Event);
  assert.equal(tip.hidden, false);
  assert.ok(svg.querySelector('.sr-row')!.classList.contains('is-hover'));
  cleanup();
  assert.equal(tip.hidden, true);
  const L = layoutStackedRows(rows, 380);
  assert.ok(L.narrow && L.labelW === 0);
  assert.equal(hBarPath(0, 0, 0, 10), '');
  assert.ok(hBarPath(0, 0, 20, 10).includes('Q'));
});

console.log(`✓ time-series — ${passed} test groups passed.`);

// test-scatter-swarm.ts — CHANGED (S3-re): the new chart cores drawn into jsdom — scatter (dots, guides, quadrant
// captions, labels only for emphasised points, no overlapping labels), beeswarm (no two dots overlap, label lanes),
// dumbbell (both ends, shared axis, emphasis), point map (projection inside the frame), the RankedBar emphasis
// option; text stays text; cleanup. Run: npm test.
import assert from 'node:assert/strict';
import { geoEqualEarth } from 'd3';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;

const { nearestPoint, placeLabels, renderScatter } = await import('../src/charts/renderScatter');
const { dodge, laneLabels, renderSwarm } = await import('../src/charts/renderSwarm');
const { layoutDumbbell, renderDumbbell } = await import('../src/charts/renderDumbbell');
const { equalEarth, projectPoints, renderPointMap } = await import('../src/charts/renderPointMap');
const { renderRankedBar } = await import('../src/charts/renderRankedBar');

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ scatter/swarm: ${name}\n`, e);
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
const tipOf = (key: string) => ({ title: key, lines: [`${key} line`] });

await test('scatter: one dot per point, emphasised last and labelled, guides and captions drawn', () => {
  const svg = freshSvg();
  const points = Array.from({ length: 40 }, (_, i) => ({
    key: `c${i}`,
    x: 500 + i * 100,
    y: 2 + (i % 7),
    color: 'var(--c-region-europe)',
    emphasis: i === 3 || i === 4,
    label: i === 3 ? '<b>Kyiv</b>' : `City ${i}`,
    tooltip: tipOf(`c${i}`),
  }));
  const axis = (label: string, domain: [number, number]) => ({ log: true, domain, ticks: [1, 10, 100], format: String, label });
  const cleanup = renderScatter(svg, points, {
    width: 800,
    reducedMotion: true,
    tooltip: tip,
    x: axis('price', [400, 5000]),
    y: axis('years', [1, 10]),
    guides: { x: 1000, y: 4 },
    quadrants: ['TL', 'TR', 'BL', 'BR'],
  });
  const dots = svg.querySelectorAll('circle.sc-dot');
  assert.equal(dots.length, 40);
  assert.equal(dots[dots.length - 1]!.classList.contains('is-emphasis'), true); // on top
  const labels = [...svg.querySelectorAll('text.sc-label')].map((t) => t.textContent);
  assert.deepEqual(labels.sort(), ['<b>Kyiv</b>', 'City 4'].sort());
  assert.equal(svg.querySelector('text.sc-label b'), null); // text, never markup
  assert.equal(svg.querySelectorAll('line.sc-guide').length, 2);
  assert.deepEqual([...svg.querySelectorAll('text.sc-quadrant')].map((t) => t.textContent), ['TL', 'TR', 'BL', 'BR']);
  cleanup();
  assert.equal(tip.hidden, true);
});

await test('scatter labels: close points get boxes that do not overlap', () => {
  const boxes = placeLabels(
    [0, 1, 2, 3].map((i) => ({ key: String(i), cx: 100, cy: 100 + i * 2, text: 'Label' })),
    0,
    400,
    5,
  );
  const ys = boxes.map((b) => b.y).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i]! - ys[i - 1]! >= 14, `labels ${ys.join(', ')}`);
});

await test('swarm: dodge keeps every pair of dots apart; an isolated dot sits on the line', () => {
  const xs = [...Array.from({ length: 200 }, (_, i) => 100 + (i % 20)), 700];
  const ys = dodge(xs, 4);
  for (let i = 0; i < xs.length; i++)
    for (let j = i + 1; j < xs.length; j++) assert.ok(Math.hypot(xs[i]! - xs[j]!, ys[i]! - ys[j]!) >= 9 - 1e-6, `${i}–${j} overlap`);
  assert.equal(ys[ys.length - 1], 0);
});

await test('swarm: renders dots, refs and lane labels; lanes never overlap', () => {
  const svg = freshSvg();
  const points = Array.from({ length: 60 }, (_, i) => ({
    key: `p${i}`,
    value: 20 + i * 10,
    color: 'var(--c-region-asia)',
    emphasis: i % 20 === 0,
    label: `Label ${i}`,
    tooltip: tipOf(`p${i}`),
  }));
  renderSwarm(svg, points, { width: 600, reducedMotion: true, tooltip: tip, log: true, domain: [10, 1000], ticks: [10, 100, 1000], format: String, axisLabel: 'axis', refs: [{ value: 100, label: '100%' }] });
  assert.equal(svg.querySelectorAll('circle.sw-dot').length, 60);
  assert.equal(svg.querySelectorAll('g.sw-ref').length, 1);
  assert.equal(svg.querySelectorAll('g.sw-label').length, 3);
  const lanes = laneLabels([{ key: 'a', x: 100, text: 'Long label A' }, { key: 'b', x: 110, text: 'Long label B' }, { key: 'c', x: 500, text: 'C' }], 600);
  assert.notEqual(lanes[0]!.lane, lanes[1]!.lane);
  assert.equal(lanes[2]!.lane, 0);
});

await test('dumbbell: both ends on the shared axis, ring left of the dot when the centre is dearer, emphasis class', () => {
  const svg = freshSvg();
  const rows = [
    { key: 'a', label: '1  A', from: 1000, to: 3000, color: 'red', valueLabel: '3.0×', emphasis: true, tooltip: tipOf('a') },
    { key: 'b', label: '2  B', from: 2000, to: 1500, color: 'blue', valueLabel: '0.75×', tooltip: tipOf('b') },
  ];
  renderDumbbell(svg, rows, { width: 800, reducedMotion: true, tooltip: tip, log: true, domain: [500, 5000], ticks: [1000, 2000], format: String });
  const from = [...svg.querySelectorAll('circle.db-from')].map((c) => Number(c.getAttribute('cx')));
  const to = [...svg.querySelectorAll('circle.db-to')].map((c) => Number(c.getAttribute('cx')));
  assert.ok(from[0]! < to[0]! && from[1]! > to[1]!);
  assert.equal(svg.querySelectorAll('g.db-row.is-emphasis').length, 1);
  assert.equal(layoutDumbbell(15, 360).stacked, true);
  assert.equal(layoutDumbbell(15, 1000).stacked, false);
});

await test('point map: cities project inside the frame; dots and labels drawn', () => {
  const land = { width: 1000, height: 439.1, scale: 188.2545, translate: [500, 245.7527] as [number, number], d: 'M0,0L10,10Z' };
  const points = [
    { key: 'kyiv', lat: 50.45, lon: 30.52, color: 'red', emphasis: true, label: 'Kyiv', tooltip: tipOf('kyiv') },
    { key: 'sydney', lat: -33.87, lon: 151.21, color: 'red', label: 'Sydney', tooltip: tipOf('sydney') },
  ];
  const { height, placed } = projectPoints(points, land, 500);
  assert.equal(height, 220);
  for (const p of placed) assert.ok(p.cx > 0 && p.cx < 500 && p.cy > 0 && p.cy < height, p.key);
  const zoom = projectPoints([...points, { ...points[0]!, key: 'lviv', lat: 49.84, lon: 24.03 }], land, 360, ['kyiv', 'lviv']);
  const [kyivZ, , lvivZ] = zoom.placed;
  assert.ok(zoom.k > 3 && kyivZ!.cx > lvivZ!.cx && kyivZ!.cx < 360 && lvivZ!.cx > 0, 'the focus fills the width');
  assert.ok(zoom.height <= 396, `height ${zoom.height}`);
  const svg = freshSvg();
  renderPointMap(svg, points, { width: 500, tooltip: tip, land });
  assert.equal(svg.querySelectorAll('circle.pm-dot').length, 2);
  assert.deepEqual([...svg.querySelectorAll('text.pm-label')].map((t) => t.textContent), ['Kyiv']);
  assert.equal(svg.querySelector('path.pm-land-path')!.getAttribute('d'), 'M0,0L10,10Z');
});

await test('point map: the written-out Equal Earth equals d3-geo’s geoEqualEarth (1e-6 px)', () => {
  const d3p = geoEqualEarth().scale(188.2545).translate([500, 245.7527]);
  for (const [lon, lat] of [[0, 0], [30.52, 50.45], [-74.01, 40.71], [151.21, -33.87], [179.9, 64], [-179.9, -55], [8.52, 47.17]] as const) {
    const [x, y] = equalEarth(lon, lat, 188.2545, [500, 245.7527]);
    const [ex, ey] = d3p([lon, lat])!;
    assert.ok(Math.abs(x - ex) < 1e-6 && Math.abs(y - ey) < 1e-6, `${lon},${lat}: ${x},${y} vs ${ex},${ey}`);
  }
});

await test('hover: the nearest point within reach, else none', () => {
  assert.equal(nearestPoint([0, 10, 20], [0, 0, 0], 11, 1, 5), 1);
  assert.equal(nearestPoint([0, 10, 20], [0, 0, 0], 50, 50, 5), -1);
  assert.equal(nearestPoint([], [], 0, 0, 5), -1);
});

await test('RankedBar: emphasis only where asked; rows without it are drawn as before', () => {
  const svg = freshSvg();
  const row = (key: string, emphasis?: boolean) => ({ key, label: key, value: 10, color: 'red', valueLabel: '10', tooltip: tipOf(key), ...(emphasis ? { emphasis } : {}) });
  renderRankedBar(svg, [row('a', true), row('b')], { width: 800, reducedMotion: true, tickFormat: String, tooltip: tip });
  assert.deepEqual([...svg.querySelectorAll('g.rb-row')].map((r) => r.getAttribute('class')), ['rb-row is-emphasis', 'rb-row']);
});

console.log(`✓ scatter/swarm/dumbbell/map: ${passed} tests passed.`);

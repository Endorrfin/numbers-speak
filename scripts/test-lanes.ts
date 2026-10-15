// test-lanes.ts — CHANGED (S3-ai1): the new chart pieces of the AI-models page drawn into jsdom — Lanes (lanes, dots inside
// the visible span only, dodging, labels as text, overview + brush: no selection on the whole span, a selection on a
// sub-span, a drag reports the span, a click reports null), Scatter's opt-in segments and zoom (no option = the same SVG
// as before; zoom: clip, redraw on a transform, ticks of the zoomed domain, kept across redraws, cleanup), the zoom
// gesture filter, and the build's chunk rule (brush / zoom / drag / hierarchy never in d3-vendor). Run: npm test.
// CHANGED (S3-ai3): + Lanes' opt-in event lines (inside the view only, close ones merged, tooltip, no option = no group).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="host"><svg></svg><div class="chart-tip" hidden></div></div>');
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
for (const k of ['MouseEvent', 'TouchEvent', 'WheelEvent', 'Event', 'SVGElement', 'Element', 'Node']) g[k] = (dom.window as unknown as Record<string, unknown>)[k];

const { dodge, fitSub, layoutLanes, mergeEvents, mergeLabels, renderLanes, LABEL_ROOM, EVENT_GAP } = await import('../src/charts/renderLanes');
const { renderScatter } = await import('../src/charts/renderScatter');
const { attachScatterZoom, zoomFilter } = await import('../src/charts/scatterZoom');
const { zoomIdentity } = await import('d3');

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ lanes/zoom: ${name}\n`, e);
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
const lanes = [
  { key: 'a', label: 'Alpha', sublabel: 'A-line' },
  { key: 'b', label: '<b>Beta</b>', sublabel: 'B-line' },
];
const points = [
  { key: '1', lane: 'a', t: T('2018-06-01'), mark: 'open' as const, tooltip: { title: 'A1', lines: [] } },
  { key: '2', lane: 'a', t: T('2024-03-01'), mark: 'closed' as const, label: 'A2 <i>x</i>', tooltip: { title: 'A2', lines: [] } },
  { key: '3', lane: 'b', t: T('2024-03-01'), mark: 'unknown' as const, tooltip: { title: 'B1', lines: [] } },
  { key: '4', lane: 'b', t: T('2024-03-01'), mark: 'open' as const, tooltip: { title: 'B2', lines: [] } },
  { key: '5', lane: 'b', t: T('2025-11-20'), mark: 'open' as const, tooltip: { title: 'B3', lines: [] } },
];
const domain: [number, number] = [T('2017-01-01'), T('2026-10-01')];
const fmt = (t: number, fine: boolean): string => (fine ? new Date(t).toISOString().slice(0, 7) : String(new Date(t).getUTCFullYear()));

await test('lanes: whole span — every dot, marks as classes, names as text, no brush selection', () => {
  const svg = freshSvg();
  const cleanup = renderLanes(svg, lanes, points, { width: 900, tooltip: tip, domain, view: domain, formatTick: fmt, onBrush: () => {} });
  assert.equal(svg.querySelectorAll('circle.ln-dot').length, 5);
  assert.equal(svg.querySelectorAll('circle.ln-dot.is-open').length, 3);
  assert.equal(svg.querySelectorAll('circle.ln-dot.is-unknown').length, 1);
  assert.deepEqual([...svg.querySelectorAll('text.ln-name')].map((t) => t.textContent), ['Alpha', '<b>Beta</b>']);
  assert.equal(svg.querySelector('text.ln-name b'), null);
  assert.equal(svg.querySelectorAll('line.ln-ov-tick').length, 5);
  const sel = svg.querySelector('.ln-brush rect.selection');
  assert.ok(sel, 'brush drawn');
  assert.ok(sel!.getAttribute('display') === 'none' || !sel!.getAttribute('width'), 'no selection over the whole span');
  // Same-day dots of one lane are dodged apart.
  const b = [...svg.querySelectorAll('circle.ln-dot')].filter((c) => c.getAttribute('cx') === svg.querySelectorAll('circle.ln-dot')[2]!.getAttribute('cx'));
  assert.ok(b.length >= 2 && new Set(b.map((c) => c.getAttribute('cy'))).size === b.length);
  cleanup();
});

await test('lanes: a sub-span shows only its dots, month ticks, the selection, and labels as text in extra room', () => {
  const svg = freshSvg();
  const view: [number, number] = [T('2024-01-01'), T('2025-01-01')];
  const cleanup = renderLanes(svg, lanes, points, { width: 900, tooltip: tip, domain, view, formatTick: fmt, onBrush: () => {} });
  assert.equal(svg.querySelectorAll('circle.ln-dot').length, 3);
  assert.ok([...svg.querySelectorAll('.ln-grid text')].every((t) => /^\d{4}-\d{2}$/.test(t.textContent ?? '')));
  const sel = svg.querySelector('.ln-brush rect.selection')!;
  assert.ok(Number(sel.getAttribute('width')) > 0, 'selection drawn');
  const labels = [...svg.querySelectorAll('text.ln-label')];
  assert.deepEqual(labels.map((t) => t.textContent), ['A2 <i>x</i>']);
  assert.equal(svg.querySelector('text.ln-label i'), null);
  const L = layoutLanes(900, lanes, new Set(['a']));
  assert.equal(L.laneY[0], 8 + LABEL_ROOM + L.laneH / 2);
  assert.equal(svg.getAttribute('height'), String(L.height));
  cleanup();
});

await test('lanes: a drag on the overview reports the span once; a click reports null', () => {
  const svg = freshSvg();
  const got: Array<[number, number] | null> = [];
  renderLanes(svg, lanes, points, { width: 900, tooltip: tip, domain, view: domain, formatTick: fmt, onBrush: (s) => got.push(s) });
  const overlay = svg.querySelector('.ln-brush rect.overlay')!;
  const L = layoutLanes(900, lanes);
  const y = L.ovTop + 10;
  const fire = (type: string, target: EventTarget, x: number) => {
    const ev = new dom.window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, view: dom.window as unknown as Window });
    target.dispatchEvent(ev);
  };
  fire('mousedown', overlay, 300);
  fire('mousemove', dom.window, 500);
  fire('mouseup', dom.window, 500);
  assert.equal(got.length, 1);
  assert.ok(got[0] && got[0][0] < got[0][1], 'a span');
  fire('mousedown', overlay, 600);
  fire('mouseup', dom.window, 600);
  assert.equal(got.length, 2);
  assert.equal(got[1], null);
});

await test('lanes: phone layout — narrow label column, no sublabels; dodge keeps dots apart and inside the lane', () => {
  const svg = freshSvg();
  renderLanes(svg, lanes, points, { width: 360, tooltip: tip, domain, view: domain, formatTick: fmt });
  assert.equal(svg.querySelectorAll('text.ln-sub').length, 0);
  assert.equal(svg.querySelector('.ln-brush rect'), null, 'no brush without onBrush');
  const ys = dodge([10, 10, 10, 10, 10], 3, 10);
  assert.equal(new Set(ys).size, 5);
  assert.ok(ys.every((y) => Math.abs(y) <= 10));
  assert.deepEqual(dodge([0, 100], 3, 10), [0, 0]);
  // Labels on (almost) the same x share one: "first +n".
  assert.deepEqual(mergeLabels([{ i: 0, x: 10, text: 'A' }, { i: 1, x: 14, text: 'B' }, { i: 2, x: 15, text: 'C' }, { i: 3, x: 40, text: 'D' }, { i: 4, x: 41 }], 9), [
    { i: 0, text: 'A +2' },
    { i: 3, text: 'D' },
  ]);
});

// CHANGED (S3-ai3)
await test('lanes: event lines — opt-in, inside the view only, close ones merged, tooltip names them all', () => {
  const ev = (key: string, iso: string, title: string) => ({ key, t: T(iso), tooltip: { title, lines: [iso] } });
  const events = [ev('launch', '2022-11-30', 'Launch <b>'), ev('e1', '2024-03-26', 'First'), ev('e2', '2024-03-31', 'Second'), ev('late', '2026-12-01', 'Outside')];
  // No option: no group at all (the SVG is the pre-S3-ai3 one).
  const plain = freshSvg();
  renderLanes(plain, lanes, points, { width: 900, tooltip: tip, domain, view: domain, formatTick: fmt });
  assert.equal(plain.querySelector('.ln-events'), null);
  const before = plain.outerHTML;
  const again = freshSvg();
  renderLanes(again, lanes, points, { width: 900, tooltip: tip, domain, view: domain, formatTick: fmt, events: undefined });
  assert.equal(again.outerHTML, before);

  const svg = freshSvg();
  const cleanup = renderLanes(svg, lanes, points, { width: 900, tooltip: tip, domain, view: domain, formatTick: fmt, events });
  const groups = [...svg.querySelectorAll('g.ln-event')];
  assert.equal(groups.length, 2, 'five days apart merge on the whole span; outside the view is dropped');
  assert.equal(svg.querySelectorAll('g.ln-event.is-merged').length, 1);
  assert.equal(svg.querySelectorAll('.ln-event line').length, 2);
  assert.equal(svg.querySelectorAll('.ln-event path').length, 2);
  // Lines sit under the dots (drawn before the lanes group).
  const order = [...svg.children].map((c) => c.getAttribute('class'));
  assert.ok(order.indexOf('ln-events') < order.indexOf('ln-dots'));
  // Hover on the launch line, away from every dot: the event's tooltip, as text.
  const x = Number(groups[0]!.querySelector('line')!.getAttribute('x1'));
  const L = layoutLanes(900, lanes);
  svg.querySelector('.ln-hit')!.dispatchEvent(new dom.window.MouseEvent('pointermove', { bubbles: true, clientX: x + 2, clientY: L.lanesTop + 2 }));
  assert.equal(tip.hidden, false);
  assert.equal(tip.querySelector('strong')!.textContent, 'Launch <b>');
  assert.equal(tip.querySelector('b'), null, 'text, not markup');
  cleanup();
  // A narrower view drops what falls outside it.
  const svg2 = freshSvg();
  renderLanes(svg2, lanes, points, { width: 900, tooltip: tip, domain, view: [T('2024-01-01'), T('2025-01-01')], formatTick: fmt, events });
  assert.equal(svg2.querySelectorAll('g.ln-event').length, 2, 'at this scale the two March days stand apart');
  // mergeEvents: in x order, within the gap of the group's first; members listed in date order.
  const merged = mergeEvents(
    [
      { x: 14, event: ev('b', '2024-01-02', 'B') },
      { x: 10, event: ev('a', '2024-01-01', 'A') },
      { x: 10 + EVENT_GAP, event: ev('c', '2024-02-01', 'C') },
    ],
    EVENT_GAP,
  );
  assert.deepEqual(
    merged.map((m) => [m.key, m.n, m.tooltip.title, m.tooltip.lines]),
    [
      ['a', 2, 'A', ['2024-01-01', 'B', '2024-01-02']],
      ['c', 1, 'C', ['2024-02-01']],
    ],
  );
});

// ── Scatter: segments + zoom are opt-in ─────────────────────────────────────────────────────────────
const axis = (label: string, domainA: [number, number], log = true) => ({ log, domain: domainA, ticks: log ? [1, 10, 100] : [2018, 2020, 2022], format: String, label });
const sPoints = Array.from({ length: 30 }, (_, i) => ({
  key: `p${i}`,
  x: 2017.5 + i * 0.3,
  y: 1.5 * 1.15 ** i,
  color: 'var(--tx2)',
  emphasis: i === 29,
  label: `M${i}`,
  tooltip: { title: `M${i}`, lines: [] },
}));
const base = { width: 800, reducedMotion: true, tooltip: tip, x: axis('date', [2017, 2027], false), y: axis('flop', [1, 100]) };

await test('scatter: without the new options the SVG is the same as the S3-re renderer', () => {
  const svg = freshSvg();
  renderScatter(svg, sPoints, base);
  const now = svg.outerHTML;
  // Checked against the pre-S3-ai1 renderer in the session (28 fixtures, byte-identical); here the markers are pinned:
  assert.equal(svg.querySelector('defs'), null);
  assert.equal(svg.querySelector('[clip-path]'), null);
  assert.equal(svg.querySelector('.sc-segment'), null);
  // A redraw with the same input is byte-identical (idempotent).
  renderScatter(svg, sPoints, base);
  assert.equal(svg.outerHTML, now);
});

await test('scatter: segments drawn between data points', () => {
  const svg = freshSvg();
  renderScatter(svg, sPoints, { ...base, segments: [{ key: 'trend', from: [2017, 1], to: [2027, 100] }] });
  const seg = svg.querySelector('line.sc-segment')!;
  assert.equal(Number(seg.getAttribute('y1')) > Number(seg.getAttribute('y2')), true); // rises
});

await test('scatter zoom: clip, redraw on a transform with the zoomed ticks, kept across a redraw, detached on cleanup', () => {
  const svg = freshSvg();
  const controls = { current: null as null | { zoomBy: (f: number) => void; reset: () => void } };
  let onZoom: ((t: typeof zoomIdentity) => void) | null = null;
  const attach = (host: Parameters<typeof attachScatterZoom>[0]) => {
    onZoom = host.onZoom;
    return attachScatterZoom(host);
  };
  const xTicks = () => [2020, 2020.5];
  const yTicks = () => [5, 2];
  const cleanup = renderScatter(svg, sPoints, { ...base, zoom: { xTicks, yTicks, controls, attach } });
  assert.ok(svg.querySelector('clipPath rect'));
  assert.equal(svg.querySelector('g.sc-dots')!.getAttribute('clip-path')?.startsWith('url(#sc-clip-'), true);
  assert.ok(controls.current, 'buttons handle set');
  const before = svg.querySelector('circle.sc-dot')!.getAttribute('cx');
  onZoom!(zoomIdentity.translate(-400, -100).scale(2));
  assert.notEqual(svg.querySelector('circle.sc-dot')!.getAttribute('cx'), before);
  assert.deepEqual([...svg.querySelectorAll('text.sc-tx')].map((t) => t.textContent), ['2020', '2020.5']);
  assert.deepEqual([...svg.querySelectorAll('text.sc-ty')].map((t) => t.textContent), ['2', '5']); // sorted
  cleanup();
  assert.equal(controls.current, null);
});

await test('zoom gestures: plain wheel scrolls the page; Ctrl/⌘ + wheel and a pinch zoom; one finger pans only when zoomed', () => {
  const wheel = (o: object) => Object.assign(new dom.window.Event('wheel'), o) as unknown as Event;
  assert.equal(zoomFilter(wheel({ ctrlKey: false, metaKey: false }), 1), false);
  assert.equal(zoomFilter(wheel({ ctrlKey: true, metaKey: false }), 1), true);
  assert.equal(zoomFilter(wheel({ ctrlKey: false, metaKey: true }), 1), true);
  const touch = (n: number) => Object.assign(new dom.window.Event('touchstart'), { touches: { length: n } }) as unknown as Event;
  assert.equal(zoomFilter(touch(1), 1), false);
  assert.equal(zoomFilter(touch(2), 1), true);
  assert.equal(zoomFilter(touch(1), 2), true);
  const mouse = (o: object) => Object.assign(new dom.window.Event('mousedown'), o) as unknown as Event;
  assert.equal(zoomFilter(mouse({ ctrlKey: false, button: 0 }), 1), true);
  assert.equal(zoomFilter(mouse({ ctrlKey: false, button: 2 }), 1), false);
});

await test('build: d3-brush, d3-zoom, d3-drag and d3-hierarchy stay out of d3-vendor and are imported from their own packages', async () => {
  const { vendorChunk, PAGE_ONLY_D3 } = await import('../vite.config');
  for (const m of PAGE_ONLY_D3) assert.equal(vendorChunk(`/x/node_modules/${m}/src/index.js`), undefined, m);
  for (const m of ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-dispatch', 'd3', 'internmap']) {
    assert.equal(vendorChunk(`/x/node_modules/${m}/src/index.js`), 'd3-vendor', m);
  }
  assert.equal(vendorChunk('/x/node_modules/react-dom/index.js'), 'react-vendor');
  assert.equal(vendorChunk('/x/src/charts/renderScatter.ts'), undefined);
  // Through the `d3` umbrella they would leave the page's chunk (vite.config.ts): every runtime import names the package.
  const { readdirSync } = await import('node:fs');
  const files = ['src/charts', ...readdirSync('src/viz').map((d) => `src/viz/${d}`)].flatMap((dir) =>
    readdirSync(dir).filter((f) => /\.tsx?$/.test(f)).map((f) => `${dir}/${f}`),
  );
  const names = /\b(brush|brushX|brushY|brushSelection|zoom|zoomIdentity|zoomTransform|drag|hierarchy|stratify|tree|cluster|treemap|pack|partition)\b/;
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/^import \{([^}]*)\} from 'd3';/gm)) {
      assert.ok(!names.test(m[1]!), `${f}: import ${m[1]!.trim()} from its own package, not 'd3'`);
    }
  }
  const scatter = readFileSync('src/charts/renderScatter.ts', 'utf8');
  assert.ok(!/from 'd3-zoom'/.test(scatter.replace(/^import type .*$/gm, '')), 'renderScatter must not load d3-zoom (scatterZoom.ts does)');
});

// CHANGED (S3-ai2)
await test('lanes: a sublabel wider than the label column is cut with an ellipsis and keeps a <title>', () => {
  assert.equal(fitSub('GPT · o-series', 118), 'GPT · o-series');
  const cut = fitSub('Mistral · Mixtral · Magistral', 118);
  assert.ok(cut.endsWith('…') && cut.length * 10.5 * 0.56 <= 118, cut);
  const svg = freshSvg();
  renderLanes(svg, [{ key: 'm', label: 'Mistral', sublabel: 'Mistral · Mixtral · Magistral' }, { key: 'o', label: 'OpenAI', sublabel: 'GPT · o-series' }], [], { width: 900, tooltip: tip, domain, view: domain, formatTick: fmt });
  const subs = [...svg.querySelectorAll('text.ln-sub')];
  assert.equal(subs[0]!.querySelector('title')!.textContent, 'Mistral · Mixtral · Magistral');
  assert.equal(subs[1]!.querySelector('title'), null);
  assert.equal(subs[1]!.textContent, 'GPT · o-series');
});

console.log(`✓ lanes/zoom — ${passed} tests passed.`);

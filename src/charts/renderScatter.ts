/*
 * renderScatter.ts — pure D3 renderer for a scatter plot of many named entities. CHANGED (S3-re): new.
 *
 *   renderScatter(svg, points, options) → cleanup
 *
 * One dot per entity (8 px, with a surface ring so overlapping dots stay distinct), log or linear axes with fixed
 * domains (a filter never rescales the plot), optional guide lines (e.g. the medians) that split the plot into four
 * captioned quadrants, and direct labels only for emphasised points — everything else is named by the tooltip and
 * the table view. The pointer snaps to the nearest dot within 32 px, so small dots are easy to hit (a linear scan:
 * a few hundred dots cost nothing per move, and the page needs no Delaunay module).
 *
 * Safety: text is written with `.text()` / `textContent` only. Motion: `reducedMotion` → no transitions.
 *
 * CHANGED (S3-ai1): two opt-in options, for the AI models' training-compute cloud (1,242 dots). Without them the SVG is
 * byte-for-byte what it was (test-scatter-swarm.ts):
 *   - `segments` — straight lines between two data points (a trend on log axes is straight);
 *   - `zoom` — zoom and pan of the plot. The gestures live in scatterZoom.ts (d3-zoom), passed in as `zoom.attach`, so
 *     d3-zoom and d3-drag load only with the page that zooms (the real-estate scatter does not). Ticks come from
 *     `zoom.xTicks/yTicks` for the zoomed domain; dots, labels and guides are clipped to the plot.
 */
import { pointer, scaleLinear, scaleLog, select } from 'd3';
import type { ScaleContinuousNumeric, ZoomTransform } from 'd3';
import { hideTip, showTip } from './tooltip';
import type { TipContent } from './tooltip';

export type ScatterPoint = {
  key: string;
  x: number;
  y: number;
  /** Any CSS colour, typically `var(--c-region-…)`. */
  color: string;
  /** Drawn on top, larger, with an accent ring and a direct label. */
  emphasis?: boolean;
  /** Direct label (shown for emphasised points only). */
  label: string;
  tooltip: TipContent;
};

export type ScatterAxis = {
  log: boolean;
  /** Fixed [min, max]; the caller derives it from the whole dataset. */
  domain: [number, number];
  ticks: number[];
  format: (value: number) => string;
  /** Axis title, plain text. */
  label: string;
};

export type ScatterOptions = {
  width: number;
  reducedMotion: boolean;
  tooltip: HTMLElement | null;
  x: ScatterAxis;
  y: ScatterAxis;
  /** Guide lines (e.g. the medians) at these data values. */
  guides?: { x?: number; y?: number };
  /** Captions of the four quadrants the guides make: top-left, top-right, bottom-left, bottom-right. */
  quadrants?: readonly [string, string, string, string];
  /** CHANGED (S3-ai1): lines between two data points (e.g. a trend). */
  segments?: readonly ScatterSegment[];
  /** CHANGED (S3-ai1): zoom and pan (see the header). */
  zoom?: ScatterZoom;
};

export type ScatterSegment = { key: string; from: [number, number]; to: [number, number] };

/** Buttons' handle: the renderer fills it while the chart is drawn and clears it on cleanup. */
export type ScatterZoomControls = { zoomBy: (factor: number) => void; reset: () => void };

/** What the renderer hands the zoom module: the plot's frame and a redraw for a transform. */
export type ZoomHost = {
  svg: SVGSVGElement;
  extent: [[number, number], [number, number]];
  reducedMotion: boolean;
  onZoom: (t: ZoomTransform) => void;
};

export type ScatterZoom = {
  /** Tick values for a zoomed-in domain (the axis' own `ticks` are used at full extent). */
  xTicks: (domain: [number, number]) => number[];
  yTicks: (domain: [number, number]) => number[];
  controls: { current: ScatterZoomControls | null };
  /** Binds the gestures (scatterZoom.ts); returns the buttons' handle and a detach. */
  attach: (host: ZoomHost) => { controls: ScatterZoomControls; detach: () => void };
};

export type ScatterLayout = { height: number; left: number; right: number; top: number; bottom: number; r: number };

const FONT = 12;
const CHAR = 0.6; // average glyph width / font size (bold labels) — an estimate, so jsdom needs no layout
const DURATION = 400;
const SNAP = 32;

export const labelWidth = (s: string, font = FONT): number => Math.ceil(s.length * font * CHAR);

/** Plot frame for a container width (exported for tests): taller than wide on phones, 0.62 of the width on desktop. */
export function layoutScatter(width: number, titleLines: { x: number; y: number } = { x: 1, y: 1 }): ScatterLayout {
  const phone = width < 560;
  const height = Math.round(Math.min(Math.max(width * (phone ? 1.2 : 0.62), 320), 620));
  return { height, left: phone ? 40 : 52, right: 12, top: 16 + 14 * titleLines.y, bottom: 32 + 14 * titleLines.x, r: 4 };
}

/** An axis title that does not fit `max` px is split at " · " into lines (exported for the other charts). */
export function splitTitle(text: string, max: number): string[] {
  return labelWidth(text) <= max ? [text] : text.split(' · ');
}

/** Index of the point nearest to (x, y) within `max` px, or -1 (exported for tests and the other point charts). */
export function nearestPoint(xs: readonly number[], ys: readonly number[], x: number, y: number, max: number): number {
  let best = -1;
  let bestD = max * max;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i]! - x;
    const dy = ys[i]! - y;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export type LabelBox = { key: string; x: number; y: number; anchor: 'start' | 'end'; text: string };

/**
 * Direct labels beside their dots without overlapping each other (exported for tests): right of the dot unless
 * that runs past the frame, then nudged down/up in 14 px steps until the box is free.
 */
export function placeLabels(
  items: ReadonlyArray<{ key: string; cx: number; cy: number; text: string }>,
  left: number,
  right: number,
  r: number,
): LabelBox[] {
  const boxes: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
  const out: LabelBox[] = [];
  for (const it of [...items].sort((a, b) => a.cy - b.cy)) {
    const w = labelWidth(it.text);
    const toRight = it.cx + r + 6 + w <= right;
    const x = toRight ? it.cx + r + 5 : it.cx - r - 5;
    const x0 = toRight ? x : Math.max(left, x - w);
    const x1 = x0 + w;
    let y = it.cy;
    for (const dy of [0, 14, -14, 28, -28, 42, -42]) {
      const y0 = it.cy + dy - 7;
      const y1 = it.cy + dy + 7;
      if (!boxes.some((b) => x0 < b.x1 && x1 > b.x0 && y0 < b.y1 && y1 > b.y0)) {
        y = it.cy + dy;
        break;
      }
    }
    boxes.push({ x0, x1, y0: y - 7, y1: y + 7 });
    out.push({ key: it.key, x, y, anchor: toRight ? 'start' : 'end', text: it.text });
  }
  return out;
}

function makeScale(axis: ScatterAxis, range: [number, number]): ScaleContinuousNumeric<number, number> {
  const s: ScaleContinuousNumeric<number, number> = axis.log ? scaleLog() : scaleLinear();
  return s.domain(axis.domain).range(range).clamp(true);
}

export function renderScatter(svgEl: SVGSVGElement, points: readonly ScatterPoint[], options: ScatterOptions): () => void {
  const { width, reducedMotion, tooltip } = options;
  const xTitle = splitTitle(options.x.label, width - 16);
  const yTitle = splitTitle(options.y.label, width - 16);
  const L = layoutScatter(width, { x: xTitle.length, y: yTitle.length });
  const phone = width < 560;
  const duration = reducedMotion ? 0 : DURATION;
  const x0 = L.left;
  const x1 = width - L.right;
  const y0 = L.top;
  const y1 = L.height - L.bottom;
  const x = makeScale(options.x, [x0, x1]);
  const y = makeScale(options.y, [y1, y0]);
  const svg = select(svgEl);
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);

  const layer = (cls: string) =>
    svg
      .selectAll<SVGGElement, null>(`g.${cls}`)
      .data([null])
      .join((enter) => enter.append('g').attr('class', cls));

  // ── Grid, ticks and titles (recessive; text in text tokens) ─────────────────────────────────────
  // CHANGED (S3-ai1): the tick joins take the scales and ticks as arguments, so a zoom can redraw them.
  const grid = layer('sc-grid');
  const drawTicks = (sx: (v: number) => number, sy: (v: number) => number, xt: readonly number[], yt: readonly number[]): void => {
    grid
      .selectAll<SVGLineElement, number>('line.sc-gx')
      .data(xt)
      .join('line')
      .attr('class', 'sc-gx')
      .attr('x1', (d) => sx(d))
      .attr('x2', (d) => sx(d))
      .attr('y1', y0)
      .attr('y2', y1);
    grid
      .selectAll<SVGLineElement, number>('line.sc-gy')
      .data(yt)
      .join('line')
      .attr('class', 'sc-gy')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', (d) => sy(d))
      .attr('y2', (d) => sy(d));
    grid
      .selectAll<SVGTextElement, number>('text.sc-tx')
      .data(xt)
      .join('text')
      .attr('class', 'sc-tick sc-tx')
      .attr('x', (d) => sx(d))
      .attr('y', y1 + 16)
      .attr('text-anchor', 'middle')
      .text((d) => options.x.format(d));
    grid
      .selectAll<SVGTextElement, number>('text.sc-ty')
      .data(yt)
      .join('text')
      .attr('class', 'sc-tick sc-ty')
      .attr('x', x0 - 6)
      .attr('y', (d) => sy(d))
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text((d) => options.y.format(d));
  };
  drawTicks(x, y, options.x.ticks, options.y.ticks);
  grid
    .selectAll<SVGTextElement, string>('text.sc-title-x')
    .data(xTitle)
    .join('text')
    .attr('class', 'sc-title sc-title-x')
    .attr('x', x1)
    .attr('y', (_, i) => y1 + 32 + i * 14)
    .attr('text-anchor', 'end')
    .text((d) => d);
  grid
    .selectAll<SVGTextElement, string>('text.sc-title-y')
    .data(yTitle)
    .join('text')
    .attr('class', 'sc-title sc-title-y')
    .attr('x', 0)
    .attr('y', (_, i) => 12 + i * 14)
    .attr('text-anchor', 'start')
    .text((d) => d);

  // ── Guides and quadrant captions ─────────────────────────────────────────────────────────────────
  const guides = layer('sc-guides');
  const gx = options.guides?.x;
  const gy = options.guides?.y;
  const drawGuides = (sx: (v: number) => number, sy: (v: number) => number): void => {
    guides
      .selectAll<SVGLineElement, number>('line.sc-guide-x')
      .data(gx === undefined ? [] : [gx])
      .join('line')
      .attr('class', 'sc-guide sc-guide-x')
      .attr('x1', (d) => sx(d))
      .attr('x2', (d) => sx(d))
      .attr('y1', y0)
      .attr('y2', y1);
    guides
      .selectAll<SVGLineElement, number>('line.sc-guide-y')
      .data(gy === undefined ? [] : [gy])
      .join('line')
      .attr('class', 'sc-guide sc-guide-y')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', (d) => sy(d))
      .attr('y2', (d) => sy(d));
  };
  drawGuides(x, y);
  const q = options.quadrants ?? [];
  const corners: Array<{ text: string; x: number; y: number; anchor: string }> = q.map((text, i) => ({
    text,
    x: i % 2 === 0 ? x0 + 6 : x1 - 6,
    // Phones: the right-hand captions step inwards, so the two of a row never overlap.
    y: i < 2 ? y0 + 14 + (phone && i === 1 ? 14 : 0) : y1 - 8 - (phone && i === 3 ? 14 : 0),
    anchor: i % 2 === 0 ? 'start' : 'end',
  }));
  guides
    .selectAll<SVGTextElement, (typeof corners)[number]>('text.sc-quadrant')
    .data(corners)
    .join('text')
    .attr('class', 'sc-quadrant')
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y)
    .attr('text-anchor', (d) => d.anchor)
    .text((d) => d.text);
  // CHANGED (S3-ai1): optional segments (none → no element, the SVG stays as before).
  const drawSegments = (sx: (v: number) => number, sy: (v: number) => number): void => {
    if (!options.segments) return;
    guides
      .selectAll<SVGLineElement, ScatterSegment>('line.sc-segment')
      .data(options.segments, (d) => d.key)
      .join('line')
      .attr('class', 'sc-segment')
      .attr('x1', (d) => sx(d.from[0]))
      .attr('y1', (d) => sy(d.from[1]))
      .attr('x2', (d) => sx(d.to[0]))
      .attr('y2', (d) => sy(d.to[1]));
  };
  drawSegments(x, y);

  // ── Dots (emphasised last, so on top) ────────────────────────────────────────────────────────────
  const ordered = [...points].sort((a, b) => Number(Boolean(a.emphasis)) - Number(Boolean(b.emphasis)));
  const px = (d: ScatterPoint): number => x(d.x);
  const py = (d: ScatterPoint): number => y(d.y);
  const dotLayer = layer('sc-dots');
  const dots = dotLayer
    .selectAll<SVGCircleElement, ScatterPoint>('circle.sc-dot')
    .data(ordered, (d) => d.key)
    .join(
      (enter) => enter.append('circle').attr('class', 'sc-dot').attr('cx', px).attr('cy', py).style('opacity', duration ? 0 : 1),
      (update) => update,
      (exit) => exit.remove(),
    )
    .order()
    .classed('is-emphasis', (d) => Boolean(d.emphasis))
    .attr('r', (d) => (d.emphasis ? L.r + 2 : L.r))
    .style('fill', (d) => d.color);
  if (duration) dots.transition().duration(duration).attr('cx', px).attr('cy', py).style('opacity', 1);
  else dots.attr('cx', px).attr('cy', py).style('opacity', 1);

  const labelLayer = layer('sc-labels');
  const drawLabels = (fx: (d: ScatterPoint) => number, fy: (d: ScatterPoint) => number, inside: (d: ScatterPoint) => boolean): void => {
    const labels = placeLabels(
      ordered.filter((d) => d.emphasis && inside(d)).map((d) => ({ key: d.key, cx: fx(d), cy: fy(d), text: d.label })),
      x0,
      x1,
      L.r + 2,
    );
    labelLayer
      .selectAll<SVGTextElement, LabelBox>('text.sc-label')
      .data(labels, (d) => d.key)
      .join('text')
      .attr('class', 'sc-label')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => d.anchor)
      .text((d) => d.text);
  };
  drawLabels(px, py, () => true);

  // ── Hover: nearest dot within SNAP px (pointer only; the table view serves keyboards) ────────────
  const ring = layer('sc-hover')
    .selectAll<SVGCircleElement, null>('circle.sc-ring')
    .data([null])
    .join('circle')
    .attr('class', 'sc-ring')
    .attr('r', L.r + 5)
    .attr('display', 'none');
  let xs = ordered.map(px);
  let ys = ordered.map(py);
  const hide = (): void => {
    ring.attr('display', 'none');
    hideTip(tooltip);
  };
  const overlay = layer('sc-overlay')
    .selectAll<SVGRectElement, null>('rect.sc-hit')
    .data([null])
    .join('rect')
    .attr('class', 'sc-hit')
    .attr('x', x0)
    .attr('y', y0)
    .attr('width', Math.max(0, x1 - x0))
    .attr('height', Math.max(0, y1 - y0))
    .on('pointermove.sc pointerdown.sc', (event: PointerEvent) => {
      const [mx, my] = pointer(event, svgEl);
      const i = nearestPoint(xs, ys, mx, my, SNAP);
      const d = ordered[i];
      if (!d) return hide();
      ring.attr('cx', xs[i]!).attr('cy', ys[i]!).attr('display', null);
      showTip(tooltip, svgEl, event, d.tooltip);
    })
    .on('pointerleave.sc', hide);

  // ── CHANGED (S3-ai1): zoom (opt-in) ───────────────────────────────────────────────────────────────
  const zoomOpt = options.zoom;
  let detachZoom: (() => void) | null = null;
  if (zoomOpt) {
    const clipId = `sc-clip-${++clipSeq}`;
    svg
      .selectAll<SVGDefsElement, null>('defs.sc-defs')
      .data([null])
      .join('defs')
      .attr('class', 'sc-defs')
      .selectAll<SVGClipPathElement, null>('clipPath')
      .data([null])
      .join('clipPath')
      .attr('id', clipId)
      .selectAll<SVGRectElement, null>('rect')
      .data([null])
      .join('rect')
      .attr('x', x0 - L.r - 2)
      .attr('y', y0 - L.r - 2)
      .attr('width', Math.max(0, x1 - x0 + 2 * L.r + 4))
      .attr('height', Math.max(0, y1 - y0 + 2 * L.r + 4));
    for (const g of [dotLayer, labelLayer, guides]) g.attr('clip-path', `url(#${clipId})`);
    const redraw = (t: ZoomTransform): void => {
      const zx = t.rescaleX(x).clamp(false);
      const zy = t.rescaleY(y).clamp(false);
      const full = t.k === 1;
      const xt = full ? options.x.ticks : zoomOpt.xTicks(zx.domain() as [number, number]);
      const yt = full ? options.y.ticks : zoomOpt.yTicks(zy.domain() as [number, number]).sort((a, b) => a - b);
      drawTicks(zx, zy, xt, yt);
      drawGuides(zx, zy);
      drawSegments(zx, zy);
      const fx = (d: ScatterPoint): number => zx(d.x);
      const fy = (d: ScatterPoint): number => zy(d.y);
      dots.interrupt().attr('cx', fx).attr('cy', fy).style('opacity', 1);
      drawLabels(fx, fy, (d) => fx(d) >= x0 && fx(d) <= x1 && fy(d) >= y0 && fy(d) <= y1);
      xs = ordered.map(fx);
      ys = ordered.map(fy);
      hide();
    };
    const bound = zoomOpt.attach({
      svg: svgEl,
      extent: [
        [x0, y0],
        [x1, y1],
      ],
      reducedMotion,
      onZoom: redraw,
    });
    zoomOpt.controls.current = bound.controls;
    detachZoom = bound.detach;
  }

  return () => {
    svg.selectAll('*').interrupt();
    overlay.on('.sc', null);
    if (zoomOpt) {
      detachZoom?.();
      zoomOpt.controls.current = null;
    }
    hide();
  };
}

let clipSeq = 0;

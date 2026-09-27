/*
 * renderSwarm.ts — pure D3 renderer for a beeswarm: every entity as a dot on one value axis, dodged vertically so
 * no two dots overlap. CHANGED (S3-re): new.
 *
 *   renderSwarm(svg, points, options) → cleanup
 *
 * The axis may be logarithmic (values spanning decades, e.g. a mortgage at 15 % … 1 900 % of income). Reference
 * lines (e.g. 100 %, the median) carry a caption in text ink. Emphasised dots get an accent ring and a label in
 * lanes above the swarm with a thin leader line, so labels never sit on top of other dots.
 *
 * Safety: text is written with `.text()` / `textContent` only. Motion: `reducedMotion` → no transitions.
 */
import { pointer, scaleLinear, scaleLog, select } from 'd3';
import type { ScaleContinuousNumeric } from 'd3';
import { labelWidth, nearestPoint, splitTitle } from './renderScatter';
import { hideTip, showTip } from './tooltip';
import type { TipContent } from './tooltip';

export type SwarmPoint = {
  key: string;
  value: number;
  color: string;
  emphasis?: boolean;
  /** Label of an emphasised dot. */
  label: string;
  tooltip: TipContent;
};

export type SwarmRef = { value: number; label: string };

export type SwarmOptions = {
  width: number;
  reducedMotion: boolean;
  tooltip: HTMLElement | null;
  log: boolean;
  /** Fixed [min, max] of the axis. */
  domain: [number, number];
  ticks: number[];
  format: (value: number) => string;
  /** Axis title under the ticks, plain text. */
  axisLabel: string;
  refs?: readonly SwarmRef[];
};

const R = 4;
const GAP = 1;
const LANE = 16;
const SNAP = 24;
const DURATION = 400;
const SIDE = 8;

/**
 * Vertical offsets that keep dots of radius `r` apart (exported for tests): dots are placed in x order, each at the
 * offset nearest the axis line that clears every dot already placed — Bostock's "dodge", mirrored above and below.
 */
export function dodge(xs: readonly number[], r: number, gap = GAP): number[] {
  const d = 2 * r + gap;
  const d2 = d * d;
  const order = xs.map((_, i) => i).sort((a, b) => xs[a]! - xs[b]! || a - b);
  const ys = new Array<number>(xs.length).fill(0);
  const placed: number[] = [];
  let start = 0;
  for (const i of order) {
    const xi = xs[i]!;
    while (start < placed.length && xs[placed[start]!]! < xi - d) start++;
    const near = placed.slice(start);
    const candidates = [0];
    for (const j of near) {
      const dx = xi - xs[j]!;
      const dy = Math.sqrt(Math.max(0, d2 - dx * dx));
      candidates.push(ys[j]! + dy, ys[j]! - dy);
    }
    candidates.sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
    const free = candidates.find((c) => near.every((j) => (xi - xs[j]!) ** 2 + (c - ys[j]!) ** 2 >= d2 - 1e-6));
    ys[i] = free ?? 0;
    placed.push(i);
  }
  return ys;
}

type Lane = { key: string; x: number; lane: number; text: string };

/** Labels in up to three lanes above the swarm, left to right, first free lane wins (exported for tests). */
export function laneLabels(items: ReadonlyArray<{ key: string; x: number; text: string }>, width: number, lanes = 3): Lane[] {
  const ends: number[] = new Array<number>(lanes).fill(-Infinity);
  const out: Lane[] = [];
  for (const it of [...items].sort((a, b) => a.x - b.x)) {
    const w = labelWidth(it.text);
    const cx = Math.min(Math.max(it.x, w / 2), width - w / 2);
    const lane = ends.findIndex((end) => cx - w / 2 >= end + 8);
    const use = lane === -1 ? ends.indexOf(Math.min(...ends)) : lane;
    ends[use] = cx + w / 2;
    out.push({ key: it.key, x: cx, lane: use, text: it.text });
  }
  return out;
}

type Placed = SwarmPoint & { cx: number; cy: number };

export function renderSwarm(svgEl: SVGSVGElement, points: readonly SwarmPoint[], options: SwarmOptions): () => void {
  const { width, reducedMotion, tooltip } = options;
  const duration = reducedMotion ? 0 : DURATION;
  const scale: ScaleContinuousNumeric<number, number> = options.log ? scaleLog() : scaleLinear();
  const x = scale.domain(options.domain).range([SIDE, width - SIDE]).clamp(true);
  const offsets = dodge(points.map((p) => x(p.value)), R);
  const spread = Math.max(R, ...offsets.map((o) => Math.abs(o)));
  const emphasised = points.filter((p) => p.emphasis);
  const lanes = laneLabels(
    emphasised.map((p) => ({ key: p.key, x: x(p.value), text: p.label })),
    width,
    Math.max(1, emphasised.length), // one lane per label at most: close labels stack instead of overlapping
  );
  const laneCount = lanes.length ? Math.max(...lanes.map((l) => l.lane)) + 1 : 0;
  const top = 4 + laneCount * LANE + (laneCount ? 6 : 0);
  const mid = top + spread + R + 2;
  // Reference captions get their own band under the dots (one row each), so no caption sits on a dot.
  const refCount = options.refs?.length ?? 0;
  const captionTop = mid + spread + R + 4;
  const axisY = captionTop + refCount * 14 + 4;
  const title = splitTitle(options.axisLabel, width - 2 * SIDE);
  const height = Math.ceil(axisY + 20 + title.length * 14);
  const placed: Placed[] = points.map((p, i) => ({ ...p, cx: x(p.value), cy: mid + offsets[i]! }));
  placed.sort((a, b) => Number(Boolean(a.emphasis)) - Number(Boolean(b.emphasis)));

  const svg = select(svgEl);
  svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
  const layer = (cls: string) =>
    svg
      .selectAll<SVGGElement, null>(`g.${cls}`)
      .data([null])
      .join((enter) => enter.append('g').attr('class', cls));

  // ── Axis: grid, ticks, title ────────────────────────────────────────────────────────────────────
  const axis = layer('sw-axis');
  axis
    .selectAll<SVGLineElement, number>('line.sw-grid')
    .data(options.ticks)
    .join('line')
    .attr('class', 'sw-grid')
    .attr('x1', (d) => x(d))
    .attr('x2', (d) => x(d))
    .attr('y1', top)
    .attr('y2', axisY);
  axis
    .selectAll<SVGTextElement, number>('text.sw-tick')
    .data(options.ticks)
    .join('text')
    .attr('class', 'sw-tick')
    .attr('x', (d) => x(d))
    .attr('y', axisY + 14)
    .attr('text-anchor', (d) => (x(d) < 24 ? 'start' : x(d) > width - 24 ? 'end' : 'middle'))
    .text((d) => options.format(d));
  axis
    .selectAll<SVGTextElement, string>('text.sw-title')
    .data(title)
    .join('text')
    .attr('class', 'sw-title')
    .attr('x', width - SIDE)
    .attr('y', (_, i) => axisY + 30 + i * 14)
    .attr('text-anchor', 'end')
    .text((d) => d);

  // ── Reference lines ─────────────────────────────────────────────────────────────────────────────
  const refs = layer('sw-refs')
    .selectAll<SVGGElement, SwarmRef>('g.sw-ref')
    .data(options.refs ?? [], (d) => d.label)
    .join((enter) => {
      const g = enter.append('g').attr('class', 'sw-ref');
      g.append('line');
      g.append('text');
      return g;
    });
  refs
    .select('line')
    .attr('x1', (d) => x(d.value))
    .attr('x2', (d) => x(d.value))
    .attr('y1', top)
    .attr('y2', axisY);
  refs
    .select('text')
    .attr('x', (d) => (x(d.value) > width - 140 ? x(d.value) - 4 : x(d.value) + 4))
    .attr('y', (_, i) => captionTop + (i + 1) * 14 - 3)
    .attr('text-anchor', (d) => (x(d.value) > width - 140 ? 'end' : 'start'))
    .text((d) => d.label);

  // ── Dots ────────────────────────────────────────────────────────────────────────────────────────
  const dots = layer('sw-dots')
    .selectAll<SVGCircleElement, Placed>('circle.sw-dot')
    .data(placed, (d) => d.key)
    .join(
      (enter) => enter.append('circle').attr('class', 'sw-dot').attr('cx', (d) => d.cx).attr('cy', (d) => d.cy).style('opacity', duration ? 0 : 1),
      (update) => update,
      (exit) => exit.remove(),
    )
    .order()
    .classed('is-emphasis', (d) => Boolean(d.emphasis))
    .attr('r', (d) => (d.emphasis ? R + 1.5 : R))
    .style('fill', (d) => d.color);
  if (duration) dots.transition().duration(duration).attr('cx', (d) => d.cx).attr('cy', (d) => d.cy).style('opacity', 1);
  else dots.attr('cx', (d) => d.cx).attr('cy', (d) => d.cy).style('opacity', 1);

  // ── Labels of emphasised dots, with leaders ────────────────────────────────────────────────────
  const byKey = new Map(placed.map((p) => [p.key, p]));
  const labels = layer('sw-labels')
    .selectAll<SVGGElement, Lane>('g.sw-label')
    .data(lanes, (d) => d.key)
    .join((enter) => {
      const g = enter.append('g').attr('class', 'sw-label');
      g.append('line');
      g.append('text');
      return g;
    });
  const laneY = (d: Lane): number => 4 + d.lane * LANE + 11;
  labels
    .select('line')
    .attr('x1', (d) => byKey.get(d.key)?.cx ?? d.x)
    .attr('x2', (d) => byKey.get(d.key)?.cx ?? d.x)
    .attr('y1', (d) => laneY(d) + 4)
    .attr('y2', (d) => (byKey.get(d.key)?.cy ?? mid) - R - 2);
  labels
    .select('text')
    .attr('x', (d) => d.x)
    .attr('y', laneY)
    .attr('text-anchor', 'middle')
    .text((d) => d.text);

  // ── Hover ───────────────────────────────────────────────────────────────────────────────────────
  const ring = layer('sw-hover')
    .selectAll<SVGCircleElement, null>('circle.sw-ring')
    .data([null])
    .join('circle')
    .attr('class', 'sw-ring')
    .attr('r', R + 5)
    .attr('display', 'none');
  const xs = placed.map((d) => d.cx);
  const ys = placed.map((d) => d.cy);
  const hide = (): void => {
    ring.attr('display', 'none');
    hideTip(tooltip);
  };
  const overlay = layer('sw-overlay')
    .selectAll<SVGRectElement, null>('rect.sw-hit')
    .data([null])
    .join('rect')
    .attr('class', 'sw-hit')
    .attr('x', 0)
    .attr('y', top)
    .attr('width', width)
    .attr('height', Math.max(0, axisY - top))
    .on('pointermove.sw pointerdown.sw', (event: PointerEvent) => {
      const [mx, my] = pointer(event, svgEl);
      const d = placed[nearestPoint(xs, ys, mx, my, SNAP)];
      if (!d) return hide();
      ring.attr('cx', d.cx).attr('cy', d.cy).attr('display', null);
      showTip(tooltip, svgEl, event, d.tooltip);
    })
    .on('pointerleave.sw', hide);

  return () => {
    svg.selectAll('*').interrupt();
    overlay.on('.sw', null);
    hide();
  };
}

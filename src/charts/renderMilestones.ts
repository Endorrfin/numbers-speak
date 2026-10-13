/*
 * renderMilestones.ts — pure D3 renderer for dated figures that companies published, on a UTC time axis and a log
 * value axis. CHANGED (S3-ai2): new (ai-models, angle D — user counts).
 *
 *   renderMilestones(svg, series, options) → cleanup
 *
 * A series is one product AND one metric: its points are joined by a line, points of different series never are. The
 * shape of a point names the metric (circle · square · triangle), so a weekly count never reads as a monthly one; the
 * series' name stands beside its last point (placeLabels keeps the names apart). An emphasised series wears the accent.
 *
 * Hover: the nearest point within 24 px (pointer only; the table view serves keyboards and screen readers).
 * Safety: text is written with `.text()` / `textContent` only. The whole SVG is redrawn per call (idempotent).
 */
import { pointer, scaleLog, scaleUtc, select } from 'd3';
import { nearestPoint, placeLabels } from './renderScatter';
import { hideTip, showTip } from './tooltip';
import type { TipContent } from './tooltip';

export type MilestoneShape = 'circle' | 'square' | 'triangle';
export type MilestonePoint = { key: string; t: number; v: number; tooltip: TipContent };
export type MilestoneSeries = { key: string; label: string; shape: MilestoneShape; emphasis?: boolean; points: readonly MilestonePoint[] };

export type MilestonesOptions = {
  width: number;
  tooltip: HTMLElement | null;
  /** UTC ms. */
  x: { domain: [number, number]; format: (t: number) => string };
  y: { domain: [number, number]; ticks: readonly number[]; format: (v: number) => string; label: string };
};

export type MilestonesLayout = { phone: boolean; left: number; right: number; top: number; bottom: number; height: number; r: number };

const SNAP = 24;

export function layoutMilestones(width: number): MilestonesLayout {
  const phone = width < 560;
  const height = phone ? 340 : 400;
  return { phone, left: phone ? 54 : 60, right: width - (phone ? 72 : 150), top: 28, bottom: height - 30, height, r: phone ? 4.5 : 5 };
}

/** SVG path of a mark centred on (x, y) with "radius" r: equal-area-ish circle, square and triangle. */
export function shapePath(shape: MilestoneShape, x: number, y: number, r: number): string {
  if (shape === 'square') {
    const h = r * 0.9;
    return `M${x - h},${y - h}H${x + h}V${y + h}H${x - h}Z`;
  }
  if (shape === 'triangle') {
    const h = r * 1.25;
    return `M${x},${y - h}L${x + h},${y + h * 0.8}L${x - h},${y + h * 0.8}Z`;
  }
  return `M${x - r},${y}A${r},${r} 0 1,0 ${x + r},${y}A${r},${r} 0 1,0 ${x - r},${y}Z`;
}

export function renderMilestones(svgEl: SVGSVGElement, series: readonly MilestoneSeries[], options: MilestonesOptions): () => void {
  const { width, tooltip } = options;
  const L = layoutMilestones(width);
  const svg = select(svgEl);
  svg.selectAll('*').remove();
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);
  const x = scaleUtc().domain(options.x.domain).range([L.left, L.right]);
  const y = scaleLog().domain(options.y.domain).range([L.bottom, L.top]).clamp(true);
  const xt = x.ticks(L.phone ? 3 : 6).map((d) => d.getTime());

  // ── Grid, ticks, title ────────────────────────────────────────────────────────────────────────────
  const grid = svg.append('g').attr('class', 'ms-grid');
  grid
    .selectAll('line.ms-gy')
    .data(options.y.ticks)
    .join('line')
    .attr('class', 'ms-gy')
    .attr('x1', L.left)
    .attr('x2', L.right)
    .attr('y1', (v) => y(v))
    .attr('y2', (v) => y(v));
  grid
    .selectAll('text.ms-ty')
    .data(options.y.ticks)
    .join('text')
    .attr('class', 'ms-tick ms-ty')
    .attr('x', L.left - 6)
    .attr('y', (v) => y(v))
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .text((v) => options.y.format(v));
  grid
    .selectAll('text.ms-tx')
    .data(xt)
    .join('text')
    .attr('class', 'ms-tick ms-tx')
    .attr('x', (t) => x(t))
    .attr('y', L.bottom + 18)
    .attr('text-anchor', 'middle')
    .text((t) => options.x.format(t));
  grid.append('text').attr('class', 'ms-title').attr('x', 0).attr('y', 12).text(options.y.label);

  // ── Lines (one per series), then points (emphasised last) ───────────────────────────────────────────
  const ordered = [...series].sort((a, b) => Number(Boolean(a.emphasis)) - Number(Boolean(b.emphasis)));
  const line = (s: MilestoneSeries): string => s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t)},${y(p.v)}`).join('');
  svg
    .append('g')
    .attr('class', 'ms-lines')
    .selectAll('path')
    .data(ordered.filter((s) => s.points.length > 1))
    .join('path')
    .attr('class', (s) => (s.emphasis ? 'ms-line is-emphasis' : 'ms-line'))
    .attr('d', line);
  const flat = ordered.flatMap((s) => s.points.map((p) => ({ s, p })));
  svg
    .append('g')
    .attr('class', 'ms-points')
    .selectAll('path')
    .data(flat)
    .join('path')
    .attr('class', ({ s }) => `ms-point is-${s.shape}${s.emphasis ? ' is-emphasis' : ''}`)
    .attr('d', ({ s, p }) => shapePath(s.shape, x(p.t), y(p.v), L.r));

  // ── Names beside the last point of each series ───────────────────────────────────────────────────
  const lastOf = ordered.map((s) => ({ s, p: s.points.at(-1)! })).filter((d) => d.p);
  const labels = placeLabels(
    lastOf.map(({ s, p }) => ({ key: s.key, cx: x(p.t), cy: y(p.v), text: s.label })),
    L.left,
    width - 4,
    L.r + 1,
  );
  const emphasised = new Set(series.filter((s) => s.emphasis).map((s) => s.key));
  svg
    .append('g')
    .attr('class', 'ms-labels')
    .selectAll('text')
    .data(labels)
    .join('text')
    .attr('class', (d) => (emphasised.has(d.key) ? 'ms-label is-emphasis' : 'ms-label'))
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d) => d.anchor)
    .text((d) => d.text);

  // ── Hover ─────────────────────────────────────────────────────────────────────────────────────────
  const xs = flat.map(({ p }) => x(p.t));
  const ys = flat.map(({ p }) => y(p.v));
  const ring = svg.append('circle').attr('class', 'ms-ring').attr('r', L.r + 5).attr('display', 'none');
  const hide = (): void => {
    ring.attr('display', 'none');
    hideTip(tooltip);
  };
  const hit = svg
    .append('rect')
    .attr('class', 'ms-hit')
    .attr('x', L.left - 8)
    .attr('y', L.top - 8)
    .attr('width', Math.max(0, L.right - L.left + 16))
    .attr('height', Math.max(0, L.bottom - L.top + 16))
    .on('pointermove.ms pointerdown.ms', (event: PointerEvent) => {
      const [mx, my] = pointer(event, svgEl);
      const i = nearestPoint(xs, ys, mx, my, SNAP);
      const d = flat[i];
      if (!d) return hide();
      ring.attr('cx', xs[i]!).attr('cy', ys[i]!).attr('display', null);
      showTip(tooltip, svgEl, event, d.p.tooltip);
    })
    .on('pointerleave.ms', hide);

  return () => {
    hit.on('.ms', null);
    hide();
  };
}

/*
 * renderLanes.ts — pure D3 renderer for a timeline of events on labelled lanes, with an overview strip and a brush.
 * CHANGED (S3-ai1): new (ai-models, angle A).
 *
 *   renderLanes(svg, lanes, points, options) → cleanup
 *
 * Top: one lane per row (label + sublabel on the left), one dot per event on a UTC time axis over the visible span;
 * dots of one lane that would overlap are dodged up and down inside the lane. Optional direct labels (for the points
 * that carry one) stand rotated above their dots in extra room the lane gets. Below: an overview of the whole span —
 * a tick per event, a row per lane — with a d3-brush. Dragging on the overview picks the visible span; the brush
 * reports it once, when the drag ends (`onBrush`); a click without a drag clears it (= the whole span). With the
 * whole span visible no selection is drawn: a selection as wide as the strip could only be moved, never drawn anew
 * (the mockup's v1 bug). The page owns the span and keeps it in the URL; selects are the keyboard path.
 *
 * Hover: the nearest dot within 18 px (pointer only; the table view serves keyboards and screen readers).
 * Safety: text is written with `.text()` / `textContent` only. The whole SVG is redrawn per call (idempotent).
 */
import { pointer, scaleUtc, select } from 'd3';
// CHANGED (S3-ai1): from its own package, not the `d3` umbrella — so the bundler keeps it in the page's chunk (vite.config.ts).
import { brushX } from 'd3-brush';
import type { BrushBehavior, D3BrushEvent } from 'd3-brush';
import { nearestPoint } from './renderScatter';
import { hideTip, showTip } from './tooltip';
import type { TipContent } from './tooltip';

export type LaneRow = { key: string; label: string; sublabel?: string; emphasis?: boolean };

export type LaneMark = 'open' | 'closed' | 'unknown';
export type LanePoint = {
  key: string;
  lane: string;
  /** UTC milliseconds. */
  t: number;
  /** open = filled dot; closed = ring; unknown = dashed ring. */
  mark: LaneMark;
  /** Direct label above the dot (the caller decides which points carry one). */
  label?: string;
  tooltip: TipContent;
};

export type LanesOptions = {
  width: number;
  tooltip: HTMLElement | null;
  /** The whole span (overview strip), UTC ms. */
  domain: [number, number];
  /** The visible span (lanes), UTC ms; equal to `domain` = nothing selected. */
  view: [number, number];
  /** Axis tick text; `fine` = the visible span is short enough for months. */
  formatTick: (t: number, fine: boolean) => string;
  /** The span the reader brushed, or null for "the whole span" (a click on the strip). */
  onBrush?: (span: [number, number] | null) => void;
};

export type LanesLayout = {
  phone: boolean;
  left: number;
  right: number;
  laneH: number;
  r: number;
  /** y of each lane's centre line. */
  laneY: number[];
  lanesTop: number;
  lanesBottom: number;
  ovTop: number;
  ovH: number;
  height: number;
};

const SNAP = 18;
/** Room above a lane whose points carry labels (rotated −40°). */
export const LABEL_ROOM = 86;
/** A visible span shorter than this many days gets month ticks. */
export const FINE_DAYS = 920;
const DAY = 86_400_000;

export function layoutLanes(width: number, lanes: readonly LaneRow[], labelled: ReadonlySet<string> = new Set()): LanesLayout {
  const phone = width < 560;
  const laneH = phone ? 30 : 34;
  const left = phone ? 78 : 132;
  const right = width - 12;
  let y = 8;
  const laneY: number[] = [];
  for (const lane of lanes) {
    if (labelled.has(lane.key)) y += LABEL_ROOM;
    laneY.push(y + laneH / 2);
    y += laneH;
  }
  const lanesBottom = y;
  const ovTop = lanesBottom + 26 + 16;
  const ovH = Math.max(28, lanes.length * 4 + 8);
  return { phone, left, right, laneH, r: phone ? 3 : 3.6, laneY, lanesTop: 8, lanesBottom, ovTop, ovH, height: ovTop + ovH + 22 };
}

/**
 * Vertical offsets that keep dots of one lane apart (exported for tests): in x order, each dot takes the first slot
 * (0, −1, +1, −2, +2… × step) whose centre is at least a step from every earlier dot nearby. The step is 1.25 r, so a
 * same-day group reads as a short stack of overlapping rings (a lane has room for five); past that it stays on the line.
 */
export function dodge(xs: readonly number[], r: number, maxOffset: number): number[] {
  const step = r * 1.25;
  const order = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const placed: Array<{ x: number; y: number }> = [];
  const out = new Array<number>(xs.length).fill(0);
  const slots: number[] = [0];
  for (let k = 1; k * step <= maxOffset; k++) slots.push(-k * step, k * step);
  let start = 0;
  for (const [x, i] of order) {
    while (start < placed.length && placed[start]!.x < x - 2 * r) start++;
    const near = placed.slice(start);
    const y = slots.find((s) => near.every((p) => Math.hypot(p.x - x, p.y - s) >= step - 0.01)) ?? 0;
    out[i] = y;
    placed.push({ x, y });
  }
  return out;
}

/** CHANGED (S3-ai2): a sublabel cut to `max` px at 10.5 px (exported for tests). */
export function fitSub(text: string, max: number): string {
  const n = Math.floor(max / (10.5 * 0.56));
  return text.length <= n ? text : `${text.slice(0, Math.max(1, n - 1)).trimEnd()}…`;
}

/** Labels whose dots are closer than this (px) share one label. */
export const LABEL_GAP = 9;

/**
 * Rotated labels of dots that stand (almost) on the same x would overprint each other (exported for tests): in x order,
 * a label within `gap` px of the previous kept one joins it — "GPT-4.1 nano +2" — and the tooltip and table name them all.
 */
export function mergeLabels(items: ReadonlyArray<{ i: number; x: number; text?: string }>, gap: number): Array<{ i: number; text: string }> {
  const out: Array<{ i: number; x: number; first: string; more: number }> = [];
  for (const it of [...items].filter((d) => d.text).sort((a, b) => a.x - b.x || a.i - b.i)) {
    const last = out.at(-1);
    if (last && it.x - last.x < gap) last.more++;
    else out.push({ i: it.i, x: it.x, first: it.text!, more: 0 });
  }
  return out.map((o) => ({ i: o.i, text: o.more ? `${o.first} +${o.more}` : o.first }));
}

export function renderLanes(
  svgEl: SVGSVGElement,
  lanes: readonly LaneRow[],
  points: readonly LanePoint[],
  options: LanesOptions,
): () => void {
  const { width, tooltip } = options;
  const visible = points.filter((p) => p.t >= options.view[0] && p.t < options.view[1]);
  const labelled = new Set(visible.filter((p) => p.label).map((p) => p.lane));
  const L = layoutLanes(width, lanes, labelled);
  const svg = select(svgEl);
  svg.selectAll('*').remove();
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);

  const laneIndex = new Map(lanes.map((l, i) => [l.key, i]));
  const x = scaleUtc().domain(options.view).range([L.left, L.right]);
  const fine = (options.view[1] - options.view[0]) / DAY < FINE_DAYS;
  const ticks = x.ticks(L.phone ? 4 : fine ? 8 : 10).map((d) => d.getTime());

  // ── Grid and axis of the lanes ────────────────────────────────────────────────────────────────────
  const grid = svg.append('g').attr('class', 'ln-grid');
  grid
    .selectAll('line')
    .data(ticks)
    .join('line')
    .attr('x1', (t) => x(t))
    .attr('x2', (t) => x(t))
    .attr('y1', L.lanesTop)
    .attr('y2', L.lanesBottom);
  grid
    .selectAll('text')
    .data(ticks)
    .join('text')
    .attr('class', 'ln-tick')
    .attr('x', (t) => x(t))
    .attr('y', L.lanesBottom + 16)
    .attr('text-anchor', 'middle')
    .text((t) => options.formatTick(t, fine));

  // ── Lanes ─────────────────────────────────────────────────────────────────────────────────────────
  const rows = svg
    .append('g')
    .attr('class', 'ln-lanes')
    .selectAll<SVGGElement, LaneRow>('g')
    .data(lanes, (d) => d.key)
    .join('g')
    .attr('class', (d) => (d.emphasis ? 'ln-lane is-emphasis' : 'ln-lane'));
  rows
    .append('line')
    .attr('class', 'ln-line')
    .attr('x1', L.left)
    .attr('x2', L.right)
    .attr('y1', (_, i) => L.laneY[i]!)
    .attr('y2', (_, i) => L.laneY[i]!);
  rows
    .append('text')
    .attr('class', 'ln-name')
    .attr('x', L.left - 10)
    .attr('y', (_, i) => L.laneY[i]! - (L.phone ? 0 : 6))
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .text((d) => d.label);
  if (!L.phone) {
    rows
      .filter((d) => Boolean(d.sublabel))
      .append('text')
      .attr('class', 'ln-sub')
      .attr('x', L.left - 10)
      .attr('y', (d) => L.laneY[laneIndex.get(d.key)!]! + 9)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      // CHANGED (S3-ai2): a sublabel wider than the label column ("Mistral · Mixtral · Magistral") was cut off at the SVG's
      // left edge — it is shortened with an ellipsis and keeps its full text in a <title>; shorter ones are unchanged.
      .text((d) => fitSub(d.sublabel ?? '', L.left - 14))
      .filter((d) => fitSub(d.sublabel ?? '', L.left - 14) !== d.sublabel)
      .append('title')
      .text((d) => d.sublabel ?? '');
  }

  // ── Dots (dodged inside their lane) ───────────────────────────────────────────────────────────────
  const cx = visible.map((p) => x(p.t));
  const cy = new Array<number>(visible.length).fill(0);
  for (const lane of lanes) {
    const idx = visible.map((p, i) => (p.lane === lane.key ? i : -1)).filter((i) => i >= 0);
    const offsets = dodge(
      idx.map((i) => cx[i]!),
      L.r,
      L.laneH / 2 - L.r - 1,
    );
    const base = L.laneY[laneIndex.get(lane.key)!]!;
    idx.forEach((i, k) => (cy[i] = base + offsets[k]!));
  }
  const emphasised = new Set(lanes.filter((l) => l.emphasis).map((l) => l.key));
  svg
    .append('g')
    .attr('class', 'ln-dots')
    .selectAll<SVGCircleElement, LanePoint>('circle')
    .data(visible, (d) => d.key)
    .join('circle')
    .attr('class', (d) => `ln-dot is-${d.mark}${emphasised.has(d.lane) ? ' is-emphasis' : ''}`)
    .attr('cx', (_, i) => cx[i]!)
    .attr('cy', (_, i) => cy[i]!)
    .attr('r', L.r);

  // ── Direct labels (rotated above the dots) ───────────────────────────────────────────────────────
  const labelled2 = mergeLabels(visible.map((p, i) => ({ i, x: cx[i]!, text: p.label })), LABEL_GAP).map((m) => ({ i: m.i, text: m.text }));
  svg
    .append('g')
    .attr('class', 'ln-labels')
    .selectAll('text')
    .data(labelled2)
    .join('text')
    .attr('class', 'ln-label')
    .attr('transform', ({ i }) => `translate(${cx[i]! + 2},${cy[i]! - L.r - 3}) rotate(-40)`)
    .text(({ text }) => text);

  // ── Hover ─────────────────────────────────────────────────────────────────────────────────────────
  const ring = svg.append('circle').attr('class', 'ln-ring').attr('r', L.r + 4).attr('display', 'none');
  const hide = (): void => {
    ring.attr('display', 'none');
    hideTip(tooltip);
  };
  const hit = svg
    .append('rect')
    .attr('class', 'ln-hit')
    .attr('x', L.left - 6)
    .attr('y', L.lanesTop)
    .attr('width', Math.max(0, L.right - L.left + 12))
    .attr('height', Math.max(0, L.lanesBottom - L.lanesTop))
    .on('pointermove.ln pointerdown.ln', (event: PointerEvent) => {
      const [mx, my] = pointer(event, svgEl);
      const i = nearestPoint(cx, cy, mx, my, SNAP);
      const d = visible[i];
      if (!d) return hide();
      ring.attr('cx', cx[i]!).attr('cy', cy[i]!).attr('display', null);
      showTip(tooltip, svgEl, event, d.tooltip);
    })
    .on('pointerleave.ln', hide);

  // ── Overview of the whole span + brush ───────────────────────────────────────────────────────────
  const ox = scaleUtc().domain(options.domain).range([L.left, L.right]);
  const ov = svg.append('g').attr('class', 'ln-overview');
  ov.append('rect').attr('class', 'ln-ov-bg').attr('x', L.left).attr('y', L.ovTop).attr('width', Math.max(0, L.right - L.left)).attr('height', L.ovH);
  ov.append('g')
    .selectAll('line')
    .data(points)
    .join('line')
    .attr('class', (d) => (emphasised.has(d.lane) ? 'ln-ov-tick is-emphasis' : 'ln-ov-tick'))
    .attr('x1', (d) => ox(d.t))
    .attr('x2', (d) => ox(d.t))
    .attr('y1', (d) => L.ovTop + 4 + laneIndex.get(d.lane)! * 4)
    .attr('y2', (d) => L.ovTop + 7 + laneIndex.get(d.lane)! * 4);
  const oticks = ox.ticks(L.phone ? 4 : 10).map((d) => d.getTime());
  ov.append('g')
    .selectAll('text')
    .data(oticks)
    .join('text')
    .attr('class', 'ln-tick')
    .attr('x', (t) => ox(t))
    .attr('y', L.ovTop + L.ovH + 15)
    .attr('text-anchor', 'middle')
    .text((t) => options.formatTick(t, false));

  let brush: BrushBehavior<unknown> | null = null;
  const bg = ov.append('g').attr('class', 'ln-brush');
  if (options.onBrush) {
    const onBrush = options.onBrush;
    brush = brushX()
      .extent([
        [L.left, L.ovTop],
        [L.right, L.ovTop + L.ovH],
      ])
      .on('end.ln', (event: D3BrushEvent<unknown>) => {
        if (!event.sourceEvent) return; // a programmatic move (below)
        const s = event.selection as [number, number] | null;
        onBrush(s ? [ox.invert(s[0]).getTime(), ox.invert(s[1]).getTime()] : null);
      });
    bg.call(brush);
    const full = options.view[0] <= options.domain[0] && options.view[1] >= options.domain[1];
    if (!full) bg.call(brush.move, [ox(options.view[0]), ox(options.view[1])]);
  }

  return () => {
    svg.selectAll('*').interrupt();
    hit.on('.ln', null);
    if (brush) brush.on('.ln', null);
    bg.on('.brush', null);
    hide();
  };
}

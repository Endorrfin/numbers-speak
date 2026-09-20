/*
 * renderStrip.ts — pure D3 renderer for one 100 % strip: a whole (a day, a lifetime) cut into parts.
 * CHANGED (S3-tl): new.
 *
 *   renderStrip(svg, segments, options) → cleanup
 *
 * Segments are joined by `key`, so switching the country or sex slides the cuts instead of redrawing.
 * A 2 px surface gap separates neighbours; a same-colour neighbour gets `alt` (lighter tone). Names and
 * values sit BELOW the strip in text ink (text never wears a data colour) and only where they fit —
 * the legend, the tooltip and the table name every segment.
 *
 * Safety: text is written with `.text()` / `textContent` only. Motion: `reducedMotion` → no transitions.
 */
import { scaleLinear, select } from 'd3';
import { ALT_OPACITY } from './renderWaffle';
import { hideTip, showTip } from './tooltip';
import type { TipContent } from './tooltip';

export type StripSegment = {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  color: string;
  alt?: boolean;
  tooltip: TipContent;
};

export type StripOptions = {
  width: number;
  reducedMotion: boolean;
  /** Axis under the strip in the segments' unit (e.g. hours 0…24); omit for none. */
  ticks?: { values: number[]; format: (v: number) => string };
  /** Strip height; default 44 (36 on phones). */
  barHeight?: number;
  tooltip: HTMLElement | null;
};

export type StripLayout = { barHeight: number; labelTop: number; height: number; axisTop: number };

const FONT = 12;
const CHAR = 0.58; // average glyph width / font size for Inter — an estimate, so jsdom needs no layout
const GAP = 2;
const DURATION = 400;

const textWidth = (s: string, font = FONT): number => Math.ceil(s.length * font * CHAR);

export function layoutStrip(width: number, hasTicks: boolean, barHeight?: number): StripLayout {
  const bh = barHeight ?? (width < 560 ? 36 : 44);
  const axisTop = bh + 4;
  const labelTop = axisTop + (hasTicks ? 22 : 6);
  return { barHeight: bh, axisTop, labelTop, height: labelTop + 36 };
}

type Placed = StripSegment & { x0: number; x1: number; showLabel: boolean };

/** Where each segment starts/ends and whether its label fits (exported for tests). */
export function placeSegments(segments: readonly StripSegment[], width: number): Placed[] {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const x = scaleLinear().domain([0, total]).range([0, width]);
  let acc = 0;
  let freeFrom = 0; // labels never overlap: the next label starts after the previous one ends
  return segments.map((d) => {
    const x0 = x(acc);
    acc += d.value;
    const x1 = x(acc);
    const need = Math.max(textWidth(d.label), textWidth(d.valueLabel)) + 6;
    const showLabel = x0 >= freeFrom && x0 + need <= width && x1 - x0 >= Math.min(need, 28);
    if (showLabel) freeFrom = x0 + need;
    return { ...d, x0, x1, showLabel };
  });
}

export function renderStrip(svgEl: SVGSVGElement, segments: readonly StripSegment[], options: StripOptions): () => void {
  const { width, reducedMotion, tooltip, ticks } = options;
  const L = layoutStrip(width, Boolean(ticks), options.barHeight);
  const placed = placeSegments(segments, width);
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const svg = select(svgEl);
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);
  const duration = reducedMotion ? 0 : DURATION;
  const w = (d: Placed): number => Math.max(0, d.x1 - d.x0 - GAP);

  const segs = svg
    .selectAll<SVGGElement, Placed>('g.st-seg')
    .data(placed, (d) => d.key)
    .join((enter) => {
      const g = enter.append('g').attr('class', 'st-seg');
      g.append('rect').attr('class', 'st-bar').attr('x', (d) => d.x0).attr('width', 0);
      g.append('text').attr('class', 'st-name');
      g.append('text').attr('class', 'st-value');
      return g;
    })
    .attr('data-key', (d) => d.key);

  const bars = segs
    .select<SVGRectElement>('.st-bar')
    .attr('y', 0)
    .attr('height', L.barHeight)
    .attr('rx', 3)
    .style('fill', (d) => d.color)
    .style('fill-opacity', (d) => (d.alt ? ALT_OPACITY : 1));
  if (duration) bars.transition().duration(duration).attr('x', (d) => d.x0).attr('width', w);
  else bars.attr('x', (d) => d.x0).attr('width', w);

  segs
    .select<SVGTextElement>('.st-name')
    .attr('x', (d) => d.x0)
    .attr('y', L.labelTop)
    .attr('dy', '0.7em')
    .text((d) => (d.showLabel ? d.label : ''));
  segs
    .select<SVGTextElement>('.st-value')
    .attr('x', (d) => d.x0)
    .attr('y', L.labelTop + 16)
    .attr('dy', '0.7em')
    .text((d) => (d.showLabel ? d.valueLabel : ''));

  // Optional axis in the segments' unit (hours of a day).
  const tickData = ticks ? ticks.values : [];
  const x = scaleLinear().domain([0, total]).range([0, width]);
  svg
    .selectAll<SVGTextElement, number>('text.st-tick')
    .data(tickData, (d) => String(d))
    .join('text')
    .attr('class', 'st-tick')
    .attr('x', (d) => Math.min(width - 2, Math.max(2, x(d))))
    .attr('y', L.axisTop + 4)
    .attr('dy', '0.7em')
    .attr('text-anchor', (d) => (x(d) <= 2 ? 'start' : x(d) >= width - 2 ? 'end' : 'middle'))
    .text((d) => ticks?.format(d) ?? '');

  // ── Hover ─────────────────────────────────────────────────────────────────────────────────────
  const hide = (): void => {
    hideTip(tooltip);
    svg.classed('is-hover', false);
    segs.classed('is-on', false);
  };
  segs
    .on('pointerenter.st pointermove.st pointerdown.st', function (event: PointerEvent, d) {
      svg.classed('is-hover', true);
      segs.classed('is-on', false);
      select(this).classed('is-on', true);
      showTip(tooltip, svgEl, event, d.tooltip);
    })
    .on('pointerleave.st', hide);

  return () => {
    svg.selectAll('*').interrupt();
    segs.on('.st', null);
    hide();
  };
}

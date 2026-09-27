/*
 * renderDumbbell.ts — pure D3 renderer for ranked dumbbell rows: two values per entity on one shared axis, joined
 * by a line (e.g. a flat outside the centre ○ and in the centre ●). CHANGED (S3-re): new.
 *
 *   renderDumbbell(svg, rows, options) → cleanup
 *
 * The two ends differ by shape — hollow ring for `from`, filled dot for `to` — so identity is never colour alone
 * (the colour is the entity's group, as in the other charts of the page). The axis is fixed by the caller (paging
 * never rescales it) and may be logarithmic, so the length of a segment reads as a ratio. Rows mirror RankedBar:
 * label (and flag) left of the plot on wide screens, above it on phones; emphasised rows get the accent band.
 *
 * Safety: text is written with `.text()` / `textContent` only. Motion: `reducedMotion` → no transitions.
 */
import { scaleLinear, scaleLog, select } from 'd3';
import type { ScaleContinuousNumeric } from 'd3';
import { hideTip, showTip } from './tooltip';
import type { TipContent } from './tooltip';

export type DumbbellRow = {
  key: string;
  /** "12  Osaka". */
  label: string;
  /** Hollow end (e.g. outside the centre). */
  from: number;
  /** Filled end (e.g. the city centre). */
  to: number;
  color: string;
  /** Text right of the row, e.g. "3.2×". */
  valueLabel: string;
  imageUrl?: string;
  emphasis?: boolean;
  tooltip: TipContent;
};

export type DumbbellOptions = {
  width: number;
  reducedMotion: boolean;
  tooltip: HTMLElement | null;
  log: boolean;
  domain: [number, number];
  ticks: number[];
  format: (value: number) => string;
  /** Below this width labels move above the rows (phones). Default 560. */
  stackBelow?: number;
};

export type DumbbellLayout = { stacked: boolean; rowHeight: number; top: number; labelWidth: number; plotX: number; plotW: number; height: number };

const FLAG_W = 20;
const FLAG_H = 15;
const VALUE_W = 52;
const R = 5;
const DURATION = 400;

export function layoutDumbbell(count: number, width: number, stackBelow = 560): DumbbellLayout {
  const stacked = width < stackBelow;
  const rowHeight = stacked ? 44 : 30;
  const labelWidth = stacked ? 0 : Math.min(Math.round(width * 0.3), 200);
  const plotX = stacked ? R + 2 : labelWidth + 6 + FLAG_W + 12;
  const plotW = Math.max(40, width - plotX - VALUE_W - 4);
  const top = 22;
  return { stacked, rowHeight, top, labelWidth, plotX, plotW, height: top + count * rowHeight + 4 };
}

export function renderDumbbell(svgEl: SVGSVGElement, rows: readonly DumbbellRow[], options: DumbbellOptions): () => void {
  const { width, reducedMotion, tooltip } = options;
  const L = layoutDumbbell(rows.length, width, options.stackBelow);
  const duration = reducedMotion ? 0 : DURATION;
  const scale: ScaleContinuousNumeric<number, number> = options.log ? scaleLog() : scaleLinear();
  const x = scale.domain(options.domain).range([L.plotX, L.plotX + L.plotW]).clamp(true);
  const svg = select(svgEl);
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);
  const layer = (cls: string) =>
    svg
      .selectAll<SVGGElement, null>(`g.${cls}`)
      .data([null])
      .join((enter) => enter.append('g').attr('class', cls));

  // ── Axis on top + grid ──────────────────────────────────────────────────────────────────────────
  const axis = layer('db-axis');
  axis
    .selectAll<SVGLineElement, number>('line.db-grid')
    .data(options.ticks)
    .join('line')
    .attr('class', 'db-grid')
    .attr('x1', (d) => x(d))
    .attr('x2', (d) => x(d))
    .attr('y1', L.top - 4)
    .attr('y2', L.height - 4);
  axis
    .selectAll<SVGTextElement, number>('text.db-tick')
    .data(options.ticks)
    .join('text')
    .attr('class', 'db-tick')
    .attr('x', (d) => x(d))
    .attr('y', 12)
    .attr('text-anchor', 'middle')
    .text((d) => options.format(d));

  // ── Rows ────────────────────────────────────────────────────────────────────────────────────────
  const yOf = (i: number): number => L.top + i * L.rowHeight;
  const lineY = L.stacked ? 30 : L.rowHeight / 2;
  const rowSel = layer('db-rows')
    .selectAll<SVGGElement, DumbbellRow>('g.db-row')
    .data(rows, (d) => d.key)
    .join(
      (enter) => {
        const g = enter
          .append('g')
          .attr('class', 'db-row')
          .attr('transform', (_, i) => `translate(0,${yOf(i)})`)
          .style('opacity', duration ? 0 : 1);
        g.append('rect').attr('class', 'db-hit');
        g.append('image').attr('class', 'db-flag');
        g.append('text').attr('class', 'db-label');
        g.append('line').attr('class', 'db-line');
        g.append('circle').attr('class', 'db-from');
        g.append('circle').attr('class', 'db-to');
        g.append('text').attr('class', 'db-value');
        return g;
      },
      (update) => update,
      (exit) => {
        exit.on('.db', null);
        return exit.remove();
      },
    )
    .classed('is-emphasis', (d) => Boolean(d.emphasis));
  const rowY = (_: DumbbellRow, i: number): string => `translate(0,${yOf(i)})`;
  if (duration) rowSel.transition().duration(duration).attr('transform', rowY).style('opacity', 1);
  else rowSel.attr('transform', rowY).style('opacity', 1);

  rowSel.select('.db-hit').attr('x', 0).attr('y', 0).attr('width', width).attr('height', L.rowHeight);
  rowSel
    .select('.db-flag')
    .attr('href', (d) => d.imageUrl ?? null)
    .attr('display', (d) => (d.imageUrl ? null : 'none'))
    .attr('width', FLAG_W)
    .attr('height', FLAG_H)
    .attr('x', L.stacked ? 0 : L.labelWidth + 6)
    .attr('y', L.stacked ? 2 : (L.rowHeight - FLAG_H) / 2)
    .attr('preserveAspectRatio', 'xMidYMid slice');
  rowSel
    .select('.db-label')
    .attr('x', L.stacked ? FLAG_W + 6 : L.labelWidth)
    .attr('y', L.stacked ? 10 : L.rowHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', L.stacked ? 'start' : 'end')
    .text((d) => d.label);

  const lo = (d: DumbbellRow): number => x(Math.min(d.from, d.to));
  const hi = (d: DumbbellRow): number => x(Math.max(d.from, d.to));
  const line = rowSel.select<SVGLineElement>('.db-line').attr('y1', lineY).attr('y2', lineY);
  const from = rowSel.select<SVGCircleElement>('.db-from').attr('cy', lineY).attr('r', R).style('stroke', (d) => d.color);
  const to = rowSel.select<SVGCircleElement>('.db-to').attr('cy', lineY).attr('r', R).style('fill', (d) => d.color);
  const value = rowSel
    .select<SVGTextElement>('.db-value')
    .attr('y', lineY)
    .attr('dy', '0.35em')
    .text((d) => d.valueLabel);
  if (duration) {
    line.transition().duration(duration).attr('x1', lo).attr('x2', hi);
    from.transition().duration(duration).attr('cx', (d) => x(d.from));
    to.transition().duration(duration).attr('cx', (d) => x(d.to));
    value.transition().duration(duration).attr('x', (d) => hi(d) + R + 6);
  } else {
    line.attr('x1', lo).attr('x2', hi);
    from.attr('cx', (d) => x(d.from));
    to.attr('cx', (d) => x(d.to));
    value.attr('x', (d) => hi(d) + R + 6);
  }

  // ── Tooltip ─────────────────────────────────────────────────────────────────────────────────────
  const hide = (): void => {
    rowSel.classed('is-hover', false);
    hideTip(tooltip);
  };
  // The whole row listens (label, line and dots included), so the tooltip never depends on what is under the pointer.
  rowSel
    .on('pointerenter.db pointermove.db pointerdown.db', function (event: PointerEvent, d) {
      rowSel.classed('is-hover', false);
      select(this).classed('is-hover', true);
      showTip(tooltip, svgEl, event, d.tooltip);
    })
    .on('pointerleave.db', hide);

  return () => {
    svg.selectAll('*').interrupt();
    rowSel.on('.db', null);
    hide();
  };
}

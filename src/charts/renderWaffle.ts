/*
 * renderWaffle.ts — pure D3 renderer for a unit grid ("life in weeks"). CHANGED (S3-tl): new.
 *
 *   renderWaffle(svg, blocks, options) → cleanup
 *
 * Every block is `count` consecutive cells, filled left→right, top→bottom, so one row is one year
 * (52 weeks) and a block reads as "if you did this in one go". Cells are joined by index: switching the
 * country or sex recolours the same squares instead of redrawing them.
 * Two neighbouring blocks of the same colour are told apart by `alt` (a lighter tone) plus a 1 px gap,
 * and by name in the legend, the tooltip and the table — identity is never colour alone.
 *
 * Safety: text is written with `.text()` / `textContent` only. Motion: `reducedMotion` → no transitions.
 */
import { select } from 'd3';
import { hideTip, showTip } from './tooltip';
import type { TipContent } from './tooltip';

export type WaffleBlock = {
  key: string;
  count: number;
  /** Any CSS colour, typically `var(--c-life-…)`. */
  color: string;
  /** Lighter tone for a block that follows a block of the same colour. */
  alt?: boolean;
  /** Direct label beside the grid (wide screens), e.g. "Sleep 17.6 years". */
  label?: string;
  tooltip: TipContent;
};

export type WaffleOptions = {
  width: number;
  reducedMotion: boolean;
  /** Cells per row (52 weeks). */
  columns: number;
  /** Row label (e.g. the age) or null for no label. */
  rowLabel: (row: number) => string | null;
  /** Column ticks along the top, 0-based column → text. */
  columnTicks: ReadonlyArray<[number, string]>;
  tooltip: HTMLElement | null;
};

export type WaffleLayout = {
  cell: number;
  gap: number;
  left: number;
  top: number;
  rows: number;
  height: number;
  /** Width reserved right of the grid for direct labels (0 = legend only, phones). */
  labelSpace: number;
};

const LABEL_W = 30;
const DIRECT_LABELS = 190; // px right of the grid, reserved when the container is wide enough
const LABEL_STEP = 15; // min vertical distance between two direct labels
const TOP = 18;
const DURATION = 350;
export const ALT_OPACITY = 0.6;

export function layoutWaffle(total: number, width: number, columns: number, labels = false): WaffleLayout {
  const rows = Math.ceil(total / columns);
  const labelSpace = labels && width >= 640 ? DIRECT_LABELS : 0;
  const pitch = Math.max(4, Math.min(16, Math.floor((width - LABEL_W - labelSpace) / columns)));
  const gap = pitch >= 9 ? 2 : 1;
  return { cell: pitch - gap, gap, left: LABEL_W, top: TOP, rows, height: TOP + rows * pitch + 4, labelSpace };
}

/** y of each block's direct label: at the block's middle row, pushed down so labels never overlap. */
export function placeLabels(blocks: readonly WaffleBlock[], columns: number, L: WaffleLayout): Array<{ key: string; y: number; anchorY: number; text: string }> {
  const pitch = L.cell + L.gap;
  const out: Array<{ key: string; y: number; anchorY: number; text: string }> = [];
  let start = 0;
  let next = L.top + L.cell / 2;
  for (const b of blocks) {
    const mid = (start + b.count / 2) / columns; // rows from the top, fractional
    start += b.count;
    if (!b.label || b.count === 0) continue;
    const anchorY = L.top + Math.min(L.rows - 1, Math.floor(mid)) * pitch + L.cell / 2;
    const y = Math.max(anchorY, next);
    if (y > L.height - 4) continue; // no room left: the legend and tooltip still name it
    out.push({ key: b.key, y, anchorY, text: b.label });
    next = y + LABEL_STEP;
  }
  return out;
}

type Cell = { i: number; block: WaffleBlock };

export function renderWaffle(svgEl: SVGSVGElement, blocks: readonly WaffleBlock[], options: WaffleOptions): () => void {
  const { width, reducedMotion, columns, tooltip } = options;
  const cells: Cell[] = [];
  for (const block of blocks) for (let k = 0; k < block.count; k++) cells.push({ i: cells.length, block });
  const L = layoutWaffle(cells.length, width, columns, blocks.some((b) => b.label));
  const pitch = L.cell + L.gap;
  const svg = select(svgEl);
  const gridRight = L.left + columns * pitch;
  const gridWidth = gridRight + L.labelSpace;
  svg.attr('width', gridWidth).attr('height', L.height).attr('viewBox', `0 0 ${gridWidth} ${L.height}`);
  const duration = reducedMotion ? 0 : DURATION;

  // Row labels (ages) and column ticks — recessive axis text.
  svg
    .selectAll<SVGTextElement, number>('text.wf-row')
    .data(
      Array.from({ length: L.rows }, (_, r) => r).filter((r) => options.rowLabel(r) !== null),
      (d) => String(d),
    )
    .join('text')
    .attr('class', 'wf-row wf-axis')
    .attr('x', L.left - 6)
    .attr('y', (r) => L.top + r * pitch + L.cell / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .text((r) => options.rowLabel(r) ?? '');
  svg
    .selectAll<SVGTextElement, [number, string]>('text.wf-col')
    .data(options.columnTicks, (d) => String(d[0]))
    .join('text')
    .attr('class', 'wf-col wf-axis')
    .attr('x', (d) => L.left + d[0] * pitch + L.cell / 2)
    .attr('y', L.top - 6)
    .attr('text-anchor', 'middle')
    .text((d) => d[1]);

  const grid = svg
    .selectAll<SVGGElement, null>('g.wf-grid')
    .data([null])
    .join('g')
    .attr('class', 'wf-grid');
  const rects = grid
    .selectAll<SVGRectElement, Cell>('rect.wf-cell')
    .data(cells, (d) => String(d.i))
    .join((enter) => enter.append('rect').attr('class', 'wf-cell').style('fill', (d) => d.block.color))
    .attr('x', (d) => L.left + (d.i % columns) * pitch)
    .attr('y', (d) => L.top + Math.floor(d.i / columns) * pitch)
    .attr('width', L.cell)
    .attr('height', L.cell)
    .attr('rx', L.cell >= 8 ? 1.5 : 0.5)
    .attr('data-key', (d) => d.block.key);
  const fill = (d: Cell): string => d.block.color;
  const opacity = (d: Cell): number => (d.block.alt ? ALT_OPACITY : 1);
  if (duration) {
    rects
      .transition()
      .duration(duration)
      .delay((d) => Math.floor(d.i / columns) * 6) // a wave down the years
      .style('fill', fill)
      .style('fill-opacity', opacity);
  } else {
    rects.style('fill', fill).style('fill-opacity', opacity);
  }

  // Direct labels (wide screens): a short leader from the grid edge to the text.
  const labels = L.labelSpace ? placeLabels(blocks, columns, L) : [];
  const lab = svg
    .selectAll<SVGGElement, (typeof labels)[number]>('g.wf-label')
    .data(labels, (d) => d.key)
    .join((enter) => {
      const g = enter.append('g').attr('class', 'wf-label');
      g.append('path').attr('class', 'wf-leader');
      g.append('text').attr('class', 'wf-label-text');
      return g;
    });
  lab.select('.wf-leader').attr('d', (d) => `M${gridRight + 2},${d.anchorY}L${gridRight + 8},${d.y}H${gridRight + 12}`);
  lab
    .select('.wf-label-text')
    .attr('x', gridRight + 16)
    .attr('y', (d) => d.y)
    .attr('dy', '0.35em')
    .text((d) => d.text);

  // ── Hover: the whole block lights up, the rest recedes ────────────────────────────────────────
  const hide = (): void => {
    hideTip(tooltip);
    grid.classed('is-hover', false);
    rects.classed('is-on', false);
  };
  grid
    .on('pointermove.wf pointerdown.wf', (event: PointerEvent) => {
      const target = event.target as Element | null;
      const d = target && target.classList?.contains('wf-cell') ? (select(target).datum() as Cell) : null;
      if (!d) return hide();
      grid.classed('is-hover', true);
      rects.classed('is-on', (c) => c.block.key === d.block.key);
      showTip(tooltip, svgEl, event, d.block.tooltip);
    })
    .on('pointerleave.wf', hide);

  return () => {
    svg.selectAll('*').interrupt();
    grid.on('.wf', null);
    hide();
  };
}

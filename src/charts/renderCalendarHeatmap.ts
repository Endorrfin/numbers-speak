/*
 * renderCalendarHeatmap.ts — pure D3 renderer for a GitHub-style day-intensity calendar: one grid per
 * calendar year (Monday-start weeks as columns, weekdays as rows), each cell coloured by a quantized
 * sequential level. CHANGED (S3-aa3): new.
 *
 *   renderCalendarHeatmap(svg, spec, options) → cleanup
 *
 * Grids stack vertically, each with a year label and month labels above the week where that month starts.
 * A day outside its calendar year (the padding before 1 Jan needed to align Monday-start weeks) is not
 * drawn. Level 0 = no data / zero, drawn in a recessive neutral; levels 1..N follow a validated one-hue
 * sequential ramp (dataviz skill, --ordinal check — not the categorical six, which does not apply to a
 * magnitude ramp). True geometric gaps separate cells; no border fakes the gap (the S3-cd/marks standard).
 * A "Fewer → More" scale legend names the encoding, since colour is the chart's only channel.
 *
 * React owns the <svg> element and calls this from useEffect; D3 owns everything inside it. Idempotent:
 * every call redraws the frame from the spec; the plot fades in unless `reducedMotion`.
 * Accessibility: role="img" + label from the caller; the tooltip is pointer-only and text-only — the table
 * view is the keyboard and screen-reader path. Safety: every string is written with `.text()` /
 * `textContent` — never `.html()`.
 */
import { select } from 'd3';
import type { YearTooltip } from './renderYearChart';

const DAY = 86_400_000;
const toDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export type ChCell = { date: string; col: number; row: number; value: number; level: number };
export type ChMonthLabel = { col: number; label: string };
export type ChGrid = { year: number; label: string; cols: number; cells: readonly ChCell[]; months: readonly ChMonthLabel[] };
export type ChSpec = {
  grids: readonly ChGrid[];
  /** index 0 = no data, 1..N = intensity, light → dark (the caller resolves theme-aware CSS vars). */
  levelColors: readonly string[];
  scaleLabel: { less: string; more: string };
  tooltip: (cell: ChCell) => YearTooltip;
};
export type ChOptions = { width: number; reducedMotion: boolean; tooltip: HTMLElement | null };
export type ChLayout = { cell: number; gap: number; left: number; top: number; gridHeight: number; gridsBottom: number; height: number };

const ROWS = 7; // Monday..Sunday
const MAX_CELL = 13;
const MONTH_LABEL_H = 32; // year-label line + month-label line above each grid
const GRID_GAP = 22; // between stacked year grids
const LEGEND_H = 22;

/**
 * One calendar year's cells, Monday-start weeks as columns (the same convention `bucketStart` uses
 * elsewhere in this app). `valueOf`/`levelOf` fill in each day's value and quantized level.
 */
export function calendarYearCells(
  year: number,
  valueOf: (date: string) => number,
  levelOf: (value: number) => number,
): { cells: ChCell[]; cols: number } {
  const jan1 = Date.UTC(year, 0, 1);
  const jan1Dow = (new Date(jan1).getUTCDay() + 6) % 7; // Monday = 0
  const gridStart = jan1 - jan1Dow * DAY;
  const dec31 = Date.UTC(year, 11, 31);
  const cells: ChCell[] = [];
  let col = 0;
  let row = 0;
  for (let ms = gridStart; ms <= dec31; ms += DAY) {
    if (new Date(ms).getUTCFullYear() === year) {
      const date = toDate(ms);
      const value = valueOf(date);
      cells.push({ date, col, row, value, level: levelOf(value) });
    }
    row++;
    if (row === ROWS) {
      row = 0;
      col++;
    }
  }
  return { cells, cols: col + (row > 0 ? 1 : 0) };
}

/**
 * Quantile buckets over the positive values in scope: 0 for a non-positive value, 1..`steps` by quantile
 * of the positive values (not of the fixed range), so a handful of extreme days don't wash out the rest.
 * Pure and monotone: a larger value never gets a lower level.
 */
export function quantizeLevels(values: readonly number[], steps: number): (v: number) => number {
  const positives = [...values].filter((v) => v > 0).sort((a, b) => a - b);
  if (positives.length === 0) return () => 0;
  const breaks: number[] = [];
  for (let i = 1; i < steps; i++) breaks.push(positives[Math.min(positives.length - 1, Math.floor((i * positives.length) / steps))]!);
  return (v: number): number => {
    if (v <= 0) return 0;
    let level = 1;
    for (const b of breaks) if (v > b) level++;
    return Math.min(steps, level);
  };
}

export function layoutCalendarHeatmap(spec: ChSpec, width: number): ChLayout {
  const maxCols = Math.max(1, ...spec.grids.map((g) => g.cols));
  const left = 8;
  const avail = Math.max(0, width - left - 4);
  const perCol = Math.max(2, Math.floor(avail / maxCols));
  const gap = perCol >= 10 ? 2 : perCol >= 6 ? 1 : 0;
  const cell = Math.max(2, Math.min(MAX_CELL, perCol - gap));
  const gridHeight = MONTH_LABEL_H + ROWS * (cell + gap);
  const gridsBottom = spec.grids.length * gridHeight + Math.max(0, spec.grids.length - 1) * GRID_GAP;
  return { cell, gap, left, top: MONTH_LABEL_H, gridHeight, gridsBottom, height: gridsBottom + LEGEND_H };
}

export function renderCalendarHeatmap(svgEl: SVGSVGElement, spec: ChSpec, options: ChOptions): () => void {
  const { width, reducedMotion, tooltip } = options;
  const L = layoutCalendarHeatmap(spec, width);
  const svg = select(svgEl);
  svg.interrupt();
  svg.selectAll('*').remove();
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);
  if (spec.grids.length === 0) return () => {};

  const root = svg.append('g').attr('class', 'ch-root');
  const step = L.cell + L.gap;

  spec.grids.forEach((grid, gi) => {
    const gTop = gi * (L.gridHeight + GRID_GAP);
    const g = root.append('g').attr('class', 'ch-grid').attr('transform', `translate(${L.left},${gTop})`);

    g.append('text').attr('class', 'ch-year-label').attr('x', 0).attr('y', L.top - 20).text(grid.label);
    for (const m of grid.months) {
      g.append('text').attr('class', 'ch-month-label').attr('x', m.col * step).attr('y', L.top - 5).text(m.label);
    }

    const cells = g
      .append('g')
      .attr('class', 'ch-cells')
      .selectAll<SVGRectElement, ChCell>('rect')
      .data(grid.cells, (d) => d.date)
      .join('rect')
      .attr('class', 'ch-cell')
      .attr('x', (d) => d.col * step)
      .attr('y', (d) => L.top + d.row * step)
      .attr('width', L.cell)
      .attr('height', L.cell)
      .attr('rx', Math.min(2, L.cell / 4))
      .style('fill', (d) => spec.levelColors[d.level] ?? spec.levelColors[0]!);

    const hide = (): void => {
      cells.classed('is-hover', false);
      if (tooltip) tooltip.hidden = true;
    };
    cells.on('pointerenter.ch pointermove.ch', function (event: PointerEvent, d) {
      cells.classed('is-hover', (c) => c.date === d.date);
      if (!tooltip) return;
      const content = spec.tooltip(d);
      const title = document.createElement('strong');
      title.textContent = content.title;
      const lines = content.lines.map((l) => {
        const row = document.createElement('div');
        row.className = 'yc-tip-row';
        const name = document.createElement('span');
        if (l.color) {
          const sw = document.createElement('i');
          sw.className = 'swatch';
          sw.style.background = l.color;
          name.append(sw, ' ');
        }
        name.append(l.label);
        const val = document.createElement('b');
        val.textContent = l.value;
        row.append(name, val);
        return row;
      });
      tooltip.replaceChildren(title, ...lines);
      tooltip.hidden = false;
      const box = svgEl.getBoundingClientRect();
      if (box.width === 0) return;
      const tw = tooltip.offsetWidth;
      let left = event.clientX - box.left + 14;
      if (left + tw > box.width) left = Math.max(0, event.clientX - box.left - tw - 14);
      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(event.clientY - box.top + 16)}px`;
    });
    cells.on('pointerleave.ch', hide);
  });

  // Scale legend: "Fewer" [level 0..N swatches] "More" — one row, under the last grid.
  const legend = root.append('g').attr('class', 'ch-legend').attr('transform', `translate(${L.left},${L.gridsBottom + 4})`);
  legend.append('text').attr('class', 'ch-legend-word').attr('x', 0).attr('y', L.cell).text(spec.scaleLabel.less);
  const lessW = spec.scaleLabel.less.length * 6.4 + 8;
  spec.levelColors.forEach((color, i) => {
    legend
      .append('rect')
      .attr('class', 'ch-legend-swatch')
      .attr('x', lessW + i * step)
      .attr('y', 0)
      .attr('width', L.cell)
      .attr('height', L.cell)
      .attr('rx', Math.min(2, L.cell / 4))
      .style('fill', color);
  });
  legend
    .append('text')
    .attr('class', 'ch-legend-word')
    .attr('x', lessW + spec.levelColors.length * step + 6)
    .attr('y', L.cell)
    .text(spec.scaleLabel.more);

  if (!reducedMotion) root.style('opacity', 0.15).transition().duration(350).style('opacity', 1);

  return () => {
    root.interrupt();
    root.selectAll('.ch-cell').on('.ch', null);
    if (tooltip) tooltip.hidden = true;
  };
}

/*
 * renderRankedBar.ts — pure D3 renderer for a horizontal ranked bar chart (CLAUDE.md §2 / §6).
 *
 *   renderRankedBar(svg, rows, options) → cleanup
 *
 * React owns the <svg> element and calls this from useEffect; D3 owns everything inside it.
 * Calls are idempotent: rows are joined by `key`, so a new page or filter animates from the previous
 * state instead of redrawing. Cleanup stops transitions and detaches listeners; it leaves the marks,
 * so the next call can animate from them.
 *
 * Safety: every string from data is written with `.text()` / `textContent` — never `.html()`.
 * Motion: `reducedMotion` → every change is applied immediately (standard §3.9).
 */
import { axisTop, interpolateNumber, max, scaleLinear, select } from 'd3';
import type { BaseType, Selection } from 'd3';

export type RankedBarRow = {
  /** Stable identity (e.g. an ISO code) — the join key. */
  key: string;
  /** Row label, e.g. "1  United States". */
  label: string;
  value: number;
  /** Any CSS colour, typically `var(--c-region-…)`. */
  color: string;
  /** Text at the bar end, e.g. "$27.7tn · 26.1%". */
  valueLabel: string;
  /** Optional 4:3 image beside the label (a flag). */
  imageUrl?: string;
  /** Tooltip: a heading and detail lines (plain text). */
  tooltip: { title: string; lines: string[] };
};

export type RankedBarOptions = {
  /** Container width in px (from useElementWidth). */
  width: number;
  reducedMotion: boolean;
  /** Axis tick labels. */
  tickFormat: (value: number) => string;
  /** Floating tooltip element (absolutely positioned inside the chart container); null = no tooltip. */
  tooltip: HTMLElement | null;
  /** Below this width labels move above the bars (phones). Default 560. */
  stackBelow?: number;
};

/** Layout decisions, exported for tests. */
export type RankedBarLayout = {
  stacked: boolean;
  rowHeight: number;
  barHeight: number;
  /** x where bars start. */
  barX: number;
  /** Width available to the longest bar. */
  barWidth: number;
  labelWidth: number;
  axisHeight: number;
  height: number;
};

const FONT = 13;
const VALUE_FONT = 12;
const CHAR = 0.58; // average glyph width / font size for Inter — an estimate, so jsdom needs no layout
const FLAG_W = 20;
const FLAG_H = 15;
const GAP = 8;
const RADIUS = 4;
const DURATION = 450;

const textWidth = (s: string, font: number): number => Math.ceil(s.length * font * CHAR);

export function layoutRankedBar(rows: readonly RankedBarRow[], width: number, stackBelow = 560): RankedBarLayout {
  const stacked = width < stackBelow;
  const hasImages = rows.some((r) => r.imageUrl);
  const imageSpace = hasImages ? FLAG_W + 6 : 0;
  const valueSpace = (max(rows, (r) => textWidth(r.valueLabel, VALUE_FONT)) ?? 0) + GAP;
  const axisHeight = 24;
  if (stacked) {
    const rowHeight = 44;
    return {
      stacked,
      rowHeight,
      barHeight: 14,
      barX: 0,
      barWidth: Math.max(40, width - valueSpace),
      labelWidth: width - imageSpace,
      axisHeight,
      height: axisHeight + rows.length * rowHeight + 4,
    };
  }
  const longest = max(rows, (r) => textWidth(r.label, FONT)) ?? 0;
  const labelWidth = Math.min(Math.max(longest, 80), Math.round(width * 0.34));
  const barX = labelWidth + imageSpace + GAP;
  const rowHeight = 30;
  return {
    stacked,
    rowHeight,
    barHeight: 18,
    barX,
    barWidth: Math.max(40, width - barX - valueSpace),
    labelWidth,
    axisHeight,
    height: axisHeight + rows.length * rowHeight + 4,
  };
}

/** Bar with a 4px rounded data end and a square baseline (dataviz mark spec). */
export function barPath(width: number, height: number): string {
  const w = Math.max(0, width);
  const r = Math.min(RADIUS, w / 2, height / 2);
  return `M0,0H${w - r}A${r},${r} 0 0 1 ${w},${r}V${height - r}A${r},${r} 0 0 1 ${w - r},${height}H0Z`;
}

/** Shortens a label to fit `maxWidth` (estimated), with an ellipsis. */
export function fitLabel(label: string, maxWidth: number, font = FONT): string {
  const maxChars = Math.floor(maxWidth / (font * CHAR));
  if (label.length <= maxChars) return label;
  return `${label.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

// Width each bar currently shows — transitions start from here (survives across render calls).
const shownWidth = new WeakMap<Element, number>();

type Row = Selection<SVGGElement, RankedBarRow, BaseType, unknown>;

export function renderRankedBar(
  svgEl: SVGSVGElement,
  rows: readonly RankedBarRow[],
  options: RankedBarOptions,
): () => void {
  const { width, reducedMotion, tickFormat, tooltip } = options;
  const L = layoutRankedBar(rows, width, options.stackBelow);
  const svg = select(svgEl);
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);

  const x = scaleLinear()
    .domain([0, max(rows, (r) => r.value) || 1])
    .range([0, L.barWidth]);
  const yOf = (i: number): number => L.axisHeight + i * L.rowHeight;
  const barY = L.stacked ? 22 : (L.rowHeight - L.barHeight) / 2;
  const duration = reducedMotion ? 0 : DURATION;

  // ── Axis (top) with hairline grid lines through the rows ──────────────────────────────────────
  const axisG = svg
    .selectAll<SVGGElement, null>('g.rb-axis')
    .data([null])
    .join((enter) => enter.append('g').attr('class', 'rb-axis'))
    .attr('transform', `translate(${L.barX},${L.axisHeight - 6})`);
  const ticks = Math.max(2, Math.floor(L.barWidth / 110));
  const axis = axisTop(x)
    .ticks(ticks)
    .tickFormat((d) => tickFormat(Number(d)))
    .tickSize(-(rows.length * L.rowHeight + 6))
    .tickSizeOuter(0);
  if (duration) axisG.transition().duration(duration).call(axis);
  else axisG.call(axis);
  axisG.select('.domain').remove();
  axisG.selectAll('.tick text').attr('dy', '-0.1em');

  // ── Rows ─────────────────────────────────────────────────────────────────────────────────────
  const plot = svg
    .selectAll<SVGGElement, null>('g.rb-rows')
    .data([null])
    .join((enter) => enter.append('g').attr('class', 'rb-rows'));

  const rowSel: Row = plot
    .selectAll<SVGGElement, RankedBarRow>('g.rb-row')
    .data(rows, (d) => d.key)
    .join(
      (enter) => {
        const g = enter
          .append('g')
          .attr('class', 'rb-row')
          .attr('transform', (_, i) => `translate(0,${yOf(i)})`)
          .style('opacity', duration ? 0 : 1);
        g.append('rect').attr('class', 'rb-hit');
        g.append('image').attr('class', 'rb-flag');
        g.append('text').attr('class', 'rb-label');
        g.append('path').attr('class', 'rb-bar');
        g.append('text').attr('class', 'rb-value');
        return g;
      },
      (update) => update,
      (exit) => {
        exit.select('.rb-hit').on('.rb', null);
        if (!duration) return exit.remove();
        return exit.transition().duration(duration / 2).style('opacity', 0).remove();
      },
    );

  // Position rows (animated reorder when paging within a filter).
  const rowY = (_: RankedBarRow, i: number): string => `translate(0,${yOf(i)})`;
  if (duration) rowSel.transition().duration(duration).attr('transform', rowY).style('opacity', 1);
  else rowSel.attr('transform', rowY).style('opacity', 1);

  rowSel
    .select<SVGRectElement>('.rb-hit')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', L.rowHeight);

  const imageX = 0;
  const labelX = L.stacked ? 0 : L.labelWidth;
  const hasImages = rows.some((r) => r.imageUrl);
  rowSel
    .select<SVGImageElement>('.rb-flag')
    .attr('href', (d) => d.imageUrl ?? null)
    .attr('display', (d) => (d.imageUrl ? null : 'none'))
    .attr('width', FLAG_W)
    .attr('height', FLAG_H)
    .attr('x', L.stacked ? imageX : L.labelWidth + 6)
    .attr('y', L.stacked ? 2 : (L.rowHeight - FLAG_H) / 2)
    .attr('preserveAspectRatio', 'xMidYMid slice');

  rowSel
    .select<SVGTextElement>('.rb-label')
    .attr('x', L.stacked ? (hasImages ? FLAG_W + 6 : 0) : labelX)
    .attr('y', L.stacked ? 10 : L.rowHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', L.stacked ? 'start' : 'end')
    .text((d) => fitLabel(d.label, L.labelWidth))
    .each(function (d) {
      // Full label on hover when truncated (native SVG tooltip; text only).
      const el = select(this);
      const shown = el.text();
      el.selectAll('title')
        .data(shown === d.label ? [] : [d.label])
        .join('title')
        .text((t) => t);
    });

  const bars = rowSel
    .select<SVGPathElement>('.rb-bar')
    .attr('transform', `translate(${L.barX},${barY})`)
    .style('fill', (d) => d.color);
  const values = rowSel
    .select<SVGTextElement>('.rb-value')
    .attr('y', barY + L.barHeight / 2)
    .attr('dy', '0.35em')
    .text((d) => d.valueLabel);

  if (duration) {
    bars
      .transition()
      .duration(duration)
      .attrTween('d', function (d) {
        const from = shownWidth.get(this) ?? 0;
        const to = x(d.value);
        const w = interpolateNumber(from, to);
        return (t) => {
          const now = w(t);
          shownWidth.set(this, now);
          return barPath(now, L.barHeight);
        };
      });
    // Value labels ride on the bar end: read the tweened width each frame, so both always agree.
    values
      .transition()
      .duration(duration)
      .attrTween('x', function () {
        const bar = (this.parentNode as Element).querySelector('.rb-bar');
        return () => String(L.barX + ((bar && shownWidth.get(bar)) ?? 0) + 6);
      });
  } else {
    bars.attr('d', function (d) {
      shownWidth.set(this, x(d.value));
      return barPath(x(d.value), L.barHeight);
    });
    values.attr('x', (d) => L.barX + x(d.value) + 6);
  }

  // ── Tooltip (pointer only; keyboard and screen-reader users get the table view) ───────────────
  const hide = (): void => {
    if (tooltip) tooltip.hidden = true;
    rowSel.classed('is-hover', false);
  };
  const show = (event: PointerEvent, d: RankedBarRow, row: SVGGElement): void => {
    rowSel.classed('is-hover', false);
    select(row).classed('is-hover', true);
    if (!tooltip) return;
    const title = document.createElement('strong');
    title.textContent = d.tooltip.title;
    const lines = d.tooltip.lines.map((line) => {
      const div = document.createElement('div');
      div.textContent = line;
      return div;
    });
    tooltip.replaceChildren(title, ...lines);
    tooltip.hidden = false;
    const host = tooltip.offsetParent ?? svgEl.parentElement;
    const box = host?.getBoundingClientRect();
    if (!box) return;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let left = event.clientX - box.left + 14;
    if (left + tw > box.width) left = Math.max(0, event.clientX - box.left - tw - 14);
    const top = Math.max(0, event.clientY - box.top - th - 10);
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  };
  rowSel
    .select<SVGRectElement>('.rb-hit')
    .on('pointerenter.rb pointermove.rb pointerdown.rb', function (event: PointerEvent, d) {
      show(event, d, this.parentNode as SVGGElement);
    })
    .on('pointerleave.rb', hide);

  return () => {
    svg.selectAll('*').interrupt();
    rowSel.select('.rb-hit').on('.rb', null);
    hide();
  };
}

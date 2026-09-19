/*
 * renderButterfly.ts — pure D3 renderer for a butterfly (back-to-back) bar chart. CHANGED (S3-bdd): new.
 *
 *   renderButterfly(svg, rows, options) → cleanup
 *
 * Two quantities in the SAME unit per row — left bars grow left from the label column, right bars grow
 * right — on ONE shared scale, so bar lengths compare across sides (births vs deaths per day).
 * React owns the <svg>; D3 owns everything inside it. Rows are joined by `key`, so paging/filtering animates
 * from the previous state. Cleanup stops transitions and detaches listeners; marks stay for the next call.
 *
 * Safety: every string from data is written with `.text()` / `textContent` — never `.html()`.
 * Motion: `reducedMotion` → every change is applied immediately (standard §3.9).
 */
import { axisTop, interpolateNumber, max, scaleLinear, select } from 'd3';
import type { BaseType, ScaleLinear, Selection } from 'd3';
import { barPath, fitLabel } from './renderRankedBar';

export type ButterflyRow = {
  /** Stable identity (ISO code) — the join key. */
  key: string;
  /** Row label, e.g. "1  India". */
  label: string;
  left: number;
  right: number;
  /** Texts at the bar ends. */
  leftLabel: string;
  rightLabel: string;
  /** Optional 4:3 image before the label (a flag). */
  imageUrl?: string;
  /** Tinted row band (e.g. more deaths than births). */
  tint?: boolean;
  /** Outlined row (e.g. the reader's own country). */
  highlight?: boolean;
  tooltip: { title: string; lines: string[] };
};

export type ButterflyOptions = {
  width: number;
  reducedMotion: boolean;
  tickFormat: (value: number) => string;
  /** CSS colours of the two sides (e.g. `var(--c-birth)`). */
  leftColor: string;
  rightColor: string;
  /** Side headings above the axes (plain text). */
  leftTitle: string;
  rightTitle: string;
  tooltip: HTMLElement | null;
  /** Below this width the label moves above the bars (phones). Default 560. */
  stackBelow?: number;
};

export type ButterflyLayout = {
  stacked: boolean;
  rowHeight: number;
  barHeight: number;
  /** Bar y within a row. */
  barY: number;
  /** x where left bars start (they grow towards 0). */
  leftOrigin: number;
  /** x where right bars start. */
  rightOrigin: number;
  /** Longest bar on either side. */
  barWidth: number;
  /** Label column: x and width (wide) or full width (stacked). */
  labelX: number;
  labelWidth: number;
  headerHeight: number;
  axisHeight: number;
  /** y of the first row. */
  top: number;
  height: number;
};

const FONT = 13;
const VALUE_FONT = 12;
const CHAR = 0.58; // average glyph width / font size for Inter — an estimate, so jsdom needs no layout
const FLAG_W = 20;
const FLAG_H = 15;
const GAP = 8;
const DURATION = 450;

const textWidth = (s: string, font: number): number => Math.ceil(s.length * font * CHAR);

export function layoutButterfly(rows: readonly ButterflyRow[], width: number, stackBelow = 560): ButterflyLayout {
  const stacked = width < stackBelow;
  const hasImages = rows.some((r) => r.imageUrl);
  const imageSpace = hasImages ? FLAG_W + 6 : 0;
  const valueSpace =
    (max(rows, (r) => Math.max(textWidth(r.leftLabel, VALUE_FONT), textWidth(r.rightLabel, VALUE_FONT))) ?? 0) + GAP;
  const headerHeight = 22;
  const axisHeight = 22;
  const top = headerHeight + axisHeight;
  const center = width / 2;
  if (stacked) {
    const rowHeight = 46;
    const half = 2; // hairline gap between the two bars
    return {
      stacked,
      rowHeight,
      barHeight: 14,
      barY: 24,
      leftOrigin: center - half,
      rightOrigin: center + half,
      barWidth: Math.max(30, center - half - valueSpace),
      labelX: 0,
      labelWidth: width - imageSpace,
      headerHeight,
      axisHeight,
      top,
      height: top + rows.length * rowHeight + 4,
    };
  }
  const longest = max(rows, (r) => textWidth(r.label, FONT)) ?? 0;
  const labelWidth = Math.min(Math.max(longest, 90), Math.round(width * 0.26));
  const column = imageSpace + labelWidth;
  const rowHeight = 30;
  const barHeight = 18;
  return {
    stacked,
    rowHeight,
    barHeight,
    barY: (rowHeight - barHeight) / 2,
    leftOrigin: center - column / 2 - GAP,
    rightOrigin: center + column / 2 + GAP,
    barWidth: Math.max(30, center - column / 2 - GAP - valueSpace),
    labelX: center - column / 2,
    labelWidth,
    headerHeight,
    axisHeight,
    top,
    height: top + rows.length * rowHeight + 4,
  };
}

// Width each bar currently shows — transitions start from here (survives across render calls).
const shownWidth = new WeakMap<Element, number>();

type Row = Selection<SVGGElement, ButterflyRow, BaseType, unknown>;
type Side = 'left' | 'right';

export function renderButterfly(
  svgEl: SVGSVGElement,
  rows: readonly ButterflyRow[],
  options: ButterflyOptions,
): () => void {
  const { width, reducedMotion, tickFormat, tooltip } = options;
  const L = layoutButterfly(rows, width, options.stackBelow);
  const svg = select(svgEl);
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);
  const duration = reducedMotion ? 0 : DURATION;

  // One scale for both sides: the whole point of a butterfly is that lengths compare across the middle.
  const x = scaleLinear()
    .domain([0, max(rows, (r) => Math.max(r.left, r.right)) || 1])
    .range([0, L.barWidth]);
  const yOf = (i: number): number => L.top + i * L.rowHeight;
  const plotHeight = rows.length * L.rowHeight + 4;

  // ── Side headings: a colour chip + plain text (text never wears a data colour) ────────────────
  const heads = svg
    .selectAll<SVGGElement, Side>('g.bf-head')
    .data<Side>(['left', 'right'])
    .join((enter) => {
      const g = enter.append('g').attr('class', (d) => `bf-head bf-head-${d}`);
      g.append('rect').attr('class', 'bf-head-chip').attr('width', 10).attr('height', 10).attr('rx', 2);
      g.append('text').attr('class', 'bf-head-text');
      return g;
    });
  heads
    .select('.bf-head-chip')
    .attr('x', (d) => (d === 'left' ? L.leftOrigin - 10 : L.rightOrigin))
    .attr('y', 4)
    .style('fill', (d) => (d === 'left' ? options.leftColor : options.rightColor));
  heads
    .select('.bf-head-text')
    .attr('x', (d) => (d === 'left' ? L.leftOrigin - 16 : L.rightOrigin + 16))
    .attr('y', 9)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d) => (d === 'left' ? 'end' : 'start'))
    .text((d) => (d === 'left' ? `← ${options.leftTitle}` : `${options.rightTitle} →`));

  // ── Axes (top), mirrored, with hairline grid lines through the rows ──────────────────────────
  const ticks = Math.max(2, Math.min(5, Math.floor(L.barWidth / 90)));
  const drawAxis = (side: Side, scale: ScaleLinear<number, number>, originX: number): void => {
    const g = svg
      .selectAll<SVGGElement, null>(`g.bf-axis-${side}`)
      .data([null])
      .join((enter) => enter.append('g').attr('class', `bf-axis bf-axis-${side}`))
      .attr('transform', `translate(${originX},${L.top - 6})`);
    const axis = axisTop(scale)
      .ticks(ticks)
      .tickFormat((d) => tickFormat(Number(d)))
      .tickSize(-(plotHeight + 6))
      .tickSizeOuter(0);
    if (duration) g.transition().duration(duration).call(axis);
    else g.call(axis);
    g.select('.domain').remove();
    g.selectAll('.tick text').attr('dy', '-0.1em');
    // Stacked (phone): both zero ticks meet in the middle — label the right one only.
    if (L.stacked && side === 'left') g.selectAll<SVGGElement, number>('.tick').filter((d) => d === 0).select('text').text('');
  };
  drawAxis('left', x.copy().range([0, -L.barWidth]), L.leftOrigin);
  drawAxis('right', x, L.rightOrigin);

  // ── Rows ─────────────────────────────────────────────────────────────────────────────────────
  const plot = svg
    .selectAll<SVGGElement, null>('g.bf-rows')
    .data([null])
    .join((enter) => enter.append('g').attr('class', 'bf-rows'));

  const rowSel: Row = plot
    .selectAll<SVGGElement, ButterflyRow>('g.bf-row')
    .data(rows, (d) => d.key)
    .join(
      (enter) => {
        const g = enter
          .append('g')
          .attr('class', 'bf-row')
          .attr('transform', (_, i) => `translate(0,${yOf(i)})`)
          .style('opacity', duration ? 0 : 1);
        g.append('rect').attr('class', 'bf-band');
        g.append('rect').attr('class', 'bf-hit');
        g.append('image').attr('class', 'bf-flag');
        g.append('text').attr('class', 'bf-label');
        g.append('path').attr('class', 'bf-bar bf-bar-left');
        g.append('path').attr('class', 'bf-bar bf-bar-right');
        g.append('text').attr('class', 'bf-value bf-value-left');
        g.append('text').attr('class', 'bf-value bf-value-right');
        return g;
      },
      (update) => update,
      (exit) => {
        exit.select('.bf-hit').on('.bf', null);
        if (!duration) return exit.remove();
        return exit.transition().duration(duration / 2).style('opacity', 0).remove();
      },
    );

  const rowY = (_: ButterflyRow, i: number): string => `translate(0,${yOf(i)})`;
  if (duration) rowSel.transition().duration(duration).attr('transform', rowY).style('opacity', 1);
  else rowSel.attr('transform', rowY).style('opacity', 1);

  rowSel
    .classed('is-tint', (d) => Boolean(d.tint))
    .classed('is-highlight', (d) => Boolean(d.highlight));
  rowSel
    .select<SVGRectElement>('.bf-band')
    .attr('x', 0.5)
    .attr('y', 1)
    .attr('width', Math.max(0, width - 1))
    .attr('height', L.rowHeight - 2)
    .attr('rx', 4)
    .attr('display', (d) => (d.tint || d.highlight ? null : 'none'));
  rowSel
    .select<SVGRectElement>('.bf-hit')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', L.rowHeight);

  const hasImages = rows.some((r) => r.imageUrl);
  const textX = L.labelX + (hasImages ? FLAG_W + 6 : 0);
  rowSel
    .select<SVGImageElement>('.bf-flag')
    .attr('href', (d) => d.imageUrl ?? null)
    .attr('display', (d) => (d.imageUrl ? null : 'none'))
    .attr('width', FLAG_W)
    .attr('height', FLAG_H)
    .attr('x', L.stacked ? 4 : L.labelX)
    .attr('y', L.stacked ? 3 : (L.rowHeight - FLAG_H) / 2)
    .attr('preserveAspectRatio', 'xMidYMid slice');
  rowSel
    .select<SVGTextElement>('.bf-label')
    .attr('x', L.stacked ? (hasImages ? FLAG_W + 12 : 4) : textX)
    .attr('y', L.stacked ? 11 : L.rowHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'start')
    .text((d) => fitLabel(d.label, L.labelWidth))
    .each(function (d) {
      const el = select(this);
      el.selectAll('title')
        .data(el.text() === d.label ? [] : [d.label])
        .join('title')
        .text((t) => t);
    });

  // Left bars are the same path mirrored: the rounded data end then points outwards on both sides.
  const leftBars = rowSel
    .select<SVGPathElement>('.bf-bar-left')
    .attr('transform', `translate(${L.leftOrigin},${L.barY}) scale(-1,1)`)
    .style('fill', options.leftColor);
  const rightBars = rowSel
    .select<SVGPathElement>('.bf-bar-right')
    .attr('transform', `translate(${L.rightOrigin},${L.barY})`)
    .style('fill', options.rightColor);
  const leftValues = rowSel
    .select<SVGTextElement>('.bf-value-left')
    .attr('y', L.barY + L.barHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .text((d) => d.leftLabel);
  const rightValues = rowSel
    .select<SVGTextElement>('.bf-value-right')
    .attr('y', L.barY + L.barHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'start')
    .text((d) => d.rightLabel);

  const valueX = (side: Side, w: number): number => (side === 'left' ? L.leftOrigin - w - 6 : L.rightOrigin + w + 6);
  const drawSide = (
    bars: Selection<SVGPathElement, ButterflyRow, BaseType, unknown>,
    values: Selection<SVGTextElement, ButterflyRow, BaseType, unknown>,
    side: Side,
  ): void => {
    const target = (d: ButterflyRow): number => x(side === 'left' ? d.left : d.right);
    if (duration) {
      bars
        .transition()
        .duration(duration)
        .attrTween('d', function (d) {
          const w = interpolateNumber(shownWidth.get(this) ?? 0, target(d));
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
          const bar = (this.parentNode as Element).querySelector(`.bf-bar-${side}`);
          return () => String(valueX(side, (bar && shownWidth.get(bar)) ?? 0));
        });
    } else {
      bars.attr('d', function (d) {
        shownWidth.set(this, target(d));
        return barPath(target(d), L.barHeight);
      });
      values.attr('x', (d) => valueX(side, target(d)));
    }
  };
  drawSide(leftBars, leftValues, 'left');
  drawSide(rightBars, rightValues, 'right');

  // ── Tooltip (pointer only; keyboard and screen-reader users get the table view) ───────────────
  const hide = (): void => {
    if (tooltip) tooltip.hidden = true;
    rowSel.classed('is-hover', false);
  };
  const show = (event: PointerEvent, d: ButterflyRow, row: SVGGElement): void => {
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
    .select<SVGRectElement>('.bf-hit')
    .on('pointerenter.bf pointermove.bf pointerdown.bf', function (event: PointerEvent, d) {
      show(event, d, this.parentNode as SVGGElement);
    })
    .on('pointerleave.bf', hide);

  return () => {
    svg.selectAll('*').interrupt();
    rowSel.select('.bf-hit').on('.bf', null);
    hide();
  };
}

/*
 * renderBarRace.ts — pure D3 renderer for one frame of a bar chart race (CLAUDE.md §2 / §6).
 * CHANGED (S3-br): new chart core.
 *
 *   renderBarRace(svg, rows, options) → cleanup
 *
 * One call draws one frame: the top `slots` rows in rank order. Rows are joined by `key`, so consecutive
 * calls animate — bars grow and shrink, rows swap places, a row that enters the top slides up from below
 * the last slot and a row that leaves slides down and fades. With `duration` equal to the frame interval
 * and a linear ease, consecutive frames join into one continuous motion; `duration: 0` (reduced motion,
 * scrubbing) applies the frame at once. Cleanup interrupts transitions and detaches listeners but keeps
 * the marks, so the next frame continues from what is on screen.
 *
 * Layout is fixed for the whole race (height from `slots`, label column from `longestLabel`), so nothing
 * jumps while the ranking changes. Safety: every string is written with `.text()` / `textContent`.
 */
import { axisTop, easeLinear, interpolateNumber, max, scaleLinear, select } from 'd3';
import type { BaseType, Selection } from 'd3';
import { barPath, fitLabel } from './renderRankedBar';
import { hideTip, showTip } from './tooltip';
import type { TipContent } from './tooltip';

export type BarRaceRow = {
  /** Stable identity across frames — the join key. */
  key: string;
  /** Row label, e.g. "1  Apple". */
  label: string;
  value: number;
  /** Any CSS colour, typically `var(--c-sector-…)`. */
  color: string;
  /** Optional 4:3 image beside the label (a flag). */
  imageUrl?: string;
  tooltip: TipContent;
};

export type BarRaceOptions = {
  /** Container width in px (from useElementWidth). */
  width: number;
  /** Number of bar slots — the chart height never changes during the race. */
  slots: number;
  /** Transition length in ms (the frame interval while playing); 0 = apply at once. */
  duration: number;
  /** Text at the bar end, tweened with the value, e.g. v → "$471B". */
  valueFormat: (value: number) => string;
  tickFormat: (value: number) => string;
  /** Large label in the lower right corner (the year). */
  ticker: string;
  /** The longest label and value label of the whole race — they size the columns once. */
  longestLabel: string;
  longestValue: string;
  /** Floating tooltip element; null = no tooltip. */
  tooltip: HTMLElement | null;
  /** Below this width labels move above the bars (phones). Default 560. */
  stackBelow?: number;
};

export type BarRaceLayout = {
  stacked: boolean;
  rowHeight: number;
  barHeight: number;
  barX: number;
  barWidth: number;
  labelWidth: number;
  axisHeight: number;
  height: number;
  tickerSize: number;
};

const FONT = 13;
const VALUE_FONT = 12;
const CHAR = 0.58; // average glyph width / font size for Inter — an estimate, so jsdom needs no layout
const FLAG_W = 20;
const FLAG_H = 15;
const GAP = 8;

const textWidth = (s: string, font: number): number => Math.ceil(s.length * font * CHAR);

export function layoutBarRace(
  slots: number,
  width: number,
  longestLabel: string,
  longestValue: string,
  hasImages: boolean,
  stackBelow = 560,
): BarRaceLayout {
  const stacked = width < stackBelow;
  const imageSpace = hasImages ? FLAG_W + 6 : 0;
  const valueSpace = textWidth(longestValue, VALUE_FONT) + GAP;
  const axisHeight = 24;
  const n = Math.max(1, slots);
  if (stacked) {
    const rowHeight = 40;
    return {
      stacked,
      rowHeight,
      barHeight: 14,
      barX: 0,
      barWidth: Math.max(40, width - valueSpace),
      labelWidth: width - imageSpace,
      axisHeight,
      height: axisHeight + n * rowHeight + 4,
      tickerSize: Math.round(Math.min(40, Math.max(26, width / 10))),
    };
  }
  const labelWidth = Math.min(Math.max(textWidth(longestLabel, FONT), 80), Math.round(width * 0.3));
  const barX = labelWidth + imageSpace + GAP;
  const rowHeight = 32;
  return {
    stacked,
    rowHeight,
    barHeight: 20,
    barX,
    barWidth: Math.max(40, width - barX - valueSpace),
    labelWidth,
    axisHeight,
    height: axisHeight + n * rowHeight + 4,
    tickerSize: Math.round(Math.min(72, Math.max(36, width / 13))),
  };
}

// What each bar / value label currently shows — the next frame starts from here.
const shownWidth = new WeakMap<Element, number>();
const shownValue = new WeakMap<Element, number>();

type Row = Selection<SVGGElement, BarRaceRow, BaseType, unknown>;

export function renderBarRace(svgEl: SVGSVGElement, rows: readonly BarRaceRow[], options: BarRaceOptions): () => void {
  const { width, slots, tooltip, valueFormat } = options;
  const top = rows.slice(0, slots);
  const hasImages = top.some((r) => r.imageUrl);
  const L = layoutBarRace(slots, width, options.longestLabel, options.longestValue, hasImages, options.stackBelow);
  const duration = Math.max(0, options.duration);
  const svg = select(svgEl);
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);

  const x = scaleLinear()
    .domain([0, max(top, (r) => r.value) || 1])
    .range([0, L.barWidth]);
  const yOf = (i: number): number => L.axisHeight + i * L.rowHeight;
  const barY = L.stacked ? 20 : (L.rowHeight - L.barHeight) / 2;

  // ── Ticker (behind the bars; the lower right is where the shortest bars leave room) ──────────────
  svg
    .selectAll<SVGTextElement, null>('text.br-ticker')
    .data([null])
    .join((enter) => enter.insert('text', ':first-child').attr('class', 'br-ticker').attr('text-anchor', 'end'))
    .attr('x', width - 4)
    .attr('y', L.height - 12)
    .style('font-size', `${L.tickerSize}px`)
    .text(options.ticker);

  // ── Axis (top) with hairline grid lines through the slots ────────────────────────────────────────
  const axisG = svg
    .selectAll<SVGGElement, null>('g.br-axis')
    .data([null])
    .join((enter) => enter.append('g').attr('class', 'br-axis'))
    .attr('transform', `translate(${L.barX},${L.axisHeight - 6})`);
  const axis = axisTop(x)
    .ticks(Math.max(2, Math.floor(L.barWidth / 120)))
    .tickFormat((d) => options.tickFormat(Number(d)))
    .tickSize(-(slots * L.rowHeight + 6))
    .tickSizeOuter(0);
  if (duration) axisG.transition().duration(duration).ease(easeLinear).call(axis);
  else axisG.call(axis);
  axisG.select('.domain').remove();
  axisG.selectAll('.tick text').attr('dy', '-0.1em');

  // ── Rows ─────────────────────────────────────────────────────────────────────────────────────────
  const plot = svg
    .selectAll<SVGGElement, null>('g.br-rows')
    .data([null])
    .join((enter) => enter.append('g').attr('class', 'br-rows'));

  const below = `translate(0,${yOf(slots)})`;
  const rowSel: Row = plot
    .selectAll<SVGGElement, BarRaceRow>('g.br-row')
    .data(top, (d) => d.key)
    .join(
      (enter) => {
        const g = enter
          .append('g')
          .attr('class', 'br-row')
          .attr('transform', duration ? below : (_, i) => `translate(0,${yOf(i)})`)
          .style('opacity', duration ? 0 : 1);
        g.append('rect').attr('class', 'br-hit');
        g.append('image').attr('class', 'br-flag');
        g.append('text').attr('class', 'br-label');
        g.append('path').attr('class', 'br-bar');
        g.append('text').attr('class', 'br-value');
        return g;
      },
      (update) => update,
      (exit) => {
        exit.select('.br-hit').on('.br', null);
        if (!duration) return exit.remove();
        return exit.transition().duration(duration).ease(easeLinear).attr('transform', below).style('opacity', 0).remove();
      },
    );

  const rowY = (_: BarRaceRow, i: number): string => `translate(0,${yOf(i)})`;
  if (duration) rowSel.transition().duration(duration).ease(easeLinear).attr('transform', rowY).style('opacity', 1);
  else rowSel.interrupt().attr('transform', rowY).style('opacity', 1);

  rowSel.select<SVGRectElement>('.br-hit').attr('x', 0).attr('y', 0).attr('width', width).attr('height', L.rowHeight);

  rowSel
    .select<SVGImageElement>('.br-flag')
    .attr('href', (d) => d.imageUrl ?? null)
    .attr('display', (d) => (d.imageUrl ? null : 'none'))
    .attr('width', FLAG_W)
    .attr('height', FLAG_H)
    .attr('x', L.stacked ? 0 : L.labelWidth + 6)
    .attr('y', L.stacked ? 1 : (L.rowHeight - FLAG_H) / 2)
    .attr('preserveAspectRatio', 'xMidYMid slice');

  rowSel
    .select<SVGTextElement>('.br-label')
    .attr('x', L.stacked ? (hasImages ? FLAG_W + 6 : 0) : L.labelWidth)
    .attr('y', L.stacked ? 9 : L.rowHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', L.stacked ? 'start' : 'end')
    .text((d) => fitLabel(d.label, L.labelWidth));

  const bars = rowSel
    .select<SVGPathElement>('.br-bar')
    .attr('transform', `translate(${L.barX},${barY})`)
    .style('fill', (d) => d.color);
  const values = rowSel
    .select<SVGTextElement>('.br-value')
    .attr('y', barY + L.barHeight / 2)
    .attr('dy', '0.35em');

  if (duration) {
    bars
      .transition()
      .duration(duration)
      .ease(easeLinear)
      .attrTween('d', function (d) {
        const w = interpolateNumber(shownWidth.get(this) ?? 0, x(d.value));
        return (t) => {
          const now = w(t);
          shownWidth.set(this, now);
          return barPath(now, L.barHeight);
        };
      });
    values
      .transition()
      .duration(duration)
      .ease(easeLinear)
      .attrTween('x', function () {
        const bar = (this.parentNode as Element).querySelector('.br-bar');
        return () => String(L.barX + ((bar && shownWidth.get(bar)) ?? 0) + 6);
      })
      .tween('text', function (d) {
        const v = interpolateNumber(shownValue.get(this) ?? 0, d.value);
        return (t) => {
          const now = v(t);
          shownValue.set(this, now);
          this.textContent = valueFormat(now);
        };
      });
  } else {
    bars.interrupt().attr('d', function (d) {
      shownWidth.set(this, x(d.value));
      return barPath(x(d.value), L.barHeight);
    });
    values
      .interrupt()
      .attr('x', (d) => L.barX + x(d.value) + 6)
      .text(function (d) {
        shownValue.set(this, d.value);
        return valueFormat(d.value);
      });
  }

  // ── Tooltip (pointer only; keyboard and screen-reader users get the table view) ─────────────────
  const hide = (): void => {
    hideTip(tooltip);
    rowSel.classed('is-hover', false);
  };
  rowSel
    .select<SVGRectElement>('.br-hit')
    .on('pointerenter.br pointermove.br pointerdown.br', function (event: PointerEvent, d) {
      rowSel.classed('is-hover', false);
      select(this.parentNode as SVGGElement).classed('is-hover', true);
      showTip(tooltip, svgEl, event, d.tooltip);
    })
    .on('pointerleave.br', hide);

  return () => {
    svg.selectAll('*').interrupt();
    rowSel.select('.br-hit').on('.br', null);
    hide();
  };
}

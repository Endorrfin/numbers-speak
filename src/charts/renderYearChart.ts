/*
 * renderYearChart.ts — pure D3 renderer for one value axis over consecutive years (CLAUDE.md §2 / §6).
 *
 *   renderYearChart(svg, spec, options) → cleanup
 *
 * A declarative spec composes layers, bottom to top: period bands → grid → gap fills → areas → bars →
 * reference rules → lines → notes → end markers → hover layer. The same renderer draws line charts,
 * bar charts, mirrored bars and "gap" charts (the fill between two series), so a new time-series entry
 * (donations, volunteers…) only writes a spec.
 *
 * React owns the <svg> element and calls this from useEffect; D3 owns everything inside it.
 * Idempotent: every call redraws the frame from the spec (a view switch changes every mark, so there is
 * nothing to tween between specs); the plot fades in unless `reducedMotion`. Cleanup stops the fade and
 * detaches listeners.
 *
 * Safety: every string is written with `.text()` / `textContent` — never `.html()`.
 * Accessibility: the <svg> carries role="img" + a label from the caller; the tooltip is pointer-only and
 * text-only — the table view is the keyboard and screen-reader path.
 */
import { area, axisBottom, axisLeft, curveMonotoneX, line, scaleLinear, select } from 'd3';

export type YearBand = {
  from: number;
  to: number;
  /** Shown above the band when wide… */
  label: string;
  /** …and this when narrow (e.g. "*"). */
  shortLabel: string;
  /** 1 = light, 2 = stronger tint. */
  level: 1 | 2;
};
export type YearLine = { key: string; values: readonly number[]; color: string; width?: number };
export type YearArea = { key: string; top: readonly number[]; bottom: number; fill: string };
/** Fill between series `a` and `b`: `fillAbove` where b > a, `fillBelow` where b < a. */
export type YearGap = { key: string; a: readonly number[]; b: readonly number[]; fillAbove: string; fillBelow: string };
export type YearBars = { key: string; values: readonly number[]; color: (value: number, index: number) => string };
export type YearRule = {
  value: number;
  label?: string;
  labelAt?: 'start' | 'end';
  labelSide?: 'above' | 'below';
  color?: string;
  width?: number;
};
export type YearMarker = { key: string; index: number; value: number; color: string; label?: string; labelDy?: number };
export type YearNote = {
  index: number;
  value: number;
  lines: readonly string[];
  /** Label offset from the data point, px. A connector is drawn when the offset is long enough. */
  dx: number;
  dy: number;
  anchor: 'start' | 'middle' | 'end';
  /** Key notes stay on narrow screens (and are bold); the rest are hidden there. */
  key?: boolean;
};
/** A free label in data coordinates (e.g. inside a filled area). */
export type YearLabel = { year: number; value: number; lines: readonly string[]; strong?: boolean; wideOnly?: boolean };
export type YearTooltip = { title: string; lines: readonly { label: string; value: string; color?: string }[] };

export type YearChartSpec = {
  years: readonly number[];
  yDomain: readonly [number, number];
  yFormat: (value: number) => string;
  yTicks?: number;
  /** Unit of the value axis, drawn top-left (e.g. "thousand people"). */
  yLabel?: string;
  xTicks?: readonly number[];
  xTicksNarrow?: readonly number[];
  /** CHANGED (S3-cd): format an x tick label from its raw index value (default: the index itself, e.g. a
   *  year). Lets the same renderer index by month (1..12, "Jan".."Dec") for a seasonal year-overlay, not
   *  only by calendar year. */
  xFormat?: (value: number) => string;
  bands?: readonly YearBand[];
  gaps?: readonly YearGap[];
  areas?: readonly YearArea[];
  bars?: readonly YearBars[];
  rules?: readonly YearRule[];
  lines?: readonly YearLine[];
  labels?: readonly YearLabel[];
  notes?: readonly YearNote[];
  markers?: readonly YearMarker[];
  /** Points highlighted on hover for year index i. */
  hoverPoints?: (index: number) => readonly { value: number; color: string }[];
  tooltip?: (index: number) => YearTooltip;
};

export type YearChartOptions = {
  width: number;
  reducedMotion: boolean;
  /** Floating tooltip element (absolutely positioned inside the chart container); null = no tooltip. */
  tooltip: HTMLElement | null;
  /** Below this width only key notes stay and fewer ticks are drawn. Default 560. */
  narrowBelow?: number;
};

export type YearChartLayout = {
  narrow: boolean;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
};

const CHAR = 0.58; // average glyph width / font size (Inter) — an estimate, so jsdom needs no layout
const TICK_FONT = 12;
const RADIUS = 4;
const FADE = 350;

export function layoutYearChart(spec: YearChartSpec, width: number, narrowBelow = 560): YearChartLayout {
  const narrow = width < narrowBelow;
  const ticks = scaleLinear().domain(spec.yDomain).ticks(spec.yTicks ?? 5);
  const longestTick = Math.max(0, ...ticks.map((t) => spec.yFormat(t).length));
  const longestEnd = Math.max(0, ...(spec.markers ?? []).map((m) => (m.label ?? '').length));
  return {
    narrow,
    height: narrow ? 320 : 420,
    margin: {
      top: 34,
      right: Math.max(16, Math.ceil(longestEnd * 15 * 0.62) + 16),
      bottom: 28,
      left: Math.ceil(longestTick * TICK_FONT * CHAR) + 12,
    },
  };
}

/** A bar from the baseline y0 to y1 with a 4px rounded data end and a square baseline (dataviz spec). */
export function yearBarPath(x0: number, width: number, y0: number, y1: number): string {
  const w = Math.max(0, width);
  const h = Math.abs(y1 - y0);
  const r = Math.min(RADIUS, w / 2, h);
  if (h === 0) return '';
  return y1 < y0
    ? `M${x0},${y0}V${y1 + r}Q${x0},${y1} ${x0 + r},${y1}H${x0 + w - r}Q${x0 + w},${y1} ${x0 + w},${y1 + r}V${y0}Z`
    : `M${x0},${y0}V${y1 - r}Q${x0},${y1} ${x0 + r},${y1}H${x0 + w - r}Q${x0 + w},${y1} ${x0 + w},${y1 - r}V${y0}Z`;
}

let uid = 0;

export function renderYearChart(svgEl: SVGSVGElement, spec: YearChartSpec, options: YearChartOptions): () => void {
  const { width, reducedMotion, tooltip } = options;
  const L = layoutYearChart(spec, width, options.narrowBelow);
  const { top, right, bottom, left } = L.margin;
  const H = L.height;
  const years = spec.years;
  const first = years[0] ?? 0;
  const last = years[years.length - 1] ?? 0;
  const id = `yc${++uid}`;

  const svg = select(svgEl);
  svg.interrupt();
  svg.selectAll('*').remove();
  svg.attr('width', width).attr('height', H).attr('viewBox', `0 0 ${width} ${H}`);

  const x = scaleLinear().domain([first - 0.5, last + 0.5]).range([left, width - right]);
  const y = scaleLinear().domain(spec.yDomain).range([H - bottom, top]);
  const X = (i: number): number => x(years[i] ?? first);
  const step = x(first + 1) - x(first);

  const root = svg.append('g').attr('class', 'yc-root');

  // ── Period bands ────────────────────────────────────────────────────────────────────────────────
  const bandG = root.append('g').attr('class', 'yc-bands');
  for (const b of spec.bands ?? []) {
    const x0 = x(b.from - 0.5);
    const x1 = x(b.to + 0.5);
    bandG
      .append('rect')
      .attr('class', `yc-band yc-band-${b.level}`)
      .attr('x', x0)
      .attr('width', x1 - x0)
      .attr('y', top - 22)
      .attr('height', H - bottom - top + 22);
    // Mono labels run wider than the Inter estimate: 0.62 em per glyph plus padding.
    const label = L.narrow || b.label.length * 11 * 0.62 > x1 - x0 - 12 ? b.shortLabel : b.label;
    bandG.append('text').attr('class', 'yc-band-label').attr('x', x0 + 5).attr('y', top - 8).text(label);
  }

  // ── Axes & grid (solid hairlines, recessive) ────────────────────────────────────────────────────
  const yTicks = spec.yTicks ?? 5;
  root
    .append('g')
    .attr('class', 'yc-grid')
    .attr('transform', `translate(${left},0)`)
    .call(axisLeft(y).ticks(yTicks).tickSize(-(width - left - right)).tickFormat(() => ''))
    .call((g) => g.select('.domain').remove());
  root
    .append('g')
    .attr('class', 'yc-axis yc-axis-y')
    .attr('transform', `translate(${left},0)`)
    .call(axisLeft(y).ticks(yTicks).tickSize(0).tickPadding(8).tickFormat((d) => spec.yFormat(Number(d))))
    .call((g) => g.select('.domain').remove());
  if (spec.yLabel) {
    root.append('text').attr('class', 'yc-unit').attr('x', 0).attr('y', 11).text(spec.yLabel);
  }
  const xTicks = (L.narrow ? spec.xTicksNarrow : spec.xTicks) ?? years.filter((yr) => (yr - first) % 5 === 0);
  root
    .append('g')
    .attr('class', 'yc-axis yc-axis-x')
    .attr('transform', `translate(0,${H - bottom})`)
    .call(
      axisBottom(x)
        .tickValues([...xTicks])
        .tickFormat((d) => (spec.xFormat ? spec.xFormat(Number(d)) : String(d)))
        .tickSizeOuter(0),
    );

  const plot = root.append('g').attr('class', 'yc-plot');
  const defs = svg.append('defs');

  // ── Gap fills ───────────────────────────────────────────────────────────────────────────────────
  for (const g of spec.gaps ?? []) {
    const aY = (i: number): number => y(g.a[i] ?? 0);
    const up = `${id}-${g.key}-up`;
    const dn = `${id}-${g.key}-dn`;
    const idx = years.map((_, i) => i);
    const edge = area<number>().x(X).y1(aY).curve(curveMonotoneX);
    defs.append('clipPath').attr('id', up).append('path').attr('d', edge.y0(0)(idx));
    defs.append('clipPath').attr('id', dn).append('path').attr('d', edge.y0(H)(idx));
    const fill = area<number>()
      .x(X)
      .y0(aY)
      .y1((i) => y(g.b[i] ?? 0))
      .curve(curveMonotoneX)(idx);
    plot.append('path').attr('class', 'yc-gap').attr('d', fill).style('fill', g.fillAbove).attr('clip-path', `url(#${up})`);
    plot.append('path').attr('class', 'yc-gap').attr('d', fill).style('fill', g.fillBelow).attr('clip-path', `url(#${dn})`);
  }

  // ── Areas (to a constant baseline) ──────────────────────────────────────────────────────────────
  for (const a of spec.areas ?? []) {
    const idx = years.map((_, i) => i);
    const d = area<number>()
      .x(X)
      .y0(y(a.bottom))
      .y1((i) => y(a.top[i] ?? a.bottom))
      .curve(curveMonotoneX)(idx);
    plot.append('path').attr('class', 'yc-area').attr('d', d).style('fill', a.fill);
  }

  // ── Bars (2px surface gap between neighbours) ───────────────────────────────────────────────────
  const bw = Math.max(2, step - 2);
  for (const b of spec.bars ?? []) {
    plot
      .append('g')
      .attr('class', 'yc-bars')
      .selectAll('path')
      .data(b.values)
      .join('path')
      .attr('class', 'yc-bar')
      .attr('d', (v, i) => yearBarPath(X(i) - bw / 2, bw, y(0), y(v)))
      .style('fill', (v, i) => b.color(v, i));
  }

  // ── Reference rules ─────────────────────────────────────────────────────────────────────────────
  for (const r of spec.rules ?? []) {
    const ry = y(r.value);
    plot
      .append('line')
      .attr('class', 'yc-rule')
      .attr('x1', x(first - 0.5))
      .attr('x2', x(last + 0.5))
      .attr('y1', ry)
      .attr('y2', ry)
      .style('stroke', () => r.color ?? null)
      .style('stroke-width', () => (r.width === undefined ? null : r.width));
    if (r.label) {
      const atEnd = (r.labelAt ?? 'end') === 'end';
      plot
        .append('text')
        .attr('class', 'yc-rule-label')
        .attr('x', atEnd ? x(last + 0.5) : x(first - 0.5) + 2)
        .attr('y', ry + ((r.labelSide ?? 'above') === 'above' ? -7 : 15))
        .attr('text-anchor', atEnd ? 'end' : 'start')
        .text(r.label);
    }
  }

  // ── Lines ───────────────────────────────────────────────────────────────────────────────────────
  for (const l of spec.lines ?? []) {
    const d = line<number>()
      .x(X)
      .y((i) => y(l.values[i] ?? 0))
      .curve(curveMonotoneX)(years.map((_, i) => i));
    plot
      .append('path')
      .attr('class', 'yc-line')
      .attr('d', d)
      .style('stroke', l.color)
      .style('stroke-width', l.width ?? 2.5);
  }

  // ── Free labels and notes ───────────────────────────────────────────────────────────────────────
  const noteG = root.append('g').attr('class', 'yc-notes');
  for (const lb of spec.labels ?? []) {
    if (lb.wideOnly && L.narrow) continue;
    multiline(
      noteG.append('text').attr('class', `yc-label${lb.strong ? ' is-strong' : ''}`).attr('text-anchor', 'middle'),
      lb.lines,
      x(lb.year),
      y(lb.value),
    );
  }
  for (const n of spec.notes ?? []) {
    if (L.narrow && !n.key) continue;
    const px = X(n.index);
    const py = y(n.value);
    const tx = px + n.dx;
    const ty = py + n.dy;
    if (Math.hypot(n.dx, n.dy) > 14) {
      const len = Math.hypot(n.dx, n.dy);
      noteG
        .append('line')
        .attr('class', 'yc-note-line')
        .attr('x1', px + (n.dx / len) * 5)
        .attr('y1', py + (n.dy / len) * 5)
        .attr('x2', tx)
        .attr('y2', ty + (n.dy < 0 ? 4 : -4));
    }
    const pad = n.anchor === 'start' ? 4 : n.anchor === 'end' ? -4 : 0;
    // Labels above the point grow upward so the connector always meets the text.
    const lines = n.lines.length;
    const baseline = n.dy < 0 ? ty - (lines - 1) * 14 : ty + 12;
    multiline(
      noteG.append('text').attr('class', `yc-note${n.key ? ' is-key' : ''}`).attr('text-anchor', n.anchor),
      n.lines,
      tx + pad,
      baseline,
    );
  }

  // ── End markers ─────────────────────────────────────────────────────────────────────────────────
  const markG = root.append('g').attr('class', 'yc-markers');
  for (const m of spec.markers ?? []) {
    const mx = X(m.index);
    const my = y(m.value);
    markG.append('circle').attr('class', 'yc-marker').attr('cx', mx).attr('cy', my).attr('r', 5).style('fill', m.color);
    if (m.label) {
      markG
        .append('text')
        .attr('class', 'yc-end-label')
        .attr('x', mx + 9)
        .attr('y', my + 5 + (m.labelDy ?? 0))
        .style('fill', m.color)
        .text(m.label);
    }
  }

  // ── Hover layer: nearest year → rule, points, tooltip ───────────────────────────────────────────
  const hoverG = root.append('g').attr('class', 'yc-hover').attr('display', 'none');
  const vline = hoverG.append('line').attr('class', 'yc-hover-line').attr('y1', top - 22).attr('y2', H - bottom);
  const dots = hoverG.append('g');
  const hit = root
    .append('rect')
    .attr('class', 'yc-hit')
    .attr('x', left)
    .attr('y', top - 22)
    .attr('width', Math.max(0, width - left - right))
    .attr('height', H - bottom - top + 22);

  const hide = (): void => {
    hoverG.attr('display', 'none');
    if (tooltip) tooltip.hidden = true;
  };
  const show = (event: PointerEvent): void => {
    const [mx] = pointerIn(event, svgEl, width);
    const year = Math.round(x.invert(mx));
    const i = Math.max(0, Math.min(years.length - 1, year - first));
    const cx = X(i);
    hoverG.attr('display', null);
    vline.attr('x1', cx).attr('x2', cx);
    dots
      .selectAll('circle')
      .data(spec.hoverPoints?.(i) ?? [])
      .join('circle')
      .attr('class', 'yc-hover-dot')
      .attr('r', 5)
      .attr('cx', cx)
      .attr('cy', (p) => y(p.value))
      .style('fill', (p) => p.color);
    if (!tooltip || !spec.tooltip) return;
    const content = spec.tooltip(i);
    const title = document.createElement('strong');
    title.textContent = content.title;
    const rows = content.lines.map((l) => {
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
    tooltip.replaceChildren(title, ...rows);
    tooltip.hidden = false;
    const host = svgEl.parentElement;
    const box = host?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const scale = box.width / width;
    const tw = tooltip.offsetWidth;
    let leftPx = cx * scale + 14;
    if (leftPx + tw > box.width) leftPx = Math.max(0, cx * scale - tw - 14);
    tooltip.style.left = `${Math.round(leftPx)}px`;
    tooltip.style.top = `${Math.round(top * scale)}px`;
  };
  hit.on('pointerenter.yc pointermove.yc pointerdown.yc', show).on('pointerleave.yc', hide);

  // ── Entrance ────────────────────────────────────────────────────────────────────────────────────
  if (!reducedMotion) {
    plot.style('opacity', 0.15).transition().duration(FADE).style('opacity', 1);
  }

  return () => {
    plot.interrupt();
    hit.on('.yc', null);
    hide();
  };
}

function multiline(
  text: ReturnType<typeof select<SVGTextElement, unknown>>,
  lines: readonly string[],
  x0: number,
  y0: number,
): void {
  text.attr('x', x0).attr('y', y0);
  lines.forEach((s, i) => {
    text
      .append('tspan')
      .attr('x', x0)
      .attr('dy', i === 0 ? 0 : 14)
      .text(s);
  });
}

/** Pointer position in viewBox units (the svg may be scaled by CSS). */
function pointerIn(event: PointerEvent, svgEl: SVGSVGElement, width: number): [number, number] {
  const box = svgEl.getBoundingClientRect();
  const k = box.width > 0 ? width / box.width : 1;
  return [(event.clientX - box.left) * k, (event.clientY - box.top) * k];
}

/*
 * renderTimeSeries.ts — pure D3 renderer for values per calendar bucket (day · week · month · year) in one or
 * more stacked panels that share the time axis (small multiples, never a second y-axis). CHANGED (S3-aa): new.
 *
 *   renderTimeSeries(svg, spec, options) → cleanup
 *
 * Each panel has its own value scale and draws, bottom to top: period bands → grid → stacked bars (a segment
 * may be textured) → lines (null = a gap, isolated points stay visible as dots) → notes. One hover layer spans
 * all panels: nearest bucket → highlight + tooltip. Buckets can be partial (the first or last month of the
 * data); such bars are drawn lighter and the tooltip says so.
 *
 * React owns the <svg> element and calls this from useEffect; D3 owns everything inside it. Idempotent: every
 * call redraws the frame from the spec; the plot fades in unless `reducedMotion`. Cleanup stops the fade and
 * detaches listeners.
 * Safety: every string is written with `.text()` / `textContent` — never `.html()`.
 * Accessibility: role="img" + label from the caller; the tooltip is pointer-only and text-only — the table view
 * is the keyboard and screen-reader path.
 */
import { axisBottom, axisLeft, line, scaleLinear, scaleUtc, select } from 'd3';
import { yearBarPath } from './renderYearChart';
import type { YearTooltip } from './renderYearChart';

/** One bucket: [start, end) in epoch ms (UTC). */
export type TsSpan = { start: number; end: number };
export type TsStack = { key: string; color: string; values: readonly number[]; texture?: 'hatch' };
export type TsLine = { key: string; color: string; values: readonly (number | null)[]; width?: number };
export type TsNote = { index: number; value: number; lines: readonly string[]; key?: boolean };
export type TsRule = { value: number; label?: string };
export type TsPanel = {
  key: string;
  /** Drawn above the panel (the unit lives here, e.g. "Missiles launched per month"). */
  title: string;
  yFormat: (value: number) => string;
  /** Upper end of the value axis; default = the largest stack or line value, rounded up (nice). */
  yMax?: number;
  yTicks?: number;
  stacks?: readonly TsStack[];
  lines?: readonly TsLine[];
  rules?: readonly TsRule[];
  notes?: readonly TsNote[];
  /** Relative height (default 1). */
  weight?: number;
};
export type TsBand = { start: number; end: number; label: string; shortLabel: string; panels?: readonly string[] };

export type TsSpec = {
  spans: readonly TsSpan[];
  panels: readonly TsPanel[];
  /** true = the bucket is only partly covered by the data. */
  partial?: readonly boolean[];
  bands?: readonly TsBand[];
  xTicks: readonly number[];
  xTicksNarrow?: readonly number[];
  xFormat: (ms: number) => string;
  tooltip?: (index: number) => YearTooltip;
};

export type TsOptions = {
  width: number;
  reducedMotion: boolean;
  tooltip: HTMLElement | null;
  /** Below this width fewer ticks, only key notes. Default 560. */
  narrowBelow?: number;
};

export type TsPanelLayout = { key: string; top: number; height: number; yMax: number };
export type TsLayout = {
  narrow: boolean;
  height: number;
  left: number;
  right: number;
  bottom: number;
  panels: TsPanelLayout[];
};

const CHAR = 0.58; // average glyph width / font size (Inter) — an estimate, so jsdom needs no layout
const TICK_FONT = 12;
const TITLE_H = 24; // room for a panel title above each panel
const PANEL_GAP = 18;
const FADE = 350;

/** The value-axis maximum of a panel: explicit, else the largest stack total / line value, made "nice". */
export function panelMax(panel: TsPanel, n: number): number {
  if (panel.yMax !== undefined) return panel.yMax;
  let max = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (const s of panel.stacks ?? []) sum += Math.max(0, s.values[i] ?? 0);
    max = Math.max(max, sum);
    for (const l of panel.lines ?? []) max = Math.max(max, l.values[i] ?? 0);
  }
  for (const r of panel.rules ?? []) max = Math.max(max, r.value);
  const nice = scaleLinear().domain([0, max || 1]).nice(panel.yTicks ?? 4).domain()[1] ?? 1;
  return nice;
}

export function layoutTimeSeries(spec: TsSpec, width: number, narrowBelow = 560): TsLayout {
  const narrow = width < narrowBelow;
  const n = spec.spans.length;
  const maxes = spec.panels.map((p) => panelMax(p, n));
  const longest = Math.max(
    1,
    ...spec.panels.flatMap((p, i) =>
      scaleLinear()
        .domain([0, maxes[i] ?? 1])
        .ticks(p.yTicks ?? 4)
        .map((t) => p.yFormat(t).length),
    ),
  );
  const plotH = (narrow ? 240 : 320) * Math.min(2, Math.max(1, spec.panels.length * 0.75));
  const weights = spec.panels.map((p) => p.weight ?? 1);
  const wsum = weights.reduce((s, w) => s + w, 0) || 1;
  const usable = plotH - spec.panels.length * TITLE_H - (spec.panels.length - 1) * PANEL_GAP;
  let top = 0;
  const panels = spec.panels.map((p, i) => {
    top += TITLE_H;
    const height = Math.round((usable * (weights[i] ?? 1)) / wsum);
    const out = { key: p.key, top, height, yMax: maxes[i] ?? 1 };
    top += height + PANEL_GAP;
    return out;
  });
  const bottom = 28;
  return {
    narrow,
    height: top - PANEL_GAP + bottom,
    left: Math.ceil(longest * TICK_FONT * CHAR) + 12,
    right: 12,
    bottom,
    panels,
  };
}

let uid = 0;

export function renderTimeSeries(svgEl: SVGSVGElement, spec: TsSpec, options: TsOptions): () => void {
  const { width, reducedMotion, tooltip } = options;
  const L = layoutTimeSeries(spec, width, options.narrowBelow);
  const spans = spec.spans;
  const n = spans.length;
  const id = `ts${++uid}`;

  const svg = select(svgEl);
  svg.interrupt();
  svg.selectAll('*').remove();
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);
  if (n === 0) return () => {};

  const x = scaleUtc()
    .domain([new Date(spans[0]!.start), new Date(spans[n - 1]!.end)])
    .range([L.left, width - L.right]);
  const X0 = (i: number): number => x(new Date(spans[i]!.start));
  const X1 = (i: number): number => x(new Date(spans[i]!.end));
  const XM = (i: number): number => (X0(i) + X1(i)) / 2;
  const barW = (width - L.left - L.right) / n;
  const gap = barW >= 5 ? 1 : 0; // 2px surface gap between neighbours when bars are wide enough
  const plotTop = (L.panels[0]?.top ?? 0) - 6;
  const plotBottom = L.height - L.bottom;

  const defs = svg.append('defs');
  const root = svg.append('g').attr('class', 'ts-root');
  const plot = root.append('g').attr('class', 'ts-plot');

  // ── Bands (behind everything, across the panels they name) ────────────────────────────────────────
  const bandG = root.insert('g', '.ts-plot').attr('class', 'ts-bands');
  for (const b of spec.bands ?? []) {
    const x0 = Math.max(L.left, x(new Date(b.start)));
    const x1 = Math.min(width - L.right, x(new Date(b.end)));
    if (x1 <= x0) continue;
    const targets = L.panels.filter((p) => !b.panels || b.panels.includes(p.key));
    for (const [k, p] of targets.entries()) {
      bandG.append('rect').attr('class', 'yc-band yc-band-2 ts-band').attr('x', x0).attr('width', x1 - x0).attr('y', p.top).attr('height', p.height);
      if (k === 0) {
        const label = L.narrow || b.label.length * 11 * 0.62 > x1 - x0 - 8 ? b.shortLabel : b.label;
        bandG.append('text').attr('class', 'yc-band-label ts-band-label').attr('x', x1 - 4).attr('y', p.top + 12).attr('text-anchor', 'end').text(label);
      }
    }
  }

  // ── Panels ──────────────────────────────────────────────────────────────────────────────────────────
  const noteG = root.append('g').attr('class', 'ts-notes');
  spec.panels.forEach((panel, pi) => {
    const P = L.panels[pi]!;
    const y = scaleLinear().domain([0, P.yMax]).range([P.top + P.height, P.top]);
    const ticks = panel.yTicks ?? (L.narrow ? 3 : 4);
    root
      .append('text')
      .attr('class', 'yc-unit ts-title')
      .attr('x', 0)
      .attr('y', P.top - 10)
      .text(panel.title);
    root
      .insert('g', '.ts-plot')
      .attr('class', 'yc-grid')
      .attr('transform', `translate(${L.left},0)`)
      .call(axisLeft(y).ticks(ticks).tickSize(-(width - L.left - L.right)).tickFormat(() => ''))
      .call((g) => g.select('.domain').remove());
    root
      .append('g')
      .attr('class', 'yc-axis yc-axis-y')
      .attr('transform', `translate(${L.left},0)`)
      .call(axisLeft(y).ticks(ticks).tickSize(0).tickPadding(8).tickFormat((d) => panel.yFormat(Number(d))))
      .call((g) => g.select('.domain').remove());
    root
      .append('line')
      .attr('class', 'ts-baseline')
      .attr('x1', L.left)
      .attr('x2', width - L.right)
      .attr('y1', y(0))
      .attr('y2', y(0));

    const pg = plot.append('g').attr('class', 'ts-panel').attr('data-panel', panel.key);

    // Stacked bars: segments bottom → top; the top segment of a bar gets the 4px rounded data end.
    const stacks = panel.stacks ?? [];
    for (const s of stacks) {
      if (s.texture !== 'hatch') continue;
      const pid = `${id}-${panel.key}-${s.key}`;
      const pat = defs
        .append('pattern')
        .attr('id', pid)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 5)
        .attr('height', 5)
        .attr('patternTransform', 'rotate(45)');
      pat.append('rect').attr('width', 5).attr('height', 5).attr('class', 'ts-hatch-bg');
      pat.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 5).style('stroke', s.color).attr('stroke-width', 2.5);
    }
    if (stacks.length) {
      const segs: { i: number; key: string; y0: number; y1: number; fill: string; hatch: boolean; top: boolean }[] = [];
      for (let i = 0; i < n; i++) {
        let cum = 0;
        let lastIdx = -1;
        stacks.forEach((s, k) => {
          if ((s.values[i] ?? 0) > 0) lastIdx = k;
        });
        stacks.forEach((s, k) => {
          const v = Math.max(0, s.values[i] ?? 0);
          if (v <= 0) return;
          const fill = s.texture === 'hatch' ? `url(#${id}-${panel.key}-${s.key})` : s.color;
          segs.push({ i, key: s.key, y0: y(cum), y1: y(cum + v), fill, hatch: s.texture === 'hatch', top: k === lastIdx });
          cum += v;
        });
      }
      pg.append('g')
        .attr('class', 'ts-bars')
        .selectAll('path')
        .data(segs)
        .join('path')
        .attr('class', (d) => `ts-seg${spec.partial?.[d.i] ? ' is-partial' : ''}${gap ? ' has-gap' : ''}`)
        .attr('data-key', (d) => d.key)
        .attr('d', (d) => {
          const x0 = X0(d.i) + gap;
          const w = Math.max(0.6, X1(d.i) - X0(d.i) - 2 * gap);
          if (d.top && w >= 6) return yearBarPath(x0, w, d.y0, d.y1);
          return `M${x0},${d.y0}V${d.y1}H${x0 + w}V${d.y0}Z`;
        })
        // Solid colours are CSS variables (style, so a theme switch repaints); a texture is a paint server (attribute).
        .attr('fill', (d) => (d.hatch ? d.fill : null))
        .style('fill', (d) => (d.hatch ? null : d.fill));
    }

    for (const r of panel.rules ?? []) {
      const ry = y(r.value);
      pg.append('line').attr('class', 'yc-rule ts-rule').attr('x1', L.left).attr('x2', width - L.right).attr('y1', ry).attr('y2', ry);
      if (r.label) pg.append('text').attr('class', 'yc-rule-label').attr('x', width - L.right).attr('y', ry - 6).attr('text-anchor', 'end').text(r.label);
    }

    // Lines with gaps; points that have no neighbour stay visible as dots.
    for (const l of panel.lines ?? []) {
      const defined = (i: number): boolean => l.values[i] !== null && l.values[i] !== undefined;
      const d = line<number>()
        .defined(defined)
        .x(XM)
        .y((i) => y(l.values[i] ?? 0))(spans.map((_, i) => i));
      pg.append('path').attr('class', 'yc-line ts-line').attr('data-key', l.key).attr('d', d).style('stroke', l.color).style('stroke-width', l.width ?? 2);
      const dots = spans
        .map((_, i) => i)
        .filter((i) => defined(i) && (n <= 60 || (!defined(i - 1) && !defined(i + 1))));
      pg.append('g')
        .attr('class', 'ts-dots')
        .selectAll('circle')
        .data(dots)
        .join('circle')
        .attr('class', 'ts-dot')
        .attr('r', n <= 60 ? 3 : 2.5)
        .attr('cx', XM)
        .attr('cy', (i) => y(l.values[i] ?? 0))
        .style('fill', l.color);
    }

    // Notes: short labels above a bucket, pointing inwards so they never leave the plot.
    for (const note of panel.notes ?? []) {
      if (L.narrow && !note.key) continue;
      if (note.index < 0 || note.index >= n) continue;
      const px = XM(note.index);
      const py = Math.max(P.top + 12, y(note.value) - 8 - (note.lines.length - 1) * 14);
      const anchor = px > (L.left + width - L.right) * 0.62 ? 'end' : 'start';
      const tx = anchor === 'end' ? px - 6 : px + 6;
      const text = noteG.append('text').attr('class', `yc-note ts-note${note.key ? ' is-key' : ''}`).attr('text-anchor', anchor).attr('x', tx).attr('y', py);
      note.lines.forEach((s, k) => text.append('tspan').attr('x', tx).attr('dy', k === 0 ? 0 : 14).text(s));
      noteG
        .append('line')
        .attr('class', 'yc-note-line')
        .attr('x1', px)
        .attr('x2', px)
        .attr('y1', y(note.value) - 3)
        .attr('y2', Math.min(y(note.value) - 3, py + (note.lines.length - 1) * 14 + 4));
    }
  });

  // ── Time axis (under the last panel) ────────────────────────────────────────────────────────────────
  const ticks = (L.narrow ? spec.xTicksNarrow : undefined) ?? spec.xTicks;
  root
    .append('g')
    .attr('class', 'yc-axis yc-axis-x')
    .attr('transform', `translate(0,${plotBottom})`)
    .call(
      axisBottom(x)
        .tickValues(ticks.map((t) => new Date(t)))
        .tickFormat((d) => spec.xFormat((d as Date).getTime()))
        .tickSizeOuter(0),
    );

  // ── Hover: nearest bucket → highlight across panels + tooltip ───────────────────────────────────────
  const hoverG = root.append('g').attr('class', 'ts-hover').attr('display', 'none');
  const hl = hoverG.append('rect').attr('class', 'ts-hover-band').attr('y', plotTop).attr('height', plotBottom - plotTop);
  const hit = root
    .append('rect')
    .attr('class', 'yc-hit')
    .attr('x', L.left)
    .attr('y', plotTop)
    .attr('width', Math.max(0, width - L.left - L.right))
    .attr('height', plotBottom - plotTop);

  const hide = (): void => {
    hoverG.attr('display', 'none');
    if (tooltip) tooltip.hidden = true;
  };
  const indexAt = (px: number): number => {
    const t = x.invert(px).getTime();
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (spans[mid]!.start <= t) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const show = (event: PointerEvent): void => {
    const [mx] = pointerIn(event, svgEl, width);
    const i = indexAt(mx);
    const x0 = X0(i);
    hoverG.attr('display', null);
    hl.attr('x', x0).attr('width', Math.max(2, X1(i) - x0));
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
    const box = svgEl.parentElement?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const scale = box.width / width;
    const tw = tooltip.offsetWidth;
    const cx = XM(i) * scale;
    let leftPx = cx + 14;
    if (leftPx + tw > box.width) leftPx = Math.max(0, cx - tw - 14);
    tooltip.style.left = `${Math.round(leftPx)}px`;
    tooltip.style.top = `${Math.round(plotTop * scale)}px`;
  };
  hit.on('pointerenter.ts pointermove.ts pointerdown.ts', show).on('pointerleave.ts', hide);

  if (!reducedMotion) plot.style('opacity', 0.15).transition().duration(FADE).style('opacity', 1);

  return () => {
    plot.interrupt();
    hit.on('.ts', null);
    hide();
  };
}

/** Pointer position in viewBox units (the svg may be scaled by CSS). */
function pointerIn(event: PointerEvent, svgEl: SVGSVGElement, width: number): [number, number] {
  const box = svgEl.getBoundingClientRect();
  const k = box.width > 0 ? width / box.width : 1;
  return [(event.clientX - box.left) * k, (event.clientY - box.top) * k];
}

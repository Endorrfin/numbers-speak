/*
 * renderTree.ts — pure D3 renderer for a small left-to-right tree (d3-hierarchy's tidy tree).
 * CHANGED (S3-ai2): new (ai-models, angle E — which models were built on a company's models).
 *
 *   renderTree(svg, roots, options) → cleanup
 *
 * The caller passes the visible forest, already cut to size (a "+n more" leaf stands for what is left out); the
 * renderer adds an invisible root, lays the forest out one column per depth and draws curved links. Labels are cut to
 * the column width with an ellipsis; the full text is the node's <title> (and the table view lists every model).
 * Nodes marked `more` are drawn as plain text, no dot.
 *
 * d3-hierarchy is imported from its own package, not the `d3` umbrella, so it stays in this page's chunk
 * (vite.config.ts PAGE_ONLY_D3).
 * Safety: text is written with `.text()` / `textContent` only. The whole SVG is redrawn per call (idempotent).
 */
import { select } from 'd3';
import { hierarchy, tree } from 'd3-hierarchy';
import type { HierarchyPointNode } from 'd3-hierarchy';

export type TreeDatum = {
  key: string;
  label: string;
  /** A second, quieter line of text (e.g. maker · year). */
  sub?: string;
  /** Full text for the node's <title>. */
  title?: string;
  /** "+n more": text only. */
  more?: boolean;
  children?: TreeDatum[];
};

export type TreeOptions = { width: number };
export type TreeLayout = { phone: boolean; rowH: number; colW: number; left: number; top: number; height: number; depth: number };

const FONT = 12;
const CHAR = 0.56;
const ROOT_KEY = '(root)';

/** Cuts `text` to fit `max` px at the label font (exported for tests). */
export function fitLabel(text: string, max: number): string {
  const n = Math.floor(max / (FONT * CHAR));
  if (text.length <= n) return text;
  return n <= 1 ? '…' : `${text.slice(0, n - 1).trimEnd()}…`;
}

const depthOf = (d: TreeDatum): number => 1 + Math.max(0, ...(d.children ?? []).map(depthOf));
const leaves = (d: TreeDatum): number => (d.children?.length ? d.children.reduce((s, c) => s + leaves(c), 0) : 1);

export function layoutTree(width: number, roots: readonly TreeDatum[]): TreeLayout {
  const phone = width < 560;
  const depth = Math.max(1, ...roots.map(depthOf));
  const rowH = phone ? 34 : 30;
  const left = 10;
  const colW = Math.max(60, (width - left - 8) / depth);
  const rows = roots.reduce((s, r) => s + leaves(r), 0);
  return { phone, rowH, colW, left, top: rowH / 2, height: Math.max(rowH, rows * rowH), depth };
}

export function renderTree(svgEl: SVGSVGElement, roots: readonly TreeDatum[], options: TreeOptions): () => void {
  const L = layoutTree(options.width, roots);
  const svg = select(svgEl);
  svg.selectAll('*').remove();
  svg.attr('width', options.width).attr('height', L.height).attr('viewBox', `0 0 ${options.width} ${L.height}`);
  if (roots.length === 0) return () => undefined;

  const root = hierarchy<TreeDatum>({ key: ROOT_KEY, label: '', children: [...roots] });
  const laid = tree<TreeDatum>().nodeSize([L.rowH, L.colW]).separation(() => 1)(root);
  const nodes = laid.descendants().filter((n) => n.depth > 0);
  const minX = Math.min(...nodes.map((n) => n.x));
  // The tree's x is the row (vertical), y the depth (horizontal); depth 1 sits in the first column.
  const px = (n: HierarchyPointNode<TreeDatum>): number => L.left + (n.depth - 1) * L.colW;
  const py = (n: HierarchyPointNode<TreeDatum>): number => L.top + n.x - minX;

  svg
    .append('g')
    .attr('class', 'tr-links')
    .selectAll('path')
    .data(laid.links().filter((l) => l.source.depth > 0))
    .join('path')
    .attr('class', (l) => (l.target.data.more ? 'tr-link is-more' : 'tr-link'))
    .attr('d', (l) => {
      const x0 = px(l.source) + 4;
      const y0 = py(l.source);
      const x1 = px(l.target) - 4;
      const y1 = py(l.target);
      const mx = (x0 + x1) / 2;
      return `M${x0},${y0}C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
    });

  const g = svg
    .append('g')
    .attr('class', 'tr-nodes')
    .selectAll<SVGGElement, HierarchyPointNode<TreeDatum>>('g')
    .data(nodes, (n) => n.data.key)
    .join('g')
    .attr('class', (n) => (n.data.more ? 'tr-node is-more' : n.depth === 1 ? 'tr-node is-root' : 'tr-node'))
    .attr('transform', (n) => `translate(${px(n)},${py(n)})`);
  g.append('title').text((n) => n.data.title ?? n.data.label);
  g.filter((n) => !n.data.more)
    .append('circle')
    .attr('class', 'tr-dot')
    .attr('r', 3.5);
  const room = L.colW - 18;
  g.append('text')
    .attr('class', 'tr-label')
    .attr('x', 8)
    .attr('y', (n) => (n.data.sub ? -3 : 0))
    .attr('dy', '0.35em')
    .text((n) => fitLabel(n.data.label, room));
  g.filter((n) => Boolean(n.data.sub))
    .append('text')
    .attr('class', 'tr-sub')
    .attr('x', 8)
    .attr('y', 10)
    .attr('dy', '0.35em')
    .text((n) => fitLabel(n.data.sub ?? '', room));

  return () => undefined;
}

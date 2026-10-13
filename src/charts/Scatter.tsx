// Scatter.tsx — React wrapper of the scatter renderer (CHANGED (S3-re): new): measures the container, respects
// reduced motion and re-renders only when points or options change (callers memoize both).
// CHANGED (S3-ai1): opt-in `segments` and `zoom` (renderScatter.ts); with `zoom` the wrapper adds the + − ⟲ buttons —
// the keyboard path to the zoom — and a one-line hint. Without either prop the markup is unchanged.
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderScatter } from './renderScatter';
import type { ScatterAxis, ScatterPoint, ScatterSegment, ScatterZoom, ScatterZoomControls } from './renderScatter';

export type ScatterZoomProps = {
  xTicks: (domain: [number, number]) => number[];
  yTicks: (domain: [number, number]) => number[];
  /** scatterZoom.ts' attachScatterZoom — passed by the page, so d3-zoom loads only where a chart zooms. */
  attach: ScatterZoom['attach'];
  labels: { zoomIn: string; zoomOut: string; reset: string; group: string; hint: string };
};

type Props = {
  points: readonly ScatterPoint[];
  /** Accessible name of the chart (role="img"). */
  label: string;
  x: ScatterAxis;
  y: ScatterAxis;
  guides?: { x?: number; y?: number };
  quadrants?: readonly [string, string, string, string];
  segments?: readonly ScatterSegment[];
  zoom?: ScatterZoomProps;
};

const STEP = 1.6;

export function Scatter({ points, label, x, y, guides, quadrants, segments, zoom }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const controls = useRef<ScatterZoomControls | null>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();
  const xTicks = zoom?.xTicks;
  const yTicks = zoom?.yTicks;
  const attach = zoom?.attach;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    const zoomOpt = xTicks && yTicks && attach ? { xTicks, yTicks, attach, controls } : undefined;
    return renderScatter(svg, points, { width, reducedMotion, tooltip: tipRef.current, x, y, guides, quadrants, segments, zoom: zoomOpt });
  }, [points, width, reducedMotion, x, y, guides, quadrants, segments, xTicks, yTicks, attach]);

  return (
    <>
      {zoom && (
        <div className="sc-zoom" role="group" aria-label={zoom.labels.group}>
          <button type="button" className="btn btn-ghost btn-icon" aria-label={zoom.labels.zoomIn} title={zoom.labels.zoomIn} onClick={() => controls.current?.zoomBy(STEP)}>
            +
          </button>
          <button type="button" className="btn btn-ghost btn-icon" aria-label={zoom.labels.zoomOut} title={zoom.labels.zoomOut} onClick={() => controls.current?.zoomBy(1 / STEP)}>
            −
          </button>
          <button type="button" className="btn btn-ghost btn-icon" aria-label={zoom.labels.reset} title={zoom.labels.reset} onClick={() => controls.current?.reset()}>
            ⟲
          </button>
          <span className="sc-zoom-hint muted">{zoom.labels.hint}</span>
        </div>
      )}
      <div ref={wrapRef} className="chart chart-scatter">
        <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
        <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
      </div>
    </>
  );
}

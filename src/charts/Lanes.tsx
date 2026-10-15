// Lanes.tsx — React wrapper of the lanes renderer (CHANGED (S3-ai1): new): measures the container and redraws when the
// lanes, points or spans change (callers memoize them). The brush reports through `onBrush`; the page owns the span.
import { useEffect, useRef } from 'react';
import { useElementWidth } from './hooks';
import { renderLanes } from './renderLanes';
import type { LaneEvent, LanePoint, LaneRow } from './renderLanes';

type Props = {
  lanes: readonly LaneRow[];
  points: readonly LanePoint[];
  /** Accessible name of the chart (role="img"). */
  label: string;
  domain: [number, number];
  view: [number, number];
  formatTick: (t: number, fine: boolean) => string;
  onBrush?: (span: [number, number] | null) => void;
  /** CHANGED (S3-ai3): optional event lines (memoized by the caller). */
  events?: readonly LaneEvent[];
};

export function Lanes({ lanes, points, label, domain, view, formatTick, onBrush, events }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const [d0, d1] = domain;
  const [v0, v1] = view;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderLanes(svg, lanes, points, { width, tooltip: tipRef.current, domain: [d0, d1], view: [v0, v1], formatTick, onBrush, events });
  }, [lanes, points, width, d0, d1, v0, v1, formatTick, onBrush, events]);

  return (
    <div ref={wrapRef} className="chart chart-lanes">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}

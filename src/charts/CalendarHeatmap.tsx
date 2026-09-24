// CalendarHeatmap.tsx — React wrapper of the calendar-heatmap renderer (CHANGED (S3-aa3): new).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderCalendarHeatmap } from './renderCalendarHeatmap';
import type { ChSpec } from './renderCalendarHeatmap';

type Props = {
  spec: ChSpec;
  /** Accessible name of the chart (role="img"). */
  label: string;
};

export function CalendarHeatmap({ spec, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderCalendarHeatmap(svg, spec, { width, reducedMotion, tooltip: tipRef.current });
  }, [spec, width, reducedMotion]);

  return (
    <div ref={wrapRef} className="chart chart-year chart-calendar">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}

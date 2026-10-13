// Milestones.tsx — React wrapper of the milestones renderer (CHANGED (S3-ai2): new): measures the container and
// redraws when the series or the axes change (callers memoize them).
import { useEffect, useRef } from 'react';
import { useElementWidth } from './hooks';
import { renderMilestones } from './renderMilestones';
import type { MilestoneSeries, MilestonesOptions } from './renderMilestones';

type Props = {
  series: readonly MilestoneSeries[];
  /** Accessible name of the chart (role="img"). */
  label: string;
  x: MilestonesOptions['x'];
  y: MilestonesOptions['y'];
};

export function Milestones({ series, label, x, y }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderMilestones(svg, series, { width, tooltip: tipRef.current, x, y });
  }, [series, width, x, y]);

  return (
    <div ref={wrapRef} className="chart chart-milestones">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}

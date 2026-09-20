// Strip.tsx — React wrapper of the 100 % strip renderer (CHANGED (S3-tl): new).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderStrip } from './renderStrip';
import type { StripOptions, StripSegment } from './renderStrip';

type Props = {
  segments: readonly StripSegment[];
  /** Accessible name of the chart (role="img"). */
  label: string;
} & Pick<StripOptions, 'ticks' | 'barHeight'>;

export function Strip({ segments, label, ticks, barHeight }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderStrip(svg, segments, { width, reducedMotion, ticks, barHeight, tooltip: tipRef.current });
  }, [segments, width, reducedMotion, ticks, barHeight]);

  return (
    <div ref={wrapRef} className="chart chart-strip">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}

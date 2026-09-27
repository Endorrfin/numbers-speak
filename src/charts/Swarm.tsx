// Swarm.tsx — React wrapper of the beeswarm renderer (CHANGED (S3-re): new).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderSwarm } from './renderSwarm';
import type { SwarmPoint, SwarmRef } from './renderSwarm';

type Props = {
  points: readonly SwarmPoint[];
  label: string;
  log: boolean;
  domain: [number, number];
  ticks: number[];
  format: (value: number) => string;
  axisLabel: string;
  refs?: readonly SwarmRef[];
};

export function Swarm({ points, label, log, domain, ticks, format, axisLabel, refs }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderSwarm(svg, points, { width, reducedMotion, tooltip: tipRef.current, log, domain, ticks, format, axisLabel, refs });
  }, [points, width, reducedMotion, log, domain, ticks, format, axisLabel, refs]);

  return (
    <div ref={wrapRef} className="chart chart-swarm">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}

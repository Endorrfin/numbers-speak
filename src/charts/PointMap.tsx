// PointMap.tsx — React wrapper of the point-map renderer (CHANGED (S3-re): new).
import { useEffect, useRef } from 'react';
import { useElementWidth } from './hooks';
import { renderPointMap } from './renderPointMap';
import type { LandFrame, MapPoint } from './renderPointMap';

type Props = { points: readonly MapPoint[]; label: string; land: LandFrame; focus?: readonly string[] };

export function PointMap({ points, label, land, focus }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderPointMap(svg, points, { width, tooltip: tipRef.current, land, focus });
  }, [points, width, land, focus]);

  return (
    <div ref={wrapRef} className="chart chart-map">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}

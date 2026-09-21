// BarRace.tsx — React wrapper of the bar-race renderer (CHANGED (S3-br): new). Measures the container and
// draws the current frame; the page owns the clock (play / pause / scrub) and passes one frame at a time.
import { useEffect, useRef } from 'react';
import { useElementWidth } from './hooks';
import { renderBarRace } from './renderBarRace';
import type { BarRaceRow } from './renderBarRace';

type Props = {
  rows: readonly BarRaceRow[];
  slots: number;
  /** ms; the frame interval while playing, 0 when scrubbing or with reduced motion. */
  duration: number;
  ticker: string;
  longestLabel: string;
  longestValue: string;
  valueFormat: (value: number) => string;
  tickFormat: (value: number) => string;
  /** Accessible name of the chart (role="img"). */
  label: string;
};

export function BarRace({ rows, slots, duration, ticker, longestLabel, longestValue, valueFormat, tickFormat, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderBarRace(svg, rows, {
      width,
      slots,
      duration,
      ticker,
      longestLabel,
      longestValue,
      valueFormat,
      tickFormat,
      tooltip: tipRef.current,
    });
  }, [rows, width, slots, duration, ticker, longestLabel, longestValue, valueFormat, tickFormat]);

  return (
    <div ref={wrapRef} className="chart chart-bar-race">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}

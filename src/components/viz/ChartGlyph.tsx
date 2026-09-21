// Decorative glyph per chart kind — the card thumbnail until real thumbnails arrive (P5).
import type { ReactElement } from 'react';
import type { ChartKind } from '../../catalog/types';

const bars = (values: number[], horizontal = false): ReactElement[] =>
  values.map((v, i) =>
    horizontal ? (
      <rect key={i} x={10} y={12 + i * 13} width={v} height={9} rx={2} />
    ) : (
      <rect key={i} x={14 + i * 17} y={70 - v} width={11} height={v} rx={2} />
    ),
  );

const GLYPHS: Readonly<Record<ChartKind, ReactElement>> = {
  'ranked-bar': <g className="g-fill">{bars([76, 60, 48, 34, 22], true)}</g>,
  'bar-race': (
    <g className="g-fill">
      {bars([52, 70, 38, 60, 26], true)}
      <path className="g-stroke" d="M90 8v64" strokeDasharray="3 3" />
    </g>
  ),
  tree: (
    <g className="g-stroke">
      <path d="M16 40h16M32 40V20h16M32 40v20h16M48 20h14M48 60h14M48 20v10h14" />
      <circle className="g-fill" cx="16" cy="40" r="4" />
      <circle className="g-fill" cx="48" cy="20" r="3.5" />
      <circle className="g-fill" cx="48" cy="60" r="3.5" />
      <circle cx="66" cy="20" r="3" />
      <circle cx="66" cy="30" r="3" />
      <circle cx="66" cy="60" r="3" />
    </g>
  ),
  line: (
    <g className="g-stroke">
      <path d="M10 62 L28 50 L44 54 L60 30 L76 34 L92 14" />
      <path className="g-soft" d="M10 66 L28 60 L44 44 L60 48 L76 40 L92 36" />
    </g>
  ),
  combo: (
    <g>
      <g className="g-fill g-dim">{bars([20, 34, 46, 58])}</g>
      <path className="g-stroke" d="M20 52 L37 44 L54 30 L71 16" />
    </g>
  ),
  bar: <g className="g-fill">{bars([30, 52, 42, 64, 24])}</g>,
  'grouped-bar': (
    <g className="g-fill">
      <rect x="12" y="30" width="9" height="40" rx="2" />
      <rect className="g-dim" x="22" y="44" width="9" height="26" rx="2" />
      <rect x="40" y="20" width="9" height="50" rx="2" />
      <rect className="g-dim" x="50" y="36" width="9" height="34" rx="2" />
      <rect x="68" y="40" width="9" height="30" rx="2" />
      <rect className="g-dim" x="78" y="28" width="9" height="42" rx="2" />
    </g>
  ),
  pyramid: (
    <g className="g-fill">
      {[34, 30, 26, 22, 16, 10].map((w, i) => (
        <g key={i}>
          <rect x={50 - w} y={10 + i * 10} width={w} height={8} rx={1.5} />
          <rect className="g-dim" x={51} y={10 + i * 10} width={w - 2} height={8} rx={1.5} />
        </g>
      ))}
    </g>
  ),
  donut: (
    <g fill="none" strokeWidth="12">
      <circle className="g-ring" cx="50" cy="40" r="24" />
      <circle className="g-ring-accent" cx="50" cy="40" r="24" strokeDasharray="60 151" transform="rotate(-90 50 40)" />
    </g>
  ),
  lollipop: (
    <g className="g-stroke">
      {[56, 40, 30, 22, 14].map((v, i) => (
        <g key={i}>
          <path d={`M10 ${14 + i * 13}h${v}`} />
          <circle className="g-fill" cx={10 + v} cy={14 + i * 13} r="4" />
        </g>
      ))}
    </g>
  ),
  map: (
    <g>
      <path className="g-stroke" d="M14 30 L30 18 L52 22 L72 14 L88 26 L84 50 L62 64 L36 60 L18 48 Z" />
      {[
        [34, 34],
        [46, 40],
        [58, 30],
        [66, 46],
        [42, 52],
      ].map(([x, y], i) => (
        <circle key={i} className="g-fill" cx={x} cy={y} r="3" />
      ))}
    </g>
  ),
  // CHANGED (S3-tl): unit grid — rows of squares, the first run filled.
  waffle: (
    <g className="g-fill">
      {Array.from({ length: 40 }, (_, i) => (
        <rect key={i} className={i < 17 ? undefined : 'g-dim'} x={14 + (i % 8) * 9.5} y={14 + Math.floor(i / 8) * 11} width={7.5} height={8.5} rx={1.2} />
      ))}
    </g>
  ),
  // CHANGED (S3-bdd2): butterfly — bars back to back around a centre line (births ← | → deaths).
  butterfly: (
    <g className="g-fill">
      <path className="g-stroke" d="M50 8v64" />
      {[
        [30, 18],
        [22, 12],
        [16, 26],
        [11, 8],
        [7, 15],
      ].map(([l, r], i) => (
        <g key={i}>
          <rect x={46 - l!} y={14 + i * 11} width={l} height={8} rx={2} />
          <rect className="g-dim" x={54} y={14 + i * 11} width={r} height={8} rx={2} />
        </g>
      ))}
    </g>
  ),
};

export function ChartGlyph({ kind }: { kind: ChartKind }) {
  return (
    <svg className="glyph" viewBox="0 0 100 80" width="100%" height="100%" focusable="false">
      {GLYPHS[kind]}
    </svg>
  );
}

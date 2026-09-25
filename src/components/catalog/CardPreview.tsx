// CardPreview.tsx — CHANGED (S3-th): the gallery card image drawn from the entry's own data (the JSON made
// by scripts/gen-previews.ts). Marks are SVG painted with the chart colour tokens (both themes follow the
// CSS variables); every word and number is HTML text. The whole block is decorative on the card
// (aria-hidden in VizCard): the card's title and subtitle carry the meaning for assistive technology.
import { Fragment, type ReactElement } from 'react';
import type {
  ButterflyMarks,
  CardPreview as CardPreviewData,
  ColumnsMarks,
  GridMarks,
  PreviewTone,
  RowsMarks,
  SeriesMarks,
} from '../../catalog/preview';
import type { Lang, Localized } from '../../catalog/types';
import { pick, useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { flagUrl } from '../../lib/countries';
import { formatNumber } from '../../lib/format';
import { formatKeyLabel, formatKeyValue, formatPeriodEnd, formatPreviewNum } from './previewFormat';

const color = (tone: PreviewTone): string => `var(--c-${tone})`;
const W = 100;
const H = 60;
const pct = (v: number): string => `${Math.round(v * 1000) / 10}%`;

function Flag({ code }: { code: string }) {
  const src = flagUrl(code);
  return src ? <img className="cp-flag" src={src} alt="" width={16} height={12} loading="lazy" decoding="async" /> : null;
}

/** A horizontal bar in a 100-unit box, from `from` (0–1) to `to` (0–1). */
function Bar({ from = 0, to, tone }: { from?: number; to: number; tone: PreviewTone }) {
  const x = Math.max(0, Math.min(1, from)) * W;
  const w = Math.max(1, (Math.max(0, Math.min(1, to)) - Math.max(0, from)) * W);
  return (
    <svg className="cp-bar" viewBox={`0 0 ${W} 10`} preserveAspectRatio="none" focusable="false">
      <rect x={x} width={w} height={10} rx={1.5} style={{ fill: color(tone) }} />
    </svg>
  );
}

function Legend({ items, tones }: { items: readonly Localized[]; tones: readonly PreviewTone[] }) {
  const { lang } = useLang();
  return (
    <ul className="cp-legend">
      {items.map((l, i) => (
        <li key={i}>
          <i style={{ background: color(tones[i]!) }} />
          {pick(l, lang)}
        </li>
      ))}
    </ul>
  );
}

function Axis({ from, to, lang }: { from: string; to: string; lang: Lang }) {
  return (
    <div className="cp-axis">
      <span>{formatPeriodEnd(from, lang)}</span>
      <span>{formatPeriodEnd(to, lang)}</span>
    </div>
  );
}

function Rows({ m }: { m: RowsMarks }) {
  const { lang, t } = useLang();
  const [lo, hi] = m.domain;
  const flags = m.rows.some((r) => r.flag);
  return (
    <div className={flags ? 'cp-rows' : 'cp-rows cp-rows--noflags'}>
      {m.rows.map((r, i) => (
        <Fragment key={i}>
          {m.gap && i === m.gap.after && (
            <span className="cp-gap">{fill(t(ui.previewMore), { n: formatNumber(m.gap.count, lang) })}</span>
          )}
          {flags && <span className="cp-flag-slot">{r.flag && r.code ? <Flag code={r.code} /> : null}</span>}
          <span className="cp-code">{r.code ?? (r.name ? pick(r.name, lang) : '')}</span>
          <Bar to={(r.value - lo) / (hi - lo)} tone={r.tone} />
          <span className="cp-num">{formatPreviewNum(r.value, m.format, lang)}</span>
        </Fragment>
      ))}
    </div>
  );
}

function Butterfly({ m }: { m: ButterflyMarks }) {
  const flags = m.rows.some((r) => r.flag);
  return (
    <>
      <Legend items={m.legend} tones={m.tones} />
      <div className={flags ? 'cp-bfly' : 'cp-bfly cp-rows--noflags'}>
        {m.rows.map((r, i) => (
          <Fragment key={i}>
            {flags && <span className="cp-flag-slot">{r.flag ? <Flag code={r.code} /> : null}</span>}
            <span className="cp-code">{r.code}</span>
            <Bar from={1 - r.left / m.max} to={1} tone={m.tones[0]} />
            <Bar to={r.right / m.max} tone={m.tones[1]} />
          </Fragment>
        ))}
      </div>
    </>
  );
}

function linePath(values: readonly (number | null)[], max: number): string {
  const n = values.length;
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    const x = n > 1 ? (i / (n - 1)) * W : W / 2;
    const y = H - (v / max) * H;
    d += `${pen ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    pen = true;
  });
  return d;
}

function Series({ m }: { m: SeriesMarks }) {
  const { lang } = useLang();
  const peak = m.peak ? m.lines[m.peak.line] : undefined;
  const peakValue = m.peak && peak ? peak.values[m.peak.index] : null;
  return (
    <>
      {m.legend && <Legend items={m.legend} tones={m.lines.map((l) => l.tone)} />}
      <div className="cp-plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" focusable="false">
          {m.lines.map((l, i) => {
            const d = linePath(l.values, m.max);
            return (
              <g key={i}>
                {l.area && !l.values.includes(null) && (
                  <path d={`${d}L${W} ${H}L0 ${H}Z`} className="cp-area" style={{ fill: color(l.tone) }} />
                )}
                <path d={d} className="cp-line" style={{ stroke: color(l.tone) }} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
        {m.peak && peak && peakValue != null && (
          <span
            className="cp-dot"
            style={{
              left: pct(peak.values.length > 1 ? m.peak.index / (peak.values.length - 1) : 0.5),
              top: pct(1 - peakValue / m.max),
              background: color(peak.tone),
            }}
          />
        )}
      </div>
      <Axis from={m.from} to={m.to} lang={lang} />
    </>
  );
}

function Columns({ m }: { m: ColumnsMarks }) {
  const { lang } = useLang();
  const step = W / m.stacks.length;
  const width = step * 0.72;
  const partial = new Set(m.partial ?? []);
  return (
    <>
      <Legend items={m.legend} tones={m.tones} />
      <div className="cp-plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" focusable="false">
          {m.stacks.map((s, i) => {
            let base = H;
            return (
              <g key={i} className={partial.has(i) ? 'cp-partial' : undefined}>
                {s.map((v, j) => {
                  const h = (v / m.max) * H;
                  base -= h;
                  return <rect key={j} x={i * step} y={base} width={width} height={h} style={{ fill: color(m.tones[j]!) }} />;
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <Axis from={m.from} to={m.to} lang={lang} />
    </>
  );
}

function Grid({ m }: { m: GridMarks }) {
  const cells: PreviewTone[] = m.counts.flatMap((n, i) => Array.from({ length: n }, () => m.tones[i]!));
  const rows = Math.ceil(cells.length / m.columns);
  return (
    <div className="cp-grid">
      <svg viewBox={`0 0 ${m.columns * 10} ${rows * 10}`} style={{ aspectRatio: `${m.columns} / ${rows}` }} focusable="false">
        {cells.map((tone, i) => (
          <rect
            key={i}
            x={(i % m.columns) * 10 + 1}
            y={Math.floor(i / m.columns) * 10 + 1}
            width={8}
            height={8}
            rx={1.5}
            style={{ fill: color(tone) }}
          />
        ))}
      </svg>
      <Legend items={m.legend} tones={m.tones} />
    </div>
  );
}

function Marks({ preview }: { preview: CardPreviewData }): ReactElement {
  const m = preview.marks;
  switch (m.kind) {
    case 'rows':
      return <Rows m={m} />;
    case 'butterfly':
      return <Butterfly m={m} />;
    case 'series':
      return <Series m={m} />;
    case 'columns':
      return <Columns m={m} />;
    case 'grid':
      return <Grid m={m} />;
  }
}

export function CardPreview({ preview }: { preview: CardPreviewData }) {
  const { lang } = useLang();
  return (
    <div className="cp">
      <p className="cp-key">
        <span className="cp-value">{formatKeyValue(preview.key, lang)}</span>
        <span className="cp-label">{formatKeyLabel(preview.key, lang)}</span>
      </p>
      <div className={`cp-marks cp-marks--${preview.marks.kind}`}>
        <Marks preview={preview} />
      </div>
    </div>
  );
}

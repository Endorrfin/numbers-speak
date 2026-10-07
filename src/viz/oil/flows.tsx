// flows.tsx — CHANGED (S3-oil): angle E, the EI's inter-area crude trade table for 2025 as stacked rows. Importers view:
// each buying area split by six source groups; exporters view: each selling area split by six buyer groups (?side=).
// Million tonnes as published; bars and labels in barrels a day (≈, EI factor) like the rest of the page.
import { useCallback, useId, useMemo } from 'react';
import { StackedRows } from '../../charts/StackedRows';
import type { SrRow, SrSpec } from '../../charts/renderStackedRows';
import { SECTOR_COLOR } from '../../charts/palette';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatKbd, formatNumber, formatShare } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DataState } from './common';
import type { AngleProps } from './common';
import {
  AREA_LABELS,
  DEST_GROUPS,
  DEST_GROUP_LABELS,
  FILES,
  SOURCE_GROUPS,
  SOURCE_GROUP,
  SOURCE_GROUP_LABELS,
  kbdFromTonnes,
  parseTrade,
  tradeRows,
} from './data';
import type { DestGroup, SourceGroup, TradeDataset, TradeRow, TradeSide } from './data';

const parse = (json: unknown): TradeDataset => parseTrade(json, FILES.trade);

/** Areas trading less than this (million tonnes) stay in the table, not in the chart. */
const MIN_MT = 5;

// Six validated categorical marks (the sector set: five hues + a neutral for "other areas").
const SOURCE_COLOR: Record<SourceGroup, string> = {
  'middle-east': SECTOR_COLOR.tech,
  russia: SECTOR_COLOR.auto,
  'north-america': SECTOR_COLOR.finance,
  'latin-america': SECTOR_COLOR.consumer,
  africa: SECTOR_COLOR.fashion,
  other: SECTOR_COLOR.industry,
};
const DEST_COLOR: Record<DestGroup, string> = {
  china: SECTOR_COLOR.tech,
  india: SECTOR_COLOR.auto,
  europe: SECTOR_COLOR.finance,
  us: SECTOR_COLOR.consumer,
  'other-asia': SECTOR_COLOR.fashion,
  other: SECTOR_COLOR.industry,
};

const txt = {
  side: { en: 'Show', uk: 'Показати' },
  sides: {
    importers: { en: 'Buyers', uk: 'Покупців' },
    exporters: { en: 'Sellers', uk: 'Продавців' },
  },
  chartLabel: {
    importers: {
      en: 'Stacked bar chart: crude oil imports of {n} world areas in {year}, barrels a day (≈), each split by the area it comes from. Largest buyer: {top}. The table view lists every area in million tonnes.',
      uk: 'Складена стовпчикова діаграма: імпорт сирої нафти {n} регіонів світу у {year} році, барелів на добу (≈), кожен — за регіоном походження. Найбільший покупець: {top}. Таблиця містить усі регіони в млн тонн.',
    },
    exporters: {
      en: 'Stacked bar chart: crude oil exports of {n} world areas in {year}, barrels a day (≈), each split by the area that buys it. Largest seller: {top}. The table view lists every area in million tonnes.',
      uk: 'Складена стовпчикова діаграма: експорт сирої нафти {n} регіонів світу у {year} році, барелів на добу (≈), кожен — за регіоном-покупцем. Найбільший продавець: {top}. Таблиця містить усі регіони в млн тонн.',
    },
  },
  status: {
    en: 'World crude trade between areas, {year}: {mt} Mt ≈ {kbd} · {n} areas trading at least {min} Mt',
    uk: 'Світова торгівля сирою нафтою між регіонами, {year}: {mt} млн т ≈ {kbd} · {n} регіонів з обсягом від {min} млн т',
  },
  sublabel: { en: '{share} of world trade', uk: '{share} світової торгівлі' },
  tipPart: { en: '{mt} Mt ≈ {kbd}', uk: '{mt} млн т ≈ {kbd}' },
  tipSmall: { en: 'under 0.05 Mt', uk: 'менше 0,05 млн т' },
  keySources: { en: 'Where the oil comes from', uk: 'Звідки нафта' },
  keyBuyers: { en: 'Who buys it', uk: 'Хто купує' },
  colArea: { en: 'Area', uk: 'Регіон' },
  colTotal: { en: 'Total, Mt', uk: 'Усього, млн т' },
  colShare: { en: 'Share of world', uk: 'Частка у світі' },
  caption: {
    importers: { en: 'Crude oil imports by area and source, {year}, million tonnes', uk: 'Імпорт сирої нафти за регіонами й походженням, {year}, млн тонн' },
    exporters: { en: 'Crude oil exports by area and buyer, {year}, million tonnes', uk: 'Експорт сирої нафти за регіонами й покупцями, {year}, млн тонн' },
  },
  kpiWorld: { en: 'Crude trade between areas, {year} ({mt} Mt)', uk: 'Торгівля сирою нафтою між регіонами, {year} ({mt} млн т)' },
  kpiTopImport: { en: '{name}: share of world imports', uk: '{name}: частка світового імпорту' },
  kpiTopExport: { en: '{name}: share of world exports', uk: '{name}: частка світового експорту' },
  kpiMiddleEast: { en: 'Middle East: share of world exports', uk: 'Близький Схід: частка світового експорту' },
  note: {
    en: 'Trade between the EI’s world areas only: oil moving between countries of one area (inside Europe, for example) is not counted. Crude includes condensates; refined products are a separate table. Million tonnes as published; barrels a day ≈ tonnes × 7.33 ÷ 365. Source: Energy Institute Statistical Review of World Energy 2026 (includes data from FGE NexantECA).',
    uk: 'Лише торгівля між регіонами EI: нафта, що рухається між країнами одного регіону (наприклад, усередині Європи), не враховується. Сира нафта включає газовий конденсат; нафтопродукти — окрема таблиця. Мільйони тонн — як опубліковано; барелі на добу ≈ тонни × 7,33 ÷ 365. Джерело: Energy Institute Statistical Review of World Energy 2026 (з даними FGE NexantECA).',
  },
} as const;

const mtText = (v: number, lang: Lang): string => formatNumber(Math.round(v * 10) / 10, lang);

export function FlowsAngle({ settings, update }: AngleProps) {
  const state = useDataset(dataUrl('oil', FILES.trade), parse);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  return <FlowsView ds={state.data} settings={settings} update={update} />;
}

function FlowsView({ ds, settings, update }: AngleProps & { ds: TradeDataset }) {
  const { t, lang } = useLang();
  const base = useId();
  const side: TradeSide = settings.side;
  const groups: readonly (SourceGroup | DestGroup)[] = side === 'importers' ? SOURCE_GROUPS : DEST_GROUPS;
  const colorOf = useCallback(
    (g: SourceGroup | DestGroup): string => (side === 'importers' ? SOURCE_COLOR[g as SourceGroup] : DEST_COLOR[g as DestGroup]),
    [side],
  );
  const labelOf = (g: SourceGroup | DestGroup) => (side === 'importers' ? SOURCE_GROUP_LABELS[g as SourceGroup] : DEST_GROUP_LABELS[g as DestGroup]);

  const all = useMemo(() => tradeRows(ds, side), [ds, side]);
  const charted = useMemo(() => all.filter((r) => r.mt >= MIN_MT), [all]);
  const kbd = (v: number): string => `≈ ${formatKbd(kbdFromTonnes(v * 1e6, ds.year), lang)}`;

  const spec = useMemo((): SrSpec => {
    const rows: SrRow[] = charted.map((r) => ({
      key: r.area,
      label: t(AREA_LABELS[r.area]),
      sublabel: fill(t(txt.sublabel), { share: formatShare(r.share, lang) }),
      segments: r.segments.filter((s) => s.mt > 0).map((s) => ({ key: s.group, value: kbdFromTonnes(s.mt * 1e6, ds.year), color: colorOf(s.group) })),
      valueLabel: `≈ ${formatKbd(kbdFromTonnes(r.mt * 1e6, ds.year), lang)}`,
      tooltip: {
        title: `${t(AREA_LABELS[r.area])} · ${mtText(r.mt, lang)} Mt`,
        lines: r.segments
          .filter((s) => s.mt > 0)
          .flatMap((s) =>
            s.parts.map((p) => ({
              label: t(AREA_LABELS[p.area]),
              value: p.small ? t(txt.tipSmall) : fill(t(txt.tipPart), { mt: mtText(p.mt, lang), kbd: formatKbd(kbdFromTonnes(p.mt * 1e6, ds.year), lang) }),
              color: colorOf(s.group),
            })),
          ),
      },
    }));
    return { rows };
  }, [charted, ds.year, colorOf, lang, t]);

  const imports = useMemo(() => tradeRows(ds, 'importers'), [ds]);
  const exports = useMemo(() => tradeRows(ds, 'exporters'), [ds]);
  const topImporter = imports[0];
  const topExporter = exports[0];
  const middleEast = exports.filter((r) => SOURCE_GROUP[r.area as keyof typeof SOURCE_GROUP] === 'middle-east').reduce((s, r) => s + r.mt, 0);
  const top = charted[0];

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-auto">
          <span className="field-label" id={`${base}-side`}>
            {t(txt.side)}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${base}-side`}>
            {(['importers', 'exporters'] as const).map((s) => (
              <label key={s} className={side === s ? 'is-on' : undefined}>
                <input type="radio" name={`${base}-side`} value={s} checked={side === s} onChange={() => update({ side: s })} />
                {t(txt.sides[s])}
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { year: ds.year, mt: mtText(ds.world, lang), kbd: formatKbd(kbdFromTonnes(ds.world * 1e6, ds.year), lang), n: charted.length, min: MIN_MT })}
      </p>

      <ul className="key-list" aria-label={t(side === 'importers' ? txt.keySources : txt.keyBuyers)}>
        {groups.map((g) => (
          <li key={g}>
            <span className="swatch" style={{ background: colorOf(g) }} aria-hidden="true" />
            {t(labelOf(g))}
          </li>
        ))}
      </ul>

      {settings.view === 'chart' ? (
        <StackedRows
          spec={spec}
          label={fill(t(txt.chartLabel[side]), { n: charted.length, year: ds.year, top: top ? `${t(AREA_LABELS[top.area])}, ${kbd(top.mt)}` : '—' })}
        />
      ) : (
        <FlowsTable rows={all} groups={groups} labelOf={labelOf} colorOf={colorOf} caption={fill(t(txt.caption[side]), { year: ds.year })} />
      )}

      <ul className="kpi-row" aria-label={fill(t(txt.kpiWorld), { year: ds.year, mt: mtText(ds.world, lang) })}>
        <li className="kpi">
          <span className="kpi-value">{kbd(ds.world)}</span>
          <span className="kpi-label">{fill(t(txt.kpiWorld), { year: ds.year, mt: mtText(ds.world, lang) })}</span>
        </li>
        {topImporter && (
          <li className="kpi">
            <span className="kpi-value">{formatShare(topImporter.share, lang)}</span>
            <span className="kpi-label">{fill(t(txt.kpiTopImport), { name: t(AREA_LABELS[topImporter.area]) })}</span>
          </li>
        )}
        {topExporter && (
          <li className="kpi">
            <span className="kpi-value">{formatShare(topExporter.share, lang)}</span>
            <span className="kpi-label">{fill(t(txt.kpiTopExport), { name: t(AREA_LABELS[topExporter.area]) })}</span>
          </li>
        )}
        <li className="kpi">
          <span className="kpi-value">{formatShare(middleEast / ds.world, lang)}</span>
          <span className="kpi-label">{t(txt.kpiMiddleEast)}</span>
        </li>
      </ul>
      <p className="chart-note muted">{t(txt.note)}</p>
    </>
  );
}

type TableProps = {
  rows: readonly TradeRow[];
  groups: readonly (SourceGroup | DestGroup)[];
  labelOf: (g: SourceGroup | DestGroup) => { en: string; uk: string };
  colorOf: (g: SourceGroup | DestGroup) => string;
  caption: string;
};

function FlowsTable({ rows, groups, labelOf, colorOf, caption }: TableProps) {
  const { t, lang } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.colArea)}</th>
            {groups.map((g) => (
              <th key={g} scope="col" className="num">
                <span className="swatch" style={{ background: colorOf(g) }} aria-hidden="true" /> {t(labelOf(g))}
              </th>
            ))}
            <th scope="col" className="num">
              {t(txt.colTotal)}
            </th>
            <th scope="col" className="num">
              {t(txt.colShare)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.area}>
              <th scope="row">{t(AREA_LABELS[r.area])}</th>
              {r.segments.map((s) => (
                <td key={s.group} className="num">
                  {s.mt === 0 ? '—' : s.parts.every((p) => p.small) ? `<${formatNumber(0.05, lang)}` : mtText(s.mt, lang)}
                </td>
              ))}
              <td className="num">{mtText(r.mt, lang)}</td>
              <td className="num">{formatShare(r.share, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

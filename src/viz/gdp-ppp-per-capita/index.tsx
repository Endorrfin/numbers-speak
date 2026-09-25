// gdp-ppp-per-capita — GDP per capita at PPP, 2023–2025, and the multiple of the world average (S3-rb).
// Layers: data.ts (contract + parser + ranking) → state.ts (URL state) → this page. Follows gdp-by-country's
// per-capita view (year sub-tabs, one lazy file each, "× world average") on the shared RankedBar core.
import { useCallback, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import { RankedBar } from '../../charts/RankedBar';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import { REGION_COLOR } from '../../charts/palette';
import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { formatMultiple, formatNumber, formatUsdCompact, formatUsdTick, formatUsdWhole } from '../../lib/format';
import { hrefViz } from '../../lib/hashRouter';
import { paginate } from '../../lib/paginate';
import { Pager } from '../../components/viz/Pager';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { WB_ECONOMIES, YEARS, dataFile, parsePppDataset, rankPpp } from './data';
import type { PppDataset, RankedPppRow } from './data';
import { PAGE_SIZE, parsePppState, toPppParams } from './state';
import type { PppState } from './state';

type L = { en: string; uk: string };
type T = (v: L) => string;

// One stable parser per file: useDataset re-runs its effect when `parse` changes identity.
const parsers = new Map<number, (json: unknown) => PppDataset>();
function parserFor(year: number): (json: unknown) => PppDataset {
  let p = parsers.get(year);
  if (!p) {
    p = (json: unknown) => parsePppDataset(json, dataFile(year));
    parsers.set(year, p);
  }
  return p;
}

const txt = {
  year: { en: 'Year', uk: 'Рік' },
  chartLabel: {
    en: 'Horizontal bar chart: GDP per capita at purchasing-power parity, {region}, {year}, ranks {from} to {to} of {total}. Highest: {top}. The table view lists every value.',
    uk: 'Горизонтальна стовпчикова діаграма: ВВП на душу населення за ПКС ({region}), {year}, місця {from}–{to} з {total}. Найвищий: {top}. Таблиця містить усі значення.',
  },
  worldAverage: {
    en: 'World average, {year}: {value} (international $)',
    uk: 'Світове середнє, {year}: {value} (міжнародні долари)',
  },
  regionCount: { en: '{region}: {count} economies', uk: '{region}: економік — {count}' },
  colValue: { en: 'GDP per capita, PPP, international $', uk: 'ВВП на душу за ПКС, міжнародні дол.' },
  colRatio: { en: '× world average', uk: '× світового середнього' },
  tipRank: { en: 'Rank: {rank} of {total}', uk: 'Місце: {rank} з {total}' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },
  tipValue: { en: 'GDP per capita (PPP): {value}', uk: 'ВВП на душу (ПКС): {value}' },
  tipRatio: { en: 'World average: {ratio}', uk: 'Від світового середнього: {ratio}' },
  rankNote: {
    en: 'Rank is the global rank, also when a region is selected. {count} of the {economies} World Bank economies have a value for {year}; the others are left out, not estimated. Taiwan is not covered by World Bank data.',
    uk: 'Місце — глобальне, навіть коли вибрано регіон. Значення за {year} мають {count} із {economies} економік Світового банку; решту не показано, а не оцінено. Тайвань даними Світового банку не охоплено.',
  },
  pppNote: {
    en: 'PPP converts output into “international dollars” with the same buying power everywhere, so poorer economies look richer than at market exchange rates. “× world average” divides by the World Bank’s World aggregate for the same year. At market rates, see',
    uk: 'ПКС переводить виробництво в «міжнародні долари» з однаковою купівельною спроможністю всюди, тож бідніші економіки виглядають багатшими, ніж за ринковим курсом. «× світового середнього» — ділення на агрегат «Світ» Світового банку за той самий рік. За ринковим курсом — див.',
  },
  gdpLink: { en: 'GDP by country', uk: 'ВВП країн' },
  tableCaption: {
    en: 'GDP per capita, PPP, by economy, {year} — {region}',
    uk: 'ВВП на душу населення за ПКС за економіками, {year} — {region}',
  },
  kpiWorld: { en: 'World average, {year}', uk: 'Світове середнє, {year}' },
  kpiAbove: { en: 'Economies above the world average', uk: 'Економік вище за світове середнє' },
  kpiGap: { en: '{top} vs {bottom}: highest ÷ lowest', uk: '{top} і {bottom}: найвищий ÷ найнижчий' },
} as const;

function toBarRow(r: RankedPppRow, lang: Lang, total: number, t: T): RankedBarRow {
  const name = countryName(r.code, lang);
  const value = formatUsdCompact(r.value, lang);
  const ratio = formatMultiple(r.ratio, lang);
  return {
    key: r.code,
    label: `${r.rank}  ${name}`,
    value: r.value,
    color: REGION_COLOR[r.region],
    valueLabel: `${value} · ${ratio}`,
    imageUrl: flagUrl(r.code),
    tooltip: {
      title: name,
      lines: [
        fill(t(txt.tipRank), { rank: r.rank, total }),
        fill(t(txt.tipRegion), { region: t(REGION_LABELS[r.region]) }),
        fill(t(txt.tipValue), { value: `$${formatUsdWhole(r.value, lang)}` }),
        fill(t(txt.tipRatio), { ratio }),
      ],
    },
  };
}

export default function GdpPppPerCapita({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const base = useId();
  const settings = useMemo(() => parsePppState(params), [params]);
  const state = useDataset(dataUrl('gdp-ppp-per-capita', dataFile(settings.year)), parserFor(settings.year));
  const update = useCallback(
    (patch: Partial<PppState>) => setParams(toPppParams({ ...settings, ...patch })),
    [settings, setParams],
  );

  let body: ReactNode;
  if (state.status === 'loading') body = <p className="muted stage-loading">{t(ui.loading)}</p>;
  else if (state.status === 'error') {
    body = (
      <div className="notice notice-warn load-error" role="alert">
        <p>{t(ui.dataLoadError)}</p>
        <button type="button" className="btn btn-ghost" onClick={state.retry}>
          {t(ui.retry)}
        </button>
      </div>
    );
  } else body = <PppView dataset={state.data} settings={settings} update={update} />;

  // The year switch stays on screen while a file loads, so the page never jumps away.
  return (
    <div className="viz-body">
      <div className="controls" role="group" aria-label={t(txt.year)}>
        <div className="field field-subtabs">
          <span className="field-label" id={`${base}-year`}>
            {t(txt.year)}
          </span>
          <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-year`}>
            {YEARS.map((y) => (
              <label key={y} className={settings.year === y ? 'is-on' : undefined}>
                <input
                  type="radio"
                  name={`${base}-year`}
                  value={y}
                  checked={settings.year === y}
                  onChange={() => update({ year: y })}
                />
                {y}
              </label>
            ))}
          </div>
        </div>
      </div>
      {body}
    </div>
  );
}

type ViewProps = { dataset: PppDataset; settings: PppState; update: (patch: Partial<PppState>) => void };

function PppView({ dataset, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const ranked = useMemo(() => rankPpp(dataset), [dataset]);
  const filtered = useMemo(
    () => (settings.region === 'all' ? ranked : ranked.filter((r) => r.region === settings.region)),
    [ranked, settings.region],
  );
  const page = useMemo(() => paginate(filtered, settings.page, PAGE_SIZE), [filtered, settings.page]);
  const pageItems = page.items;
  const rows = useMemo(() => pageItems.map((r) => toBarRow(r, lang, ranked.length, t)), [pageItems, lang, ranked.length, t]);
  const tickFormat = useCallback((v: number) => formatUsdTick(v, lang), [lang]);

  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel), {
    region: regionName,
    year: dataset.year,
    from: page.from,
    to: page.to,
    total: page.total,
    top: top ? `${countryName(top.code, lang)}, ${formatUsdCompact(top.value, lang)}` : '—',
  });
  const average = `$${formatUsdWhole(dataset.worldAverage, lang)}`;
  const summary =
    settings.region === 'all'
      ? fill(t(txt.worldAverage), { year: dataset.year, value: average })
      : fill(t(txt.regionCount), { region: regionName, count: filtered.length });

  const above = ranked.filter((r) => r.ratio > 1).length;
  const highest = ranked[0];
  const lowest = ranked.at(-1);

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field">
          <label htmlFor={`${base}-region`}>{t(ui.region)}</label>
          <select
            id={`${base}-region`}
            value={settings.region}
            onChange={(e) => update({ region: e.target.value as Region | 'all', page: 1 })}
          >
            <option value="all">{t(ui.allRegions)}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {t(REGION_LABELS[r])}
              </option>
            ))}
          </select>
        </div>

        {settings.view === 'chart' && (
          // CHANGED (S3-fx): shared Pager — the select no longer clips on phones
          <Pager id={`${base}-page`} page={page} size={PAGE_SIZE} onPage={(p) => update({ page: p })} />
        )}

        <div className="field field-auto">
          <span className="field-label" id={`${base}-view`}>
            {t(ui.view)}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${base}-view`}>
            {(['chart', 'table'] as const).map((v) => (
              <label key={v} className={settings.view === v ? 'is-on' : undefined}>
                <input
                  type="radio"
                  name={`${base}-view`}
                  value={v}
                  checked={settings.view === v}
                  onChange={() => update({ view: v })}
                />
                {t(v === 'chart' ? ui.viewChart : ui.viewTable)}
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="viz-status" aria-live="polite">
        {settings.view === 'chart'
          ? fill(t(ui.showingRange), { from: page.from, to: page.to, total: page.total })
          : fill(t(ui.showingAll), { total: page.total })}
        {' · '}
        {summary}
      </p>

      {settings.view === 'chart' ? (
        <RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} />
      ) : (
        <PppTable rows={filtered} caption={fill(t(txt.tableCaption), { year: dataset.year, region: regionName })} />
      )}

      <ul className="legend" aria-label={t(ui.legend)}>
        {REGIONS.map((r) => {
          const on = settings.region === r;
          return (
            <li key={r}>
              <button
                type="button"
                className="legend-item"
                aria-pressed={on}
                onClick={() => update({ region: on ? 'all' : r, page: 1 })}
              >
                <span className="swatch" style={{ background: REGION_COLOR[r] }} aria-hidden="true" />
                {t(REGION_LABELS[r])}
              </button>
            </li>
          );
        })}
      </ul>

      <ul className="kpi-row" aria-label={fill(t(txt.kpiWorld), { year: dataset.year })}>
        <li className="kpi">
          <span className="kpi-value">{average}</span>
          <span className="kpi-label">{fill(t(txt.kpiWorld), { year: dataset.year })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">
            {above} / {ranked.length}
          </span>
          <span className="kpi-label">{t(txt.kpiAbove)}</span>
        </li>
        {highest && lowest && (
          <li className="kpi">
            <span className="kpi-value">{formatMultiple(highest.value / lowest.value, lang)}</span>
            <span className="kpi-label">
              {fill(t(txt.kpiGap), { top: countryName(highest.code, lang), bottom: countryName(lowest.code, lang) })}
            </span>
          </li>
        )}
      </ul>

      <p className="chart-note muted">
        {fill(t(txt.rankNote), { count: ranked.length, economies: WB_ECONOMIES, year: dataset.year })}
      </p>
      <p className="chart-note muted">
        {t(txt.pppNote)} <a href={hrefViz('gdp-by-country', { metric: 'per-capita' })}>{t(txt.gdpLink)}</a>.
      </p>
    </>
  );
}

function PppTable({ rows, caption }: { rows: readonly RankedPppRow[]; caption: string }) {
  const { t, lang } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="num">
              {t(ui.rank)}
            </th>
            <th scope="col">{t(ui.country)}</th>
            <th scope="col">{t(ui.region)}</th>
            <th scope="col" className="num">
              {t(txt.colValue)}
            </th>
            <th scope="col" className="num">
              {t(txt.colRatio)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = flagUrl(r.code);
            return (
              <tr key={r.code}>
                <td className="num">{r.rank}</td>
                <th scope="row">
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(r.code, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                </td>
                <td className="num">{formatNumber(Math.round(r.value), lang)}</td>
                <td className="num">{formatMultiple(r.ratio, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

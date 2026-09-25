// population-by-country — population of 237 countries and territories, 2025, and density (S3-rb).
// Layers: data.ts (contract + parser + density join) → state.ts (URL state) → this page. Follows the
// land-area page (metric sub-tabs, region filter, paging, regional-share strip, table view); the density
// metric joins the `land-area` dataset at runtime, so it loads a second file only for that view.
import { useCallback, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import { RankedBar } from '../../charts/RankedBar';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import { Strip } from '../../charts/Strip';
import type { StripSegment } from '../../charts/renderStrip';
import { REGION_COLOR } from '../../charts/palette';
import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import {
  formatAreaWhole,
  formatCountCompact,
  formatCountTick,
  formatDensity,
  formatDensityTick,
  formatNumber,
  formatShare,
} from '../../lib/format';
import { hrefViz } from '../../lib/hashRouter';
import { paginate } from '../../lib/paginate';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE as AREA_FILE, parseAreaDataset } from '../land-area/data';
import type { AreaDataset } from '../land-area/data';
import { DATA_FILE, METRICS, densityOf, parsePopDataset, rankPopulation, regionShares } from './data';
import type { DensityNote, Metric, NoteKind, PopDataset, RankedPopRow } from './data';
import { PAGE_SIZE, parsePopulationState, toPopulationParams } from './state';
import type { PopulationState } from './state';

type L = { en: string; uk: string };
type T = (v: L) => string;

const parsePop = (json: unknown): PopDataset => parsePopDataset(json, DATA_FILE);
const parseArea = (json: unknown): AreaDataset => parseAreaDataset(json, AREA_FILE);

const txt = {
  metric: { en: 'Metric', uk: 'Показник' },
  tab: {
    population: { en: 'Population', uk: 'Населення' },
    density: { en: 'Density', uk: 'Щільність' },
  },
  chartLabel: {
    population: {
      en: 'Horizontal bar chart: population of {region} in {year}, ranks {from} to {to} of {total}. Largest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: населення ({region}) у {year} році, місця {from}–{to} з {total}. Найбільше: {top}. Таблиця містить усі значення.',
    },
    density: {
      en: 'Horizontal bar chart: population density, people per km² of land, {region}, ranks {from} to {to} of {total}. Densest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: щільність населення, осіб на км² суходолу ({region}), місця {from}–{to} з {total}. Найщільніше: {top}. Таблиця містить усі значення.',
    },
  },
  worldTotal: { en: 'World population, {year}: {value}', uk: 'Населення світу, {year}: {value}' },
  regionTotal: { en: '{region}: {value} · {share} of the world', uk: '{region}: {value} · {share} населення світу' },
  worldDensity: {
    en: 'World: {value} — {count} countries and territories with a land area',
    uk: 'Світ: {value} — {count} країн і територій із відомою площею',
  },
  regionDensity: { en: '{region}: {value}', uk: '{region}: {value}' },
  colPopulation: { en: 'Population', uk: 'Населення' },
  colShare: { en: 'Share of world', uk: 'Частка у світі' },
  colDensity: { en: 'People per km²', uk: 'Осіб на км²' },
  colLand: { en: 'Land area, km²', uk: 'Площа суходолу, км²' },
  colNote: { en: 'Note', uk: 'Примітка' },
  tipRank: { en: 'Rank: {rank} of {total}', uk: 'Місце: {rank} з {total}' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },
  tipPopulation: { en: 'Population: {value}', uk: 'Населення: {value}' },
  tipShare: { en: 'World share: {share}', uk: 'Частка у світі: {share}' },
  tipDensity: { en: 'Density: {value}', uk: 'Щільність: {value}' },
  tipLand: { en: 'Land area: {value}', uk: 'Площа суходолу: {value}' },
  tipNote: { en: '* {note}', uk: '* {note}' },
  note: {
    'recognized-borders': {
      en: 'Counted within internationally recognized borders: the UN includes Crimea in Ukraine’s figure, not in Russia’s.',
      uk: 'Враховано в міжнародно визнаних кордонах: ООН включає Крим до показника України, а не Росії.',
    },
  } satisfies Record<NoteKind, L>,
  densityNote: {
    'no-area': {
      en: 'No land-area figure for this territory in “Land area by country”, so no density.',
      uk: 'У записі «Площа країн світу» немає площі цієї території, тож щільність не показано.',
    },
    'approx-area': {
      en: 'Land area is under 25 km² and rounded to whole km² in the source, so the density is approximate.',
      uk: 'Площа суходолу менша за 25 км² і в джерелі округлена до цілих км², тож щільність приблизна.',
    },
  } satisfies Record<DensityNote, L>,
  rankNote: {
    en: 'Rank is the global rank, also when a region is selected. UN WPP 2024 medium-variant estimates for 1 July {year} — modelled figures, not census counts.',
    uk: 'Місце — глобальне, навіть коли вибрано регіон. Оцінки ООН (WPP 2024, середній варіант) на 1 липня {year} року — модельні значення, а не дані переписів.',
  },
  densityHow: {
    en: 'Density = population ÷ land area (World Bank definition, inland water excluded). Land area comes from',
    uk: 'Щільність = населення ÷ площа суходолу (визначення Світового банку, без внутрішніх вод). Площа — із запису',
  },
  densityLink: { en: 'Land area by country', uk: 'Площа країн світу' },
  marked: {
    en: '{count} rows are marked * — see the note in the table, or hover a bar.',
    uk: '{count} рядків позначено * — див. примітку в таблиці або підказку на стовпці.',
  },
  ukraine: {
    en: 'Ukraine: the UN estimate of 38.98 million covers internationally recognized borders, including Crimea and the occupied territories; it is not a count of the people living on government-controlled territory today.',
    uk: 'Україна: оцінка ООН — 38,98 млн — охоплює міжнародно визнані кордони, зокрема Крим і окуповані території; це не підрахунок людей, які сьогодні живуть на підконтрольній уряду території.',
  },
  tableCaption: {
    population: { en: 'Population by country, {year} — {region}', uk: 'Населення країн, {year} — {region}' },
    density: { en: 'Population density by country, {year} — {region}', uk: 'Щільність населення країн, {year} — {region}' },
  },
  shareTitle: { en: 'Share of world population by region', uk: 'Частка населення світу за регіонами' },
  shareLabel: { en: 'Share of world population by region', uk: 'Частка населення світу за регіонами' },
  shareTip: {
    en: '{share} of the world · {count} countries and territories · {value}',
    uk: '{share} населення світу · {count} країн і територій · {value}',
  },
  kpiWorld: { en: 'World population, 1 July {year}', uk: 'Населення світу, 1 липня {year}' },
  kpiTop10: { en: 'Top 10 share of the world', uk: 'Частка топ-10 у населенні світу' },
  kpiLargest: { en: 'Largest: {value}', uk: 'Найбільше: {value}' },
  kpiWorldDensity: { en: 'World density, people per km² of land', uk: 'Щільність у світі, осіб на км² суходолу' },
  kpiDensest: { en: 'Densest: {value}', uk: 'Найщільніше: {value}' },
  kpiSparsest: { en: 'Sparsest: {value}', uk: 'Найрідше: {value}' },
} as const;

function rowNotes(r: RankedPopRow, metric: Metric, t: T): string[] {
  const out: string[] = [];
  if (r.note) out.push(t(txt.note[r.note]));
  if (metric === 'density' && r.densityNote) out.push(t(txt.densityNote[r.densityNote]));
  return out;
}

function valueText(r: RankedPopRow, metric: Metric, lang: Lang): string {
  if (metric === 'population') return formatCountCompact(r.population, lang);
  return r.density === null ? '—' : formatDensity(r.density, lang);
}

function toBarRow(r: RankedPopRow, metric: Metric, lang: Lang, total: number, t: T): RankedBarRow {
  const name = countryName(r.code, lang);
  const notes = rowNotes(r, metric, t);
  const lines = [
    fill(t(txt.tipRank), { rank: r.rank ?? '—', total }),
    fill(t(txt.tipRegion), { region: t(REGION_LABELS[r.region]) }),
    fill(t(txt.tipPopulation), { value: formatNumber(r.population, lang) }),
    fill(t(txt.tipShare), { share: formatShare(r.share, lang) }),
  ];
  if (metric === 'density' && r.density !== null && r.landArea !== null) {
    lines.push(fill(t(txt.tipDensity), { value: formatDensity(r.density, lang) }));
    lines.push(fill(t(txt.tipLand), { value: formatAreaWhole(r.landArea, lang) }));
  }
  for (const n of notes) lines.push(fill(t(txt.tipNote), { note: n }));
  const mark = notes.length ? '*' : '';
  const valueLabel =
    metric === 'population' ? `${valueText(r, metric, lang)}${mark} · ${formatShare(r.share, lang)}` : `${valueText(r, metric, lang)}${mark}`;
  return {
    key: r.code,
    label: `${r.rank ?? '—'}  ${name}`,
    value: r.value ?? 0,
    color: REGION_COLOR[r.region],
    valueLabel,
    imageUrl: flagUrl(r.code),
    tooltip: { title: name, lines },
  };
}

export default function PopulationByCountry({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const base = useId();
  const settings = useMemo(() => parsePopulationState(params), [params]);
  const pop = useDataset(dataUrl('population-by-country', DATA_FILE), parsePop);
  // The land-area file (≈ 15 kB) is always requested so switching to density is instant; only the density
  // view depends on it, so a failure there never blocks the population view.
  const area = useDataset(dataUrl('land-area', AREA_FILE), parseArea);
  const update = useCallback(
    (patch: Partial<PopulationState>) => setParams(toPopulationParams({ ...settings, ...patch })),
    [settings, setParams],
  );

  const needsArea = settings.metric === 'density';
  const failed = pop.status === 'error' ? pop : needsArea && area.status === 'error' ? area : null;
  let body: ReactNode;
  if (failed) {
    body = (
      <div className="notice notice-warn load-error" role="alert">
        <p>{t(ui.dataLoadError)}</p>
        <button type="button" className="btn btn-ghost" onClick={failed.retry}>
          {t(ui.retry)}
        </button>
      </div>
    );
  } else if (pop.status !== 'ready' || (needsArea && area.status !== 'ready')) {
    body = <p className="muted stage-loading">{t(ui.loading)}</p>;
  } else {
    body = (
      <PopulationView
        dataset={pop.data}
        area={area.status === 'ready' ? area.data : null}
        settings={settings}
        update={update}
      />
    );
  }

  return (
    <div className="viz-body">
      <div className="controls" role="group" aria-label={t(txt.metric)}>
        <div className="field field-subtabs">
          <span className="field-label" id={`${base}-metric`}>
            {t(txt.metric)}
          </span>
          <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-metric`}>
            {METRICS.map((m) => (
              <label key={m} className={settings.metric === m ? 'is-on' : undefined}>
                <input
                  type="radio"
                  name={`${base}-metric`}
                  value={m}
                  checked={settings.metric === m}
                  onChange={() => update({ metric: m, page: 1 })}
                />
                {t(txt.tab[m])}
              </label>
            ))}
          </div>
        </div>
      </div>
      {body}
    </div>
  );
}

type ViewProps = {
  dataset: PopDataset;
  area: AreaDataset | null;
  settings: PopulationState;
  update: (patch: Partial<PopulationState>) => void;
};

function PopulationView({ dataset, area, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const metric = settings.metric;

  const ranked = useMemo(() => rankPopulation(dataset, metric, metric === 'density' ? area : null), [dataset, metric, area]);
  const filtered = useMemo(
    () => (settings.region === 'all' ? ranked : ranked.filter((r) => r.region === settings.region)),
    [ranked, settings.region],
  );
  // The chart shows ranked rows only (density: rows with a land area); the table lists every row.
  const charted = useMemo(() => filtered.filter((r) => r.value !== null), [filtered]);
  const rankedCount = useMemo(() => ranked.filter((r) => r.rank !== null).length, [ranked]);
  const page = useMemo(() => paginate(charted, settings.page, PAGE_SIZE), [charted, settings.page]);
  const pageItems = page.items;
  const rows = useMemo(() => pageItems.map((r) => toBarRow(r, metric, lang, rankedCount, t)), [pageItems, metric, lang, rankedCount, t]);
  const tickFormat = useCallback(
    (v: number) => (metric === 'population' ? formatCountTick(v, lang) : formatDensityTick(v, lang)),
    [metric, lang],
  );

  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const markedCount = ranked.filter((r) => rowNotes(r, metric, t).length > 0).length;
  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel[metric]), {
    region: regionName,
    year: dataset.year,
    from: page.from,
    to: page.to,
    total: page.total,
    top: top ? `${countryName(top.code, lang)}, ${valueText(top, metric, lang)}` : '—',
  });
  const pageOptions = Array.from({ length: page.pages }, (_, i) => {
    const from = i * PAGE_SIZE + 1;
    return { value: i + 1, label: `${from}–${Math.min(from + PAGE_SIZE - 1, page.total)}` };
  });

  const world = densityOf(ranked);
  const regional = densityOf(filtered);
  let summary: string;
  if (metric === 'population') {
    const sum = filtered.reduce((s, r) => s + r.population, 0);
    summary =
      settings.region === 'all'
        ? fill(t(txt.worldTotal), { year: dataset.year, value: formatCountCompact(dataset.world, lang) })
        : fill(t(txt.regionTotal), { region: regionName, value: formatCountCompact(sum, lang), share: formatShare(sum / dataset.world, lang) });
  } else {
    summary =
      settings.region === 'all'
        ? fill(t(txt.worldDensity), { value: world ? formatDensity(world.density, lang) : '—', count: world?.count ?? 0 })
        : fill(t(txt.regionDensity), { region: regionName, value: regional ? formatDensity(regional.density, lang) : '—' });
  }

  const byPop = metric === 'population' ? ranked : rankPopulation(dataset, 'population', null);
  const top10Share = byPop.slice(0, 10).reduce((s, r) => s + r.population, 0) / dataset.world;
  const largest = byPop[0];
  const densest = metric === 'density' ? ranked[0] : undefined;
  const sparsest = metric === 'density' ? ranked.filter((r) => r.rank !== null).at(-1) : undefined;

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
          <div className="field">
            <label htmlFor={`${base}-page`}>{t(ui.rows)}</label>
            <div className="pager">
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label={t(ui.prevPage)}
                disabled={page.page <= 1}
                onClick={() => update({ page: page.page - 1 })}
              >
                ‹
              </button>
              <select id={`${base}-page`} value={page.page} onChange={(e) => update({ page: Number(e.target.value) })}>
                {pageOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label={t(ui.nextPage)}
                disabled={page.page >= page.pages}
                onClick={() => update({ page: page.page + 1 })}
              >
                ›
              </button>
            </div>
          </div>
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
          : fill(t(ui.showingAll), { total: filtered.length })}
        {' · '}
        {summary}
      </p>

      {settings.view === 'chart' ? (
        <>
          <RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} />
          {metric === 'population' && <RegionShareStrip dataset={dataset} />}
        </>
      ) : (
        <PopulationTable
          rows={filtered}
          metric={metric}
          withNotes={markedCount > 0}
          caption={fill(t(txt.tableCaption[metric]), { year: dataset.year, region: regionName })}
        />
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

      {metric === 'population' ? (
        <ul className="kpi-row" aria-label={fill(t(txt.kpiWorld), { year: dataset.year })}>
          <li className="kpi">
            <span className="kpi-value">{formatCountCompact(dataset.world, lang)}</span>
            <span className="kpi-label">{fill(t(txt.kpiWorld), { year: dataset.year })}</span>
          </li>
          <li className="kpi">
            <span className="kpi-value">{formatShare(top10Share, lang)}</span>
            <span className="kpi-label">{t(txt.kpiTop10)}</span>
          </li>
          {largest && (
            <li className="kpi">
              <span className="kpi-value">{countryName(largest.code, lang)}</span>
              <span className="kpi-label">{fill(t(txt.kpiLargest), { value: formatCountCompact(largest.population, lang) })}</span>
            </li>
          )}
        </ul>
      ) : (
        <ul className="kpi-row" aria-label={t(txt.kpiWorldDensity)}>
          <li className="kpi">
            <span className="kpi-value">{world ? formatDensity(world.density, lang) : '—'}</span>
            <span className="kpi-label">{t(txt.kpiWorldDensity)}</span>
          </li>
          {densest && densest.density !== null && (
            <li className="kpi">
              <span className="kpi-value">{countryName(densest.code, lang)}</span>
              <span className="kpi-label">
                {fill(t(txt.kpiDensest), { value: `${formatDensity(densest.density, lang)}${densest.densityNote ? '*' : ''}` })}
              </span>
            </li>
          )}
          {sparsest && sparsest.density !== null && (
            <li className="kpi">
              <span className="kpi-value">{countryName(sparsest.code, lang)}</span>
              <span className="kpi-label">{fill(t(txt.kpiSparsest), { value: formatDensity(sparsest.density, lang) })}</span>
            </li>
          )}
        </ul>
      )}

      <p className="chart-note muted">
        {fill(t(txt.rankNote), { year: dataset.year })}
        {markedCount > 0 && ` ${fill(t(txt.marked), { count: markedCount })}`}
      </p>
      {metric === 'density' && (
        <p className="chart-note muted">
          {t(txt.densityHow)} <a href={hrefViz('land-area')}>{t(txt.densityLink)}</a>.
        </p>
      )}
      <p className="chart-note muted">{t(txt.ukraine)}</p>
    </>
  );
}

function RegionShareStrip({ dataset }: { dataset: PopDataset }) {
  const { t, lang } = useLang();
  const titleId = useId();
  const shares = useMemo(() => regionShares(dataset), [dataset]);
  const segments = useMemo(
    (): StripSegment[] =>
      shares.map((g) => ({
        key: g.region,
        label: t(REGION_LABELS[g.region]),
        value: g.value,
        valueLabel: formatShare(g.share, lang),
        color: REGION_COLOR[g.region],
        tooltip: {
          title: t(REGION_LABELS[g.region]),
          lines: [fill(t(txt.shareTip), { share: formatShare(g.share, lang), count: g.count, value: formatCountCompact(g.value, lang) })],
        },
      })),
    [shares, t, lang],
  );
  return (
    <section className="race-share" aria-labelledby={titleId}>
      <h3 className="race-share-title" id={titleId}>
        {t(txt.shareTitle)}
      </h3>
      <Strip segments={segments} label={t(txt.shareLabel)} barHeight={28} />
    </section>
  );
}

type TableProps = { rows: readonly RankedPopRow[]; metric: Metric; withNotes: boolean; caption: string };

function PopulationTable({ rows, metric, withNotes, caption }: TableProps) {
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
            {metric === 'density' && (
              <th scope="col" className="num">
                {t(txt.colDensity)}
              </th>
            )}
            <th scope="col" className="num">
              {t(txt.colPopulation)}
            </th>
            {metric === 'population' ? (
              <th scope="col" className="num">
                {t(txt.colShare)}
              </th>
            ) : (
              <th scope="col" className="num">
                {t(txt.colLand)}
              </th>
            )}
            {withNotes && <th scope="col">{t(txt.colNote)}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = flagUrl(r.code);
            const notes = rowNotes(r, metric, t);
            const mark = notes.length ? '*' : '';
            return (
              <tr key={r.code}>
                <td className="num">{r.rank ?? '—'}</td>
                <th scope="row">
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(r.code, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                </td>
                {metric === 'density' && (
                  <td className="num">
                    {r.density === null ? '—' : formatNumber(Math.round(r.density * 10) / 10, lang)}
                    {mark}
                  </td>
                )}
                <td className="num">
                  {formatNumber(r.population, lang)}
                  {metric === 'population' ? mark : ''}
                </td>
                {metric === 'population' ? (
                  <td className="num">{formatShare(r.share, lang)}</td>
                ) : (
                  <td className="num">{r.landArea === null ? '—' : formatNumber(r.landArea, lang)}</td>
                )}
                {withNotes && <td className="muted">{notes.join(' ')}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

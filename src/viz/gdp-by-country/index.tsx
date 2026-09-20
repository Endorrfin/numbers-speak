// gdp-by-country — the golden visualization (S2): the template every later port copies.
// Layers: data.ts (contract + parser) → state.ts (URL state) → this page (controls, chart, table).
// CHANGED (S3-gdp): metric sub-tabs (GDP | GDP per capita) × year (2023–2025 | 2024–2025), one lazy file each;
// values that are not World Bank figures for the year are kept and marked with * (tooltip + table note).
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
import {
  formatMultiple,
  formatShare,
  formatUsdBillions,
  formatUsdCompact,
  formatUsdTick,
  formatUsdWhole,
} from '../../lib/format';
import { paginate } from '../../lib/paginate';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { METRICS, YEARS, dataFile, metricOf, parseGdpDataset, rankGdp } from './data';
import type { GdpDataset, Metric, RankedGdpRow, ValueNote } from './data';
import { PAGE_SIZE, parseGdpState, toGdpParams } from './state';
import type { GdpState } from './state';

type L = { en: string; uk: string };
type T = (v: L) => string;

// One stable parser per file: useDataset re-runs its effect when `parse` changes identity.
const parsers = new Map<string, (json: unknown) => GdpDataset>();
function parserFor(metric: Metric, year: number): (json: unknown) => GdpDataset {
  const file = dataFile(metric, year);
  let p = parsers.get(file);
  if (!p) {
    p = (json: unknown) => parseGdpDataset(json, file, metric);
    parsers.set(file, p);
  }
  return p;
}

const txt = {
  metric: { en: 'Indicator', uk: 'Показник' },
  year: { en: 'Year', uk: 'Рік' },
  tab: {
    total: { en: 'GDP', uk: 'ВВП' },
    'per-capita': { en: 'GDP per capita', uk: 'ВВП на душу населення' },
  },
  chartLabel: {
    total: {
      en: 'Horizontal bar chart: GDP of {region}, {year}, ranks {from} to {to} of {total}. Largest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: ВВП ({region}), {year}, місця {from}–{to} з {total}. Найбільший: {top}. Таблиця містить усі значення.',
    },
    'per-capita': {
      en: 'Horizontal bar chart: GDP per capita of {region}, {year}, ranks {from} to {to} of {total}. Highest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: ВВП на душу населення ({region}), {year}, місця {from}–{to} з {total}. Найвищий: {top}. Таблиця містить усі значення.',
    },
  },
  worldTotal: { en: 'World GDP, {year}: {value}', uk: 'Світовий ВВП, {year}: {value}' },
  regionTotal: {
    en: '{region}: {value} · {share} of the world',
    uk: '{region}: {value} · {share} світового',
  },
  worldAverage: {
    en: 'World average GDP per capita, {year}: {value}',
    uk: 'Середній світовий ВВП на душу населення, {year}: {value}',
  },
  colValue: {
    total: { en: 'GDP, US$ bn', uk: 'ВВП, млрд дол. США' },
    'per-capita': { en: 'GDP per capita, US$', uk: 'ВВП на душу, дол. США' },
  },
  colRatio: {
    total: { en: 'Share of world GDP', uk: 'Частка світового ВВП' },
    'per-capita': { en: '× world average', uk: '× світового середнього' },
  },
  colNote: { en: 'Note', uk: 'Примітка' },
  tipRank: { en: 'Rank: {rank} of {total}', uk: 'Місце: {rank} з {total}' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },
  tipValue: {
    total: { en: 'GDP: {value}', uk: 'ВВП: {value}' },
    'per-capita': { en: 'GDP per capita: {value}', uk: 'ВВП на душу: {value}' },
  },
  tipRatio: {
    total: { en: 'World share: {ratio}', uk: 'Частка у світі: {ratio}' },
    'per-capita': { en: 'World average: {ratio}', uk: 'Від світового середнього: {ratio}' },
  },
  tipNote: { en: '* {note}', uk: '* {note}' },
  noteSourceYear: { en: '{source} estimate for {year}', uk: 'оцінка {source} за {year}' },
  noteSource: { en: '{source} estimate', uk: 'оцінка {source}' },
  noteYear: { en: 'latest World Bank value, {year}', uk: 'останнє значення Світового банку, {year}' },
  source: { IMF: { en: 'IMF', uk: 'МВФ' }, UN: { en: 'UN', uk: 'ООН' } },
  rankNote2023: {
    en: 'Rank is the global rank, also when a region is selected. {count} economies with World Bank data for {year}; they add up to {covered} of world GDP.',
    uk: 'Місце — глобальне, навіть коли вибрано регіон. {count} економік з даними Світового банку за {year}; разом — {covered} світового ВВП.',
  },
  rankNoteTotal: {
    en: 'Rank is the global rank, also when a region is selected. {count} economies; the world total is their sum.',
    uk: 'Місце — глобальне, навіть коли вибрано регіон. {count} економік; світовий ВВП — їхня сума.',
  },
  rankNotePerCapita: {
    en: 'Rank is the global rank, also when a region is selected. {count} economies; the world average is weighted by population (their total GDP ÷ their total population).',
    uk: 'Місце — глобальне, навіть коли вибрано регіон. {count} економік; світове середнє зважене за населенням (їхній сумарний ВВП ÷ їхнє сумарне населення).',
  },
  marked: {
    en: '{count} values marked * are not World Bank figures for {year}: an IMF or UN estimate, or the latest earlier year. They are kept so the ranking has no holes.',
    uk: '{count} значень із позначкою * — не дані Світового банку за {year}: оцінка МВФ чи ООН або останній доступний попередній рік. Їх збережено, щоб у рейтингу не було пропусків.',
  },
  tableCaption: {
    total: { en: 'GDP by country, {year} — {region}', uk: 'ВВП країн, {year} — {region}' },
    'per-capita': {
      en: 'GDP per capita by country, {year} — {region}',
      uk: 'ВВП на душу населення за країнами, {year} — {region}',
    },
  },
} as const;

function noteText(note: ValueNote, t: T): string {
  const source = note.source ? t(txt.source[note.source]) : undefined;
  if (source && note.year !== undefined) return fill(t(txt.noteSourceYear), { source, year: note.year });
  if (source) return fill(t(txt.noteSource), { source });
  return fill(t(txt.noteYear), { year: note.year ?? '' });
}

function formatRatio(metric: Metric, r: number, lang: Lang): string {
  return metric === 'total' ? formatShare(r, lang) : formatMultiple(r, lang);
}

function toBarRow(r: RankedGdpRow, metric: Metric, lang: Lang, total: number, t: T): RankedBarRow {
  const name = countryName(r.code, lang);
  const value = formatUsdCompact(r.value, lang);
  const ratio = formatRatio(metric, r.ratio, lang);
  const lines = [
    fill(t(txt.tipRank), { rank: r.rank, total }),
    fill(t(txt.tipRegion), { region: t(REGION_LABELS[r.region]) }),
    fill(t(txt.tipValue[metric]), { value }),
    fill(t(txt.tipRatio[metric]), { ratio }),
  ];
  if (r.note) lines.push(fill(t(txt.tipNote), { note: noteText(r.note, t) }));
  return {
    key: r.code,
    label: `${r.rank}  ${name}`,
    value: r.value,
    color: REGION_COLOR[r.region],
    valueLabel: `${value}${r.note ? '*' : ''} · ${ratio}`,
    imageUrl: flagUrl(r.code),
    tooltip: { title: name, lines },
  };
}

export default function GdpByCountry({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const base = useId();
  const settings = useMemo(() => parseGdpState(params), [params]);
  const state = useDataset(
    dataUrl('gdp-by-country', dataFile(settings.metric, settings.year)),
    parserFor(settings.metric, settings.year),
  );
  const update = useCallback(
    (patch: Partial<GdpState>) => setParams(toGdpParams({ ...settings, ...patch })),
    [settings, setParams],
  );

  // The metric and year switches stay on screen while a file loads, so the page never jumps away.
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
  } else body = <GdpView dataset={state.data} settings={settings} update={update} />;

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
                  // Keep the year when the other metric has it; otherwise state.ts falls back to the latest.
                  onChange={() => update({ metric: m, page: 1 })}
                />
                {t(txt.tab[m])}
              </label>
            ))}
          </div>
        </div>
        <div className="field field-auto">
          <span className="field-label" id={`${base}-year`}>
            {t(txt.year)}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${base}-year`}>
            {YEARS[settings.metric].map((y) => (
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

type ViewProps = {
  dataset: GdpDataset;
  settings: GdpState;
  update: (patch: Partial<GdpState>) => void;
};

function GdpView({ dataset, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const metric = metricOf(dataset);
  const ranked = useMemo(() => rankGdp(dataset), [dataset]);
  const filtered = useMemo(
    () => (settings.region === 'all' ? ranked : ranked.filter((r) => r.region === settings.region)),
    [ranked, settings.region],
  );
  const page = useMemo(() => paginate(filtered, settings.page, PAGE_SIZE), [filtered, settings.page]);
  const pageItems = page.items;
  const rows = useMemo(
    () => pageItems.map((r) => toBarRow(r, metric, lang, ranked.length, t)),
    [pageItems, metric, lang, ranked.length, t],
  );
  const tickFormat = useCallback((v: number) => formatUsdTick(v, lang), [lang]);

  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const marked = ranked.filter((r) => r.note).length;
  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel[metric]), {
    region: regionName,
    year: dataset.year,
    from: page.from,
    to: page.to,
    total: page.total,
    top: top ? `${countryName(top.code, lang)}, ${formatUsdCompact(top.value, lang)}` : '—',
  });
  const pageOptions = Array.from({ length: page.pages }, (_, i) => {
    const from = i * PAGE_SIZE + 1;
    return { value: i + 1, label: `${from}–${Math.min(from + PAGE_SIZE - 1, page.total)}` };
  });

  let summary: string;
  let rankNote: string;
  if (dataset.indicator === 'NY.GDP.MKTP.CD') {
    const filteredSum = filtered.reduce((s, r) => s + r.value, 0);
    const covered = ranked.reduce((s, r) => s + r.value, 0) / dataset.worldTotal;
    summary =
      settings.region === 'all'
        ? fill(t(txt.worldTotal), { year: dataset.year, value: formatUsdCompact(dataset.worldTotal, lang) })
        : fill(t(txt.regionTotal), {
            region: regionName,
            value: formatUsdCompact(filteredSum, lang),
            share: formatShare(filteredSum / dataset.worldTotal, lang),
          });
    // 2023 is shared against the WB "World" aggregate; later years against the sum of the listed economies.
    rankNote =
      covered < 0.9995
        ? fill(t(txt.rankNote2023), { count: ranked.length, year: dataset.year, covered: formatShare(covered, lang) })
        : fill(t(txt.rankNoteTotal), { count: ranked.length });
  } else {
    summary = fill(t(txt.worldAverage), { year: dataset.year, value: formatUsdCompact(dataset.worldAverage, lang) });
    rankNote = fill(t(txt.rankNotePerCapita), { count: ranked.length });
  }

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
              <select
                id={`${base}-page`}
                value={page.page}
                onChange={(e) => update({ page: Number(e.target.value) })}
              >
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
          : fill(t(ui.showingAll), { total: page.total })}
        {' · '}
        {summary}
      </p>

      {settings.view === 'chart' ? (
        <RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} />
      ) : (
        <GdpTable
          rows={filtered}
          metric={metric}
          withNotes={marked > 0}
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

      <p className="chart-note muted">
        {rankNote}
        {marked > 0 && ` ${fill(t(txt.marked), { count: marked, year: dataset.year })}`}
      </p>
    </>
  );
}

type TableProps = { rows: readonly RankedGdpRow[]; metric: Metric; withNotes: boolean; caption: string };

function GdpTable({ rows, metric, withNotes, caption }: TableProps) {
  const { t, lang } = useLang();
  const formatCell = metric === 'total' ? formatUsdBillions : formatUsdWhole;
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
              {t(txt.colValue[metric])}
            </th>
            <th scope="col" className="num">
              {t(txt.colRatio[metric])}
            </th>
            {withNotes && <th scope="col">{t(txt.colNote)}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = flagUrl(r.code);
            return (
              <tr key={r.code}>
                <td className="num">{r.rank}</td>
                <th scope="row">
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />}{' '}
                  {countryName(r.code, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" />{' '}
                  {t(REGION_LABELS[r.region])}
                </td>
                <td className="num">
                  {formatCell(r.value, lang)}
                  {r.note ? '*' : ''}
                </td>
                <td className="num">{formatRatio(metric, r.ratio, lang)}</td>
                {withNotes && <td className="muted">{r.note ? noteText(r.note, t) : ''}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

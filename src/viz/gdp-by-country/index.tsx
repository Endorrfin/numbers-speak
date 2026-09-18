// gdp-by-country — the golden visualization (S2): the template every later port copies.
// Layers: data.ts (contract + parser) → state.ts (URL state) → this page (controls, chart, table).
import { useCallback, useId, useMemo } from 'react';
import { RankedBar } from '../../charts/RankedBar';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import { REGION_COLOR } from '../../charts/palette';
import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { formatShare, formatUsdBillions, formatUsdCompact, formatUsdTick } from '../../lib/format';
import { paginate } from '../../lib/paginate';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE, parseGdpDataset, rankGdp } from './data';
import type { GdpDataset, RankedGdpRow } from './data';
import { PAGE_SIZE, parseGdpState, toGdpParams } from './state';
import type { GdpState } from './state';

const DATA_URL = dataUrl('gdp-by-country', DATA_FILE);
const parse = (json: unknown): GdpDataset => parseGdpDataset(json);

const txt = {
  chartLabel: {
    en: 'Horizontal bar chart: GDP of {region}, {year}, ranks {from} to {to} of {total}. Largest: {top}. The table view lists every value.',
    uk: 'Горизонтальна стовпчикова діаграма: ВВП ({region}), {year}, місця {from}–{to} з {total}. Найбільший: {top}. Таблиця містить усі значення.',
  },
  worldTotal: { en: 'World GDP, {year}: {value}', uk: 'Світовий ВВП, {year}: {value}' },
  regionTotal: {
    en: '{region}: {value} · {share} of the world',
    uk: '{region}: {value} · {share} світового',
  },
  gdp: { en: 'GDP, US$ bn', uk: 'ВВП, млрд дол. США' },
  share: { en: 'Share of world GDP', uk: 'Частка світового ВВП' },
  tipRank: { en: 'Rank: {rank} of {total}', uk: 'Місце: {rank} з {total}' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },
  tipGdp: { en: 'GDP: {value}', uk: 'ВВП: {value}' },
  tipShare: { en: 'World share: {share}', uk: 'Частка у світі: {share}' },
  rankNote: {
    en: 'Rank is the global rank, also when a region is selected. {count} economies with World Bank data for {year}; they add up to {covered} of world GDP.',
    uk: 'Місце — глобальне, навіть коли вибрано регіон. {count} економік з даними Світового банку за {year}; разом — {covered} світового ВВП.',
  },
  tableCaption: { en: 'GDP by country, {year} — {region}', uk: 'ВВП країн, {year} — {region}' },
} as const;

function toBarRow(r: RankedGdpRow, lang: Lang, total: number, t: (v: { en: string; uk: string }) => string): RankedBarRow {
  const name = countryName(r.code, lang);
  const value = formatUsdCompact(r.value, lang);
  const share = formatShare(r.share, lang);
  return {
    key: r.code,
    label: `${r.rank}  ${name}`,
    value: r.value,
    color: REGION_COLOR[r.region],
    valueLabel: `${value} · ${share}`,
    imageUrl: flagUrl(r.code),
    tooltip: {
      title: name,
      lines: [
        fill(t(txt.tipRank), { rank: r.rank, total }),
        fill(t(txt.tipRegion), { region: t(REGION_LABELS[r.region]) }),
        fill(t(txt.tipGdp), { value }),
        fill(t(txt.tipShare), { share }),
      ],
    },
  };
}

export default function GdpByCountry({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const state = useDataset(DATA_URL, parse);
  const settings = useMemo(() => parseGdpState(params), [params]);
  const update = useCallback(
    (patch: Partial<GdpState>) => setParams(toGdpParams({ ...settings, ...patch })),
    [settings, setParams],
  );

  if (state.status === 'loading') return <p className="muted stage-loading">{t(ui.loading)}</p>;
  if (state.status === 'error') {
    return (
      <div className="notice notice-warn load-error" role="alert">
        <p>{t(ui.dataLoadError)}</p>
        <button type="button" className="btn btn-ghost" onClick={state.retry}>
          {t(ui.retry)}
        </button>
      </div>
    );
  }
  return <GdpView dataset={state.data} settings={settings} update={update} />;
}

type ViewProps = {
  dataset: GdpDataset;
  settings: GdpState;
  update: (patch: Partial<GdpState>) => void;
};

function GdpView({ dataset, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const ranked = useMemo(() => rankGdp(dataset), [dataset]);
  const filtered = useMemo(
    () => (settings.region === 'all' ? ranked : ranked.filter((r) => r.region === settings.region)),
    [ranked, settings.region],
  );
  const page = useMemo(() => paginate(filtered, settings.page, PAGE_SIZE), [filtered, settings.page]);
  const pageItems = page.items;
  const rows = useMemo(
    () => pageItems.map((r) => toBarRow(r, lang, ranked.length, t)),
    [pageItems, lang, ranked.length, t],
  );
  const tickFormat = useCallback((v: number) => formatUsdTick(v, lang), [lang]);

  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const filteredSum = filtered.reduce((s, r) => s + r.value, 0);
  const covered = ranked.reduce((s, r) => s + r.value, 0) / dataset.worldTotal;
  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel), {
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

  return (
    <div className="viz-body">
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
        {settings.region === 'all'
          ? fill(t(txt.worldTotal), { year: dataset.year, value: formatUsdCompact(dataset.worldTotal, lang) })
          : fill(t(txt.regionTotal), {
              region: regionName,
              value: formatUsdCompact(filteredSum, lang),
              share: formatShare(filteredSum / dataset.worldTotal, lang),
            })}
      </p>

      {settings.view === 'chart' ? (
        <RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} />
      ) : (
        <GdpTable rows={filtered} caption={fill(t(txt.tableCaption), { year: dataset.year, region: regionName })} />
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
        {fill(t(txt.rankNote), { count: ranked.length, year: dataset.year, covered: formatShare(covered, lang) })}
      </p>
    </div>
  );
}

function GdpTable({ rows, caption }: { rows: readonly RankedGdpRow[]; caption: string }) {
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
              {t(txt.gdp)}
            </th>
            <th scope="col" className="num">
              {t(txt.share)}
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
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />}{' '}
                  {countryName(r.code, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" />{' '}
                  {t(REGION_LABELS[r.region])}
                </td>
                <td className="num">{formatUsdBillions(r.value, lang)}</td>
                <td className="num">{formatShare(r.share, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

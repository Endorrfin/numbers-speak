// land-area — total area and land area of 234 countries and territories (new entry, 2026-09-22).
// Layers: data.ts (contract + parser) → state.ts (URL state) → this page (controls, chart, strip, table).
// Two extra angles beyond the gdp-by-country template this page otherwise follows: a `Strip` showing each
// region's share of the world total, and a "By non-land share" sort (land metric only) that reorders the
// same ranking by how much of a country is water — or, for Greenland, permanent ice — instead of by size.
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
import { formatAreaCompact, formatAreaTick, formatAreaWhole, formatShare } from '../../lib/format';
import { paginate } from '../../lib/paginate';
import { Pager } from '../../components/viz/Pager';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE, METRICS, SORTS, parseAreaDataset, rankArea, regionShares } from './data';
import type { AreaDataset, Metric, NoteKind, RankedAreaRow } from './data';
import { PAGE_SIZE, parseLandAreaState, toLandAreaParams } from './state';
import type { LandAreaState } from './state';

type L = { en: string; uk: string };
type T = (v: L) => string;

// One file, one stable parser — no per-file cache needed (contrast gdp-by-country, which has several).
const parseLandArea = (json: unknown): AreaDataset => parseAreaDataset(json, DATA_FILE);

const txt = {
  metric: { en: 'Metric', uk: 'Показник' },
  tab: {
    land: { en: 'Land area', uk: 'Площа суходолу' },
    total: { en: 'Total area', uk: 'Загальна площа' },
  },
  sort: { en: 'Sort', uk: 'Сортування' },
  sortTab: {
    area: { en: 'By area', uk: 'За площею' },
    nonland: { en: 'By non-land share', uk: 'За часткою не-суходолу' },
  },
  chartLabel: {
    en: 'Horizontal bar chart: {metricLabel} of {region}, ranks {from} to {to} of {total}. Largest: {top}. The table view lists every value.',
    uk: 'Горизонтальна стовпчикова діаграма: {metricLabel} ({region}), місця {from}–{to} з {total}. Найбільша: {top}. Таблиця містить усі значення.',
  },
  worldTotal: {
    en: 'World total, listed countries and territories: {value}',
    uk: 'Світовий підсумок за переліченими країнами й територіями: {value}',
  },
  regionTotal: {
    en: '{region}: {value} · {share} of the world total',
    uk: '{region}: {value} · {share} світового підсумку',
  },
  colValue: { en: '{metricLabel}, km²', uk: '{metricLabel}, км²' },
  colShare: { en: 'Share of world', uk: 'Частка у світі' },
  colNote: { en: 'Note', uk: 'Примітка' },
  tipRank: { en: 'Rank: {rank} of {total}', uk: 'Місце: {rank} з {total}' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },
  tipValue: { en: '{metricLabel}: {value}', uk: '{metricLabel}: {value}' },
  tipShare: { en: 'World share: {share}', uk: 'Частка у світі: {share}' },
  tipNonLand: { en: 'Not land: {share} of total area', uk: 'Не суходіл: {share} загальної площі' },
  tipNote: { en: '* {note}', uk: '* {note}' },
  note: {
    'recognized-borders': {
      en: 'Area reflects internationally recognized borders — see “About the data”.',
      uk: 'Площа подана за міжнародно визнаними кордонами — див. «Про дані».',
    },
    definition: {
      en: 'The source reports a land area larger than the total area for this country, likely from two different territorial definitions. Shown as reported, not corrected.',
      uk: 'У джерелі площа суходолу цієї країни більша за загальну — ймовірно, це два різні визначення території. Наведено як у джерелі, без виправлень.',
    },
    'ice-sheet': {
      en: 'Land area excludes the permanent ice sheet (about 1.76 million km², roughly 81% of the total area).',
      uk: 'Площа суходолу не враховує постійний льодовий щит (близько 1,76 млн км², приблизно 81% загальної площі).',
    },
    corrected: {
      en: 'The source rounds area to whole km², which would show 0 for this country; replaced with a precisely sourced figure.',
      uk: 'У джерелі площу округлено до цілого км², через що ця країна мала б нульове значення; замінено на точно джерельну цифру.',
    },
  } satisfies Record<NoteKind, L>,
  aboutBorders: {
    en: 'Area reflects internationally recognized borders, not necessarily the territory a state actually controls. Ukraine’s figure (marked *) includes Crimea and the territories Russia has occupied since 2022 — both internationally recognized as part of Ukraine. Russia’s figure (marked *) does not include them.',
    uk: 'Площа подана за міжнародно визнаними кордонами, а не обов’язково за територією, яку держава фактично контролює. Показник України (позначено *) включає Крим і території, окуповані Росією з 2022 року, — обидва й далі міжнародно визнані частиною України. У показник Росії (позначено *) вони не входять.',
  },
  rankNote: {
    en: 'Rank is the global rank, also when a region is selected. {count} countries and territories; the world total is their sum, not an independently verified figure for the whole Earth.',
    uk: 'Місце — глобальне, навіть коли вибрано регіон. {count} країн і територій; світовий підсумок — їхня сума, а не незалежно перевірене значення для всієї Землі.',
  },
  marked: {
    en: '{count} rows are marked * — see the note in the table, or hover a bar.',
    uk: '{count} рядків позначено * — див. примітку в таблиці або підказку на стовпці.',
  },
  tableCaption: { en: '{metricLabel} by country — {region}', uk: '{metricLabel} країн — {region}' },
  shareTitle: { en: 'Share of the world total by region', uk: 'Частка світового підсумку за регіонами' },
  shareLabel: { en: 'Share of {metricLabel} by region', uk: 'Частка показника «{metricLabel}» за регіонами' },
  shareTip: {
    en: '{share} of the world total · {count} countries and territories · {value}',
    uk: '{share} світового підсумку · {count} країн і територій · {value}',
  },
  kpiTop10: { en: 'Top 10 share of the world total', uk: 'Частка топ-10 у світовому підсумку' },
  kpiLargest: { en: 'Largest: {value}', uk: 'Найбільша: {value}' },
  kpiSmallest: { en: 'Smallest: {value}', uk: 'Найменша: {value}' },
} as const;

function noteText(note: NoteKind, t: T): string {
  return t(txt.note[note]);
}

function toBarRow(r: RankedAreaRow, metric: Metric, lang: Lang, total: number, t: T, metricLabel: string): RankedBarRow {
  const name = countryName(r.code, lang);
  const value = formatAreaCompact(r.value, lang);
  const share = formatShare(r.share, lang);
  const lines = [
    fill(t(txt.tipRank), { rank: r.rank, total }),
    fill(t(txt.tipRegion), { region: t(REGION_LABELS[r.region]) }),
    fill(t(txt.tipValue), { metricLabel, value }),
    fill(t(txt.tipShare), { share }),
  ];
  if (metric === 'land' && r.nonLandShare > 0) {
    lines.push(fill(t(txt.tipNonLand), { share: formatShare(r.nonLandShare, lang) }));
  }
  if (r.note) lines.push(fill(t(txt.tipNote), { note: noteText(r.note, t) }));
  return {
    key: r.code,
    label: `${r.rank}  ${name}`,
    value: r.value,
    color: REGION_COLOR[r.region],
    valueLabel: `${value}${r.note ? '*' : ''} · ${share}`,
    imageUrl: flagUrl(r.code),
    tooltip: { title: name, lines },
  };
}

export default function LandArea({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const base = useId();
  const settings = useMemo(() => parseLandAreaState(params), [params]);
  const state = useDataset(dataUrl('land-area', DATA_FILE), parseLandArea);
  const update = useCallback(
    (patch: Partial<LandAreaState>) => setParams(toLandAreaParams({ ...settings, ...patch })),
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
  } else body = <LandAreaView dataset={state.data} settings={settings} update={update} />;

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
        {settings.metric === 'land' && (
          <div className="field field-auto">
            <span className="field-label" id={`${base}-sort`}>
              {t(txt.sort)}
            </span>
            <div className="segmented" role="radiogroup" aria-labelledby={`${base}-sort`}>
              {SORTS.map((s) => (
                <label key={s} className={settings.sort === s ? 'is-on' : undefined}>
                  <input
                    type="radio"
                    name={`${base}-sort`}
                    value={s}
                    checked={settings.sort === s}
                    onChange={() => update({ sort: s, page: 1 })}
                  />
                  {t(txt.sortTab[s])}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      {body}
    </div>
  );
}

type ViewProps = {
  dataset: AreaDataset;
  settings: LandAreaState;
  update: (patch: Partial<LandAreaState>) => void;
};

function LandAreaView({ dataset, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const metric = settings.metric;
  const metricLabel = t(txt.tab[metric]);
  const worldTotal = metric === 'land' ? dataset.landWorld : dataset.totalWorld;

  const ranked = useMemo(() => rankArea(dataset, metric, settings.sort), [dataset, metric, settings.sort]);
  // KPIs always describe the size ranking, independent of the active sort (so switching to
  // "By non-land share" never changes what "Largest" and "Top 10" mean).
  const byArea = useMemo(() => rankArea(dataset, metric, 'area'), [dataset, metric]);

  const filtered = useMemo(
    () => (settings.region === 'all' ? ranked : ranked.filter((r) => r.region === settings.region)),
    [ranked, settings.region],
  );
  const page = useMemo(() => paginate(filtered, settings.page, PAGE_SIZE), [filtered, settings.page]);
  const pageItems = page.items;
  const rows = useMemo(
    () => pageItems.map((r) => toBarRow(r, metric, lang, ranked.length, t, metricLabel)),
    [pageItems, metric, lang, ranked.length, t, metricLabel],
  );
  const tickFormat = useCallback((v: number) => formatAreaTick(v, lang), [lang]);

  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const markedCount = ranked.filter((r) => r.note).length;
  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel), {
    metricLabel,
    region: regionName,
    from: page.from,
    to: page.to,
    total: page.total,
    top: top ? `${countryName(top.code, lang)}, ${formatAreaCompact(top.value, lang)}` : '—',
  });

  const filteredSum = filtered.reduce((s, r) => s + r.value, 0);
  const summary =
    settings.region === 'all'
      ? fill(t(txt.worldTotal), { value: formatAreaCompact(worldTotal, lang) })
      : fill(t(txt.regionTotal), {
          region: regionName,
          value: formatAreaCompact(filteredSum, lang),
          share: formatShare(filteredSum / worldTotal, lang),
        });
  const rankNote = fill(t(txt.rankNote), { count: ranked.length });

  const top10Share = byArea.slice(0, 10).reduce((s, r) => s + r.value, 0) / worldTotal;
  const largest = byArea[0];
  const smallest = byArea[byArea.length - 1];

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
        <>
          <RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} />
          <RegionShareStrip dataset={dataset} metric={metric} metricLabel={metricLabel} />
        </>
      ) : (
        <LandAreaTable
          rows={filtered}
          metricLabel={metricLabel}
          withNotes={markedCount > 0}
          caption={fill(t(txt.tableCaption), { metricLabel, region: regionName })}
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

      <ul className="kpi-row" aria-label={t(txt.kpiTop10)}>
        <li className="kpi">
          <span className="kpi-value">{formatShare(top10Share, lang)}</span>
          <span className="kpi-label">{t(txt.kpiTop10)}</span>
        </li>
        {largest && (
          <li className="kpi">
            <span className="kpi-value">{countryName(largest.code, lang)}</span>
            <span className="kpi-label">{fill(t(txt.kpiLargest), { value: formatAreaCompact(largest.value, lang) })}</span>
          </li>
        )}
        {smallest && (
          <li className="kpi">
            <span className="kpi-value">{countryName(smallest.code, lang)}</span>
            <span className="kpi-label">{fill(t(txt.kpiSmallest), { value: formatAreaCompact(smallest.value, lang) })}</span>
          </li>
        )}
      </ul>

      <p className="chart-note muted">
        {rankNote}
        {markedCount > 0 && ` ${fill(t(txt.marked), { count: markedCount })}`}
      </p>
      <p className="chart-note muted">{t(txt.aboutBorders)}</p>
    </>
  );
}

function RegionShareStrip({ dataset, metric, metricLabel }: { dataset: AreaDataset; metric: Metric; metricLabel: string }) {
  const { t, lang } = useLang();
  const titleId = useId();
  const shares = useMemo(() => regionShares(dataset, metric), [dataset, metric]);
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
          lines: [
            fill(t(txt.shareTip), { share: formatShare(g.share, lang), count: g.count, value: formatAreaCompact(g.value, lang) }),
          ],
        },
      })),
    [shares, t, lang],
  );
  return (
    <section className="race-share" aria-labelledby={titleId}>
      <h3 className="race-share-title" id={titleId}>
        {t(txt.shareTitle)}
      </h3>
      <Strip segments={segments} label={fill(t(txt.shareLabel), { metricLabel })} barHeight={28} />
    </section>
  );
}

type TableProps = { rows: readonly RankedAreaRow[]; metricLabel: string; withNotes: boolean; caption: string };

function LandAreaTable({ rows, metricLabel, withNotes, caption }: TableProps) {
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
              {fill(t(txt.colValue), { metricLabel })}
            </th>
            <th scope="col" className="num">
              {t(txt.colShare)}
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
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(r.code, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                </td>
                <td className="num">
                  {formatAreaWhole(r.value, lang)}
                  {r.note ? '*' : ''}
                </td>
                <td className="num">{formatShare(r.share, lang)}</td>
                {withNotes && <td className="muted">{r.note ? noteText(r.note, t) : ''}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

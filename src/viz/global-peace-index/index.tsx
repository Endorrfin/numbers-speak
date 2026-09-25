// global-peace-index — IEP Global Peace Index 2026 (S3-rb): 163 countries by overall score (lower = more
// peaceful), rank as printed (ties "=70"), change since the prior year. Layers: data.ts (contract + parser +
// ordering) → state.ts (URL state) → this page, on the shared RankedBar core with the crime-index paging /
// region filter / table pattern, plus an order switch (most or least peaceful first).
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
import { formatNumber, formatScore, formatScoreChange } from '../../lib/format';
import { paginate } from '../../lib/paginate';
import { Pager } from '../../components/viz/Pager';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE, SCORE_MAX, SCORE_MIN, gpiSummary, orderGpi, parseGpiDataset, rankLabel } from './data';
import type { GpiDataset, GpiRow, Order } from './data';
import { PAGE_SIZE, parseGpiState, toGpiParams } from './state';
import type { GpiState } from './state';

type L = { en: string; uk: string };
type T = (v: L) => string;

const REPORT_URL = 'https://www.visionofhumanity.org/wp-content/uploads/2026/06/Global-Peace-Index-2026-Report.pdf';

const txt = {
  order: { en: 'Order', uk: 'Порядок' },
  orders: {
    most: { en: 'Most peaceful first', uk: 'Спершу наймирніші' },
    least: { en: 'Least peaceful first', uk: 'Спершу найменш мирні' },
  } satisfies Record<Order, L>,
  chartLabel: {
    // CHANGED (S3-fx): scale ends from data.ts; says that the bars start at the scale's floor, not at 0.
    en: 'Horizontal bar chart: Global Peace Index 2026 overall score ({min}–{max}, lower = more peaceful; bars start at {min}), {region}, {order}, rows {from} to {to} of {total}. First: {first}. The table view lists every value.',
    uk: 'Горизонтальна стовпчикова діаграма: загальний бал Глобального індексу миру 2026 ({min}–{max}, нижчий = мирніше; стовпці від {min}), {region}, {order}, рядки {from}–{to} з {total}. Перший: {first}. Таблиця містить усі значення.',
  },
  // CHANGED (S3-fx): axis title — GPI's scale starts at 1 (most peaceful possible), so the bars do too.
  axisLabel: {
    en: 'Score on a {min}–{max} scale · bars start at {min}',
    uk: 'Бал за шкалою {min}–{max} · стовпці від {min}',
  },
  summary: {
    en: 'Lower score = more peaceful · since last year {deteriorated} countries became less peaceful, {improved} more peaceful',
    uk: 'Нижчий бал = мирніше · за рік {deteriorated} країн стали менш мирними, {improved} — мирнішими',
  },
  regionCount: { en: '{region}: {count}', uk: '{region}: {count}' },
  colScore: { en: 'Score', uk: 'Бал' },
  colScoreChange: { en: 'Score change', uk: 'Зміна балу' },
  colRankChange: { en: 'Places', uk: 'Місця' },
  colNote: { en: 'Note', uk: 'Примітка' },
  tipRank: { en: 'Rank: {rank} of {total}', uk: 'Місце: {rank} з {total}' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },
  tipScore: { en: 'Score: {score} (1 = most peaceful, 5 = least)', uk: 'Бал: {score} (1 — наймирніше, 5 — найменш мирно)' },
  tipChange: { en: 'Since last year: {places} · score {change}', uk: 'За рік: {places} · бал {change}' },
  up: { en: 'up {n}', uk: 'вгору на {n}' },
  down: { en: 'down {n}', uk: 'вниз на {n}' },
  same: { en: 'same rank', uk: 'те саме місце' },
  tied: { en: 'tied', uk: 'поділене місце' },
  regionalRank: {
    en: 'The report’s regional table and text: rank {rank}, level with {partner} ({score}).',
    uk: 'Регіональна таблиця й текст звіту: місце {rank}, як і {partner} ({score}).',
  },
  rankNote: { en: 'Rank is the global rank, also when a region is selected.', uk: 'Місце — глобальне, навіть коли вибрано регіон.' },
  scaleNote: {
    en: 'Overall score on IEP’s {min}–{max} scale from 23 indicators; tied scores share a rank (=70). ▲/▼ = places moved since the prior year as given in the 2026 report (IEP recalculates past years, so it can differ from the 2025 edition).',
    uk: 'Загальний бал за шкалою IEP {min}–{max} з 23 показників; однаковий бал — спільне місце (=70). ▲/▼ — на скільки місць змінилася позиція порівняно з попереднім роком за звітом 2026 року (IEP перераховує минулі роки, тож це може відрізнятися від випуску 2025).',
  },
  sourceNote: {
    en: 'Source: Institute for Economics & Peace, Global Peace Index 2026: Identifying and measuring the factors that drive peace, Sydney, June 2026 — used for educational, non-commercial purposes with acknowledgement of IEP.',
    uk: 'Джерело: Institute for Economics & Peace, Global Peace Index 2026: Identifying and measuring the factors that drive peace, Sydney, June 2026; використано в освітніх, некомерційних цілях із зазначенням IEP.',
  },
  sourceLink: { en: 'The report (PDF)', uk: 'Звіт (PDF)' },
  tableCaption: { en: 'Global Peace Index 2026 by country — {region}, {order}', uk: 'Глобальний індекс миру 2026 за країнами — {region}, {order}' },
} as const;

function places(r: GpiRow, t: T): string {
  if (r.rankChange === 0) return t(txt.same);
  return fill(t(r.rankChange > 0 ? txt.up : txt.down), { n: Math.abs(r.rankChange) });
}

/** "▲2" · "▼1" · "±0" — the compact form for bar labels and the table. */
function arrow(r: GpiRow): string {
  if (r.rankChange === 0) return '±0';
  return `${r.rankChange > 0 ? '▲' : '▼'}${Math.abs(r.rankChange)}`;
}

/** Honduras: the report's own tables disagree on its rank — say so, naming the country with the same score. */
function rowNote(r: GpiRow, all: readonly GpiRow[], lang: Lang, t: T): string {
  if (r.regionalRank === undefined) return '';
  const partner = all.find((x) => x.score === r.score && x.code !== r.code);
  return fill(t(txt.regionalRank), {
    rank: r.regionalRank,
    partner: partner ? countryName(partner.code, lang) : '—',
    score: formatScore(r.score, lang),
  });
}

function toBarRow(r: GpiRow, all: readonly GpiRow[], lang: Lang, t: T): RankedBarRow {
  const name = countryName(r.code, lang);
  const note = rowNote(r, all, lang, t);
  const total = all.length;
  const rank = rankLabel(r);
  const lines = [
    fill(t(txt.tipRank), { rank: r.tied ? `${rank} (${t(txt.tied)})` : rank, total }),
    fill(t(txt.tipRegion), { region: t(REGION_LABELS[r.region]) }),
    fill(t(txt.tipScore), { score: formatScore(r.score, lang) }),
    fill(t(txt.tipChange), { places: places(r, t), change: formatScoreChange(r.scoreChange, lang) }),
  ];
  if (note) lines.push(`* ${note}`);
  return {
    key: r.code,
    label: `${rank}  ${name}`,
    value: r.score,
    color: REGION_COLOR[r.region],
    valueLabel: `${formatScore(r.score, lang)}${note ? '*' : ''} · ${arrow(r)}`,
    imageUrl: flagUrl(r.code),
    tooltip: { title: name, lines },
  };
}

export default function GlobalPeaceIndex({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const settings = useMemo(() => parseGpiState(params), [params]);
  const state = useDataset(dataUrl('global-peace-index', DATA_FILE), parseGpiDataset);
  const update = useCallback((patch: Partial<GpiState>) => setParams(toGpiParams({ ...settings, ...patch })), [settings, setParams]);

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
  } else body = <GpiView data={state.data} settings={settings} update={update} />;

  return <div className="viz-body">{body}</div>;
}

type ViewProps = { data: GpiDataset; settings: GpiState; update: (patch: Partial<GpiState>) => void };

function GpiView({ data, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const all = data.rows;
  const filtered = useMemo(() => {
    const inRegion = settings.region === 'all' ? all : all.filter((r) => r.region === settings.region);
    return orderGpi(inRegion, settings.order);
  }, [all, settings.region, settings.order]);
  const page = useMemo(() => paginate(filtered, settings.page, PAGE_SIZE), [filtered, settings.page]);
  const pageItems = page.items;
  const rows = useMemo(() => pageItems.map((r) => toBarRow(r, all, lang, t)), [pageItems, all, lang, t]);
  const tickFormat = useCallback((v: number) => formatNumber(v, lang), [lang]);

  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const orderName = t(txt.orders[settings.order]).toLowerCase();
  const first = pageItems[0];
  const scale = { min: formatNumber(SCORE_MIN, lang), max: formatNumber(SCORE_MAX, lang) }; // CHANGED (S3-fx)
  const chartLabel = fill(t(txt.chartLabel), {
    ...scale,
    region: regionName,
    order: orderName,
    from: page.from,
    to: page.to,
    total: page.total,
    first: first ? `${rankLabel(first)} ${countryName(first.code, lang)}, ${formatScore(first.score, lang)}` : '—',
  });
  const s = gpiSummary(all);
  const summary =
    settings.region === 'all'
      ? fill(t(txt.summary), { deteriorated: s.deteriorated, improved: s.improved })
      : fill(t(txt.regionCount), { region: regionName, count: filtered.length });
  const withNotes = all.some((r) => r.regionalRank !== undefined);

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-auto">
          <span className="field-label" id={`${base}-order`}>
            {t(txt.order)}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${base}-order`}>
            {(['most', 'least'] as const).map((o) => (
              <label key={o} className={settings.order === o ? 'is-on' : undefined}>
                <input type="radio" name={`${base}-order`} value={o} checked={settings.order === o} onChange={() => update({ order: o, page: 1 })} />
                {t(txt.orders[o])}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${base}-region`}>{t(ui.region)}</label>
          <select id={`${base}-region`} value={settings.region} onChange={(e) => update({ region: e.target.value as Region | 'all', page: 1 })}>
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
                <input type="radio" name={`${base}-view`} value={v} checked={settings.view === v} onChange={() => update({ view: v })} />
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
        // CHANGED (S3-fx): bars from SCORE_MIN (data.ts), not 0 — page 1 (1.161–1.538) no longer looks flat
        <RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} baseline={SCORE_MIN} axisLabel={fill(t(txt.axisLabel), scale)} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption>{fill(t(txt.tableCaption), { region: regionName, order: orderName })}</caption>
            <thead>
              <tr>
                <th scope="col" className="num">
                  {t(ui.rank)}
                </th>
                <th scope="col">{t(ui.country)}</th>
                <th scope="col">{t(ui.region)}</th>
                <th scope="col" className="num">
                  {t(txt.colScore)}
                </th>
                <th scope="col" className="num">
                  {t(txt.colScoreChange)}
                </th>
                <th scope="col" className="num">
                  {t(txt.colRankChange)}
                </th>
                {withNotes && <th scope="col">{t(txt.colNote)}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const flag = flagUrl(r.code);
                const note = rowNote(r, all, lang, t);
                return (
                  <tr key={r.code}>
                    <td className="num">{rankLabel(r)}</td>
                    <th scope="row">
                      {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(r.code, lang)}
                    </th>
                    <td>
                      <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                    </td>
                    <td className="num">
                      {formatScore(r.score, lang)}
                      {note ? '*' : ''}
                    </td>
                    <td className="num">{formatScoreChange(r.scoreChange, lang)}</td>
                    <td className="num" title={places(r, t)}>
                      {arrow(r)}
                    </td>
                    {withNotes && <td className="muted">{note}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ul className="legend" aria-label={t(ui.legend)}>
        {REGIONS.map((r) => {
          const on = settings.region === r;
          return (
            <li key={r}>
              <button type="button" className="legend-item" aria-pressed={on} onClick={() => update({ region: on ? 'all' : r, page: 1 })}>
                <span className="swatch" style={{ background: REGION_COLOR[r] }} aria-hidden="true" />
                {t(REGION_LABELS[r])}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="chart-note muted">{t(txt.rankNote)}</p>
      <p className="chart-note muted">{fill(t(txt.scaleNote), { min: SCORE_MIN, max: SCORE_MAX })}</p>
      <p className="chart-note muted">
        {t(txt.sourceNote)}{' '}
        <a href={REPORT_URL} rel="noopener noreferrer" target="_blank">
          {t(txt.sourceLink)}
        </a>
      </p>
    </>
  );
}

// births-deaths-per-day — born and died per day in 235 countries, 2026 (S3-bdd, CATALOG #5).
// Layers: data.ts (contract + derivations) → state.ts (URL state) → this page (clock, KPIs, butterfly, table).
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Butterfly } from '../../charts/Butterfly';
import type { ButterflyRow } from '../../charts/renderButterfly';
import { DEMO_COLOR, REGION_COLOR } from '../../charts/palette';
import type { Localized, VizBodyProps } from '../../catalog/types';
import { localeOf, useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { formatNumber } from '../../lib/format';
import { hrefViz } from '../../lib/hashRouter';
import { paginate } from '../../lib/paginate';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
// CHANGED (S3-bdd2): applyView (region + "only shrinking" + sort) replaces the inline filter.
import { DATA_FILE, SORTS, applyView, countSince, parsePerDayDataset, rankPerDay, summarizeWorld } from './data';
import type { PerDayDataset, RankedPerDayRow, Sort, WorldSummary } from './data';
import { PAGE_SIZE, pageOf, parsePerDayState, toPerDayParams } from './state';
import type { PerDayState } from './state';

const DATA_URL = dataUrl('births-deaths-per-day', DATA_FILE);
const parse = (json: unknown): PerDayDataset => parsePerDayDataset(json);
/** The reader's own country on a Ukrainian site: outlined in the chart, a KPI and a "find" button. */
const HOME = 'UA';

const txt = {
  clockTitle: { en: 'Since you opened this page', uk: 'Відколи ви відкрили цю сторінку' },
  born: { en: 'born', uk: 'народилося' },
  died: { en: 'died', uk: 'померло' },
  grew: { en: 'more people in the world', uk: 'людей більше у світі' },
  perSecond: {
    en: 'Every second ≈ {b} births and {d} deaths worldwide.',
    uk: 'Щосекунди у світі ≈ {b} народження і {d} смерті.',
  },
  pause: { en: 'Pause', uk: 'Пауза' },
  resume: { en: 'Resume', uk: 'Продовжити' },
  clockLabel: { en: 'Live world counter', uk: 'Живий світовий лічильник' },
  perDayTitle: { en: 'Every day in {year}', uk: 'Щодня у {year} році' },
  splitLabel: {
    en: 'Every day in {year}: {b} births and {d} deaths — births are {share} of all these events.',
    uk: 'Щодня у {year} році: {b} народжень і {d} смертей — народження становлять {share} цих подій.',
  },
  splitBorn: { en: 'born per day', uk: 'народжуються щодня' },
  splitDied: { en: 'die per day', uk: 'помирають щодня' },
  headline: { en: 'Key numbers', uk: 'Головні числа' },
  kpiNet: { en: 'natural growth of the world per day (≈ {year} a year)', uk: 'природний приріст світу за добу (≈ {year} за рік)' },
  kpiShrinking: {
    en: 'of {total} countries and territories: more deaths than births',
    uk: 'з {total} країн і територій: смертей більше, ніж народжень',
  },
  kpiHome: {
    en: '{name}: deaths per birth ({b} born · {d} die per day)',
    uk: '{name}: смертей на одне народження ({b} народж. · {d} смертей за добу)',
  },
  kpiBirths: { en: 'births per day, world', uk: 'народжень за добу, світ' },
  kpiDeaths: { en: 'deaths per day, world', uk: 'смертей за добу, світ' },
  million: { en: '{v} million', uk: '{v} млн' },
  findHome: { en: 'Find {name}', uk: 'Знайти: {name}' },
  bornSide: { en: 'Born per day', uk: 'Народжуються за добу' },
  diedSide: { en: 'Die per day', uk: 'Помирають за добу' },
  keyBirths: { en: 'Births per day', uk: 'Народження за добу' },
  keyDeaths: { en: 'Deaths per day', uk: 'Смерті за добу' },
  keyTint: { en: 'Tinted row — more deaths than births', uk: 'Тонований рядок — смертей більше, ніж народжень' },
  keyHome: { en: 'Outlined — {name}', uk: 'В рамці — {name}' },
  chartLabel: {
    en: 'Butterfly bar chart: births (left) and deaths (right) per day, {region}, {year}, rows {from} to {to} of {total}, sorted by {order}. First on this page: {top}. The table view lists every value.',
    uk: 'Діаграма-метелик: народження (ліворуч) і смерті (праворуч) за добу, {region}, {year}, рядки {from}–{to} з {total}, сортування: {order}. Перша на сторінці: {top}. Таблиця містить усі значення.',
  },
  regionTotal: {
    en: '{region}: {b} born · {d} die per day',
    uk: '{region}: {b} народжуються · {d} помирають за добу',
  },
  worldTotal: { en: 'World: {b} born · {d} die per day', uk: 'Світ: {b} народжуються · {d} помирають за добу' },
  tipRank: { en: 'Rank by births: {rank} of {total}', uk: 'Місце за народженнями: {rank} з {total}' },
  tipBorn: { en: 'Born per day: {v} (≈ {h} an hour)', uk: 'Народжуються за добу: {v} (≈ {h} за годину)' },
  tipDied: { en: 'Die per day: {v} (≈ {h} an hour)', uk: 'Помирають за добу: {v} (≈ {h} за годину)' },
  tipNet: { en: 'Natural change per day: {v}', uk: 'Природний приріст за добу: {v}' },
  tipRatio: { en: 'Deaths per birth: {v}', uk: 'Смертей на одне народження: {v}' },
  tipPop: { en: 'Population, {year}: {v}', uk: 'Населення, {year}: {v}' },
  tableCaption: { en: 'Births and deaths per day, {year} — {region}', uk: 'Народження і смерті за добу, {year} — {region}' },
  colBirths: { en: 'Births / day', uk: 'Народж. / добу' },
  colDeaths: { en: 'Deaths / day', uk: 'Смертей / добу' },
  colNet: { en: 'Natural change / day', uk: 'Природний приріст / добу' },
  colRatio: { en: 'Deaths per birth', uk: 'Смертей на 1 народж.' },
  colPop: { en: 'Population', uk: 'Населення' },
  noteModel: {
    en: 'These are UN estimates for {year} (World Population Prospects 2024: annual totals ÷ 365), not registered events. Countries are counted within internationally recognised borders.',
    uk: 'Це оцінки ООН на {year} рік (World Population Prospects 2024: річні значення ÷ 365), а не зареєстровані події. Країни враховано в міжнародно визнаних кордонах.',
  },
  noteHome: {
    en: 'For Ukraine registered data are much lower — 168.8k births and 485.3k deaths in 2025 (≈ 462 and 1,330 per day), on the territory where registration works.',
    uk: 'Для України зареєстровані дані значно нижчі — 168,8 тис. народжень і 485,3 тис. смертей у 2025 році (≈ 462 і 1 330 за добу) на території, де працює реєстрація.',
  },
  noteLink: { en: 'Births and deaths in Ukraine, 1990–2025 →', uk: 'Народжуваність і смертність в Україні, 1990–2025 →' },
  regions: { en: 'Regions', uk: 'Регіони' },
  sort: { en: 'Sort', uk: 'Сортування' },
  sortBirths: { en: 'Births ↓', uk: 'Народження ↓' },
  sortRatio: { en: 'Deaths per birth ↓', uk: 'Смертей на 1 народження ↓' },
  sortNet: { en: 'Natural change: biggest loss first', uk: 'Природний приріст: найбільші втрати' },
  onlyShrinking: { en: 'Only where deaths > births', uk: 'Лише де смертей більше' },
  onlyShrinkingOn: { en: 'Deaths > births ({n})', uk: 'Смертей більше ({n})' },
  filterNote: {
    en: '{n} countries and territories where more people die than are born, {order}.',
    uk: '{n} країн і територій, де помирає більше людей, ніж народжується, {order}.',
  },
  orderRatio: { en: 'most deaths per birth first', uk: 'спершу найбільше смертей на одне народження' },
  orderNet: { en: 'biggest daily loss first', uk: 'спершу найбільші добові втрати' },
  orderBirths: { en: 'most births first', uk: 'спершу найбільше народжень' },
  rankNote: {
    en: 'Rank is the global rank by births per day, also when a region is selected. Ten small territories have 0 births per day after rounding.',
    uk: 'Місце — глобальне, за кількістю народжень на добу, навіть коли вибрано регіон. Десять малих територій після округлення мають 0 народжень на добу.',
  },
} as const satisfies Record<string, Localized>;

/** Sort keys: the label in the control and the phrase used in the chart's accessible name. */
const SORT_TEXT: Readonly<Record<Sort, { option: Localized; order: Localized }>> = {
  births: { option: txt.sortBirths, order: txt.orderBirths },
  ratio: { option: txt.sortRatio, order: txt.orderRatio },
  net: { option: txt.sortNet, order: txt.orderNet },
};

// ── Formatters (cached per language) ─────────────────────────────────────────────────────────────
const cache = new Map<string, Intl.NumberFormat>();
function nf(lang: Lang, key: string, o: Intl.NumberFormatOptions): Intl.NumberFormat {
  const id = `${lang}:${key}`;
  let f = cache.get(id);
  if (!f) {
    f = new Intl.NumberFormat(localeOf(lang), o);
    cache.set(id, f);
  }
  return f;
}
const persons = (v: number, lang: Lang): string => formatNumber(v, lang);
/** Typographic minus (U+2212), as elsewhere on the site: '+188,520' / '−780'. */
const signed = (v: number, lang: Lang): string =>
  nf(lang, 'signed', { signDisplay: 'exceptZero' }).format(v).replace('-', '\u2212');
const ratio = (v: number | null, lang: Lang): string =>
  v === null ? '—' : nf(lang, 'ratio', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const oneDecimal = (v: number, lang: Lang): string =>
  nf(lang, 'one', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
const tick = (v: number, lang: Lang): string => nf(lang, 'tick', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const share = (v: number, lang: Lang): string => nf(lang, 'pct', { style: 'percent', maximumFractionDigits: 0 }).format(v);
const perHour = (perDay: number, lang: Lang): string =>
  perDay >= 24 ? persons(Math.round(perDay / 24), lang) : oneDecimal(perDay / 24, lang);

export default function BirthsDeathsPerDay({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const state = useDataset(DATA_URL, parse);
  const settings = useMemo(() => parsePerDayState(params), [params]);
  const update = useCallback(
    (patch: Partial<PerDayState>) => setParams(toPerDayParams({ ...settings, ...patch })),
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
  return <PerDayView dataset={state.data} settings={settings} update={update} />;
}

type ViewProps = {
  dataset: PerDayDataset;
  settings: PerDayState;
  update: (patch: Partial<PerDayState>) => void;
};

function PerDayView({ dataset, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const ranked = useMemo(() => rankPerDay(dataset), [dataset]);
  const world = useMemo(() => summarizeWorld(ranked), [ranked]);
  const home = ranked.find((r) => r.code === HOME);
  const homeName = countryName(HOME, lang);
  const filtered = useMemo(
    () =>
      applyView(ranked, {
        region: settings.region,
        onlyShrinking: settings.only === 'shrinking',
        sort: settings.sort,
      }),
    [ranked, settings.region, settings.only, settings.sort],
  );
  const page = useMemo(() => paginate(filtered, settings.page, PAGE_SIZE), [filtered, settings.page]);
  const pageItems = page.items;
  const total = ranked.length;
  const shrinkingOn = settings.only === 'shrinking';
  // CHANGED (S3-bdd2): with the "deaths > births" filter on every row qualifies, so the tint says nothing.
  const rows = useMemo(
    () => pageItems.map((r) => toButterflyRow(r, lang, total, dataset.year, t, !shrinkingOn)),
    [pageItems, lang, total, dataset.year, t, shrinkingOn],
  );
  const tickFormat = useCallback((v: number) => tick(v, lang), [lang]);
  const homePage = pageOf(filtered, HOME);
  // Turning the filter on also switches to the order that makes it readable; turning it off restores births.
  const toggleShrinking = (): void =>
    update(shrinkingOn ? { only: 'all', sort: 'births', page: 1 } : { only: 'shrinking', sort: 'ratio', page: 1 });

  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const sum = (k: 'births' | 'deaths'): number => filtered.reduce((s, r) => s + r[k], 0);
  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel), {
    region: regionName,
    year: dataset.year,
    from: page.from,
    to: page.to,
    total: page.total,
    top: top ? `${countryName(top.code, lang)}, ${persons(top.births, lang)} / ${persons(top.deaths, lang)}` : '—',
    order: t(SORT_TEXT[settings.sort].order),
  });
  const pageOptions = Array.from({ length: page.pages }, (_, i) => {
    const from = i * PAGE_SIZE + 1;
    return { value: i + 1, label: `${from}–${Math.min(from + PAGE_SIZE - 1, page.total)}` };
  });

  return (
    <div className="viz-body">
      <WorldClock world={world} year={dataset.year} />

      <ul className="kpi-row" aria-label={t(txt.headline)}>
        <li className="kpi kpi-birth">
          <span className="kpi-value">{persons(world.births, lang)}</span>
          <span className="kpi-label">{t(txt.kpiBirths)}</span>
        </li>
        <li className="kpi kpi-death">
          <span className="kpi-value">{persons(world.deaths, lang)}</span>
          <span className="kpi-label">{t(txt.kpiDeaths)}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{signed(world.net, lang)}</span>
          <span className="kpi-label">
            {fill(t(txt.kpiNet), { year: fill(t(txt.million), { v: oneDecimal((world.net * 365) / 1e6, lang) }) })}
          </span>
        </li>
        <li className={`kpi kpi-action${shrinkingOn ? ' is-on' : ''}`}>
          {/* CHANGED (S3-bdd2): the KPI is the shortcut to the filter it describes. */}
          <button type="button" className="kpi-button" aria-pressed={shrinkingOn} onClick={toggleShrinking}>
            <span className="kpi-value">{world.shrinking}</span>
            <span className="kpi-label">{fill(t(txt.kpiShrinking), { total: world.countries })}</span>
            <span className="kpi-cta">{shrinkingOn ? t(ui.clearFilters) : t(txt.onlyShrinking)}</span>
          </button>
        </li>
        {home && (
          <li className="kpi kpi-home">
            <span className="kpi-value">{ratio(home.ratio, lang)}×</span>
            <span className="kpi-label">
              {fill(t(txt.kpiHome), { name: homeName, b: persons(home.births, lang), d: persons(home.deaths, lang) })}
            </span>
          </li>
        )}
      </ul>

      {/* CHANGED (S3-bdd2): regions in one click (buttons, not a select) + the "deaths > births" filter. */}
      <div className="field field-chips">
        <span className="field-label" id={`${base}-regions`}>
          {t(txt.regions)}
        </span>
        <ul className="legend chip-row" aria-labelledby={`${base}-regions`}>
          <li>
            <button
              type="button"
              className="legend-item"
              aria-pressed={settings.region === 'all'}
              onClick={() => update({ region: 'all', page: 1 })}
            >
              {t(ui.allRegions)}
            </button>
          </li>
          {REGIONS.map((r) => (
            <li key={r}>
              <button
                type="button"
                className="legend-item"
                aria-pressed={settings.region === r}
                onClick={() => update({ region: settings.region === r ? 'all' : r, page: 1 })}
              >
                <span className="swatch" style={{ background: REGION_COLOR[r] }} aria-hidden="true" />
                {t(REGION_LABELS[r])}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="legend-item legend-item-shrinking"
              aria-pressed={shrinkingOn}
              onClick={toggleShrinking}
            >
              <span className="swatch swatch-tint" aria-hidden="true" />
              {fill(t(txt.onlyShrinkingOn), { n: world.shrinking })}
            </button>
          </li>
        </ul>
      </div>

      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field">
          <label htmlFor={`${base}-sort`}>{t(txt.sort)}</label>
          <select
            id={`${base}-sort`}
            value={settings.sort}
            onChange={(e) => update({ sort: e.target.value as Sort, page: 1 })}
          >
            {SORTS.map((k) => (
              <option key={k} value={k}>
                {t(SORT_TEXT[k].option)}
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

        {settings.view === 'chart' && homePage !== null && (
          <div className="field field-auto">
            <span className="field-label" aria-hidden="true">
              &nbsp;
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={homePage === page.page}
              onClick={() => update({ page: homePage })}
            >
              {fill(t(txt.findHome), { name: homeName })}
            </button>
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
        {shrinkingOn
          ? fill(t(txt.filterNote), { n: page.total, order: t(SORT_TEXT[settings.sort].order) })
          : settings.region === 'all'
            ? fill(t(txt.worldTotal), { b: persons(world.births, lang), d: persons(world.deaths, lang) })
            : fill(t(txt.regionTotal), { region: regionName, b: persons(sum('births'), lang), d: persons(sum('deaths'), lang) })}
      </p>

      {settings.view === 'chart' ? (
        <>
          <ul className="key-list" aria-label={t(ui.legend)}>
            <li>
              <span className="swatch" style={{ background: DEMO_COLOR.births }} aria-hidden="true" />
              {t(txt.keyBirths)}
            </li>
            <li>
              <span className="swatch" style={{ background: DEMO_COLOR.deaths }} aria-hidden="true" />
              {t(txt.keyDeaths)}
            </li>
            {!shrinkingOn && (
              <li>
                <span className="swatch swatch-tint" aria-hidden="true" />
                {t(txt.keyTint)}
              </li>
            )}
            <li>
              <span className="swatch swatch-home" aria-hidden="true" />
              {fill(t(txt.keyHome), { name: homeName })}
            </li>
          </ul>
          <Butterfly
            rows={rows}
            label={chartLabel}
            tickFormat={tickFormat}
            leftColor={DEMO_COLOR.births}
            rightColor={DEMO_COLOR.deaths}
            leftTitle={t(txt.bornSide)}
            rightTitle={t(txt.diedSide)}
          />
        </>
      ) : (
        <PerDayTable
          rows={filtered}
          year={dataset.year}
          caption={fill(t(txt.tableCaption), { year: dataset.year, region: regionName })}
        />
      )}

      <p className="chart-note muted">{t(txt.rankNote)}</p>

      <div className="notice coverage-note">
        <p>{fill(t(txt.noteModel), { year: dataset.year })}</p>
        <p>
          {t(txt.noteHome)} <a href={hrefViz('births-deaths-ua')}>{t(txt.noteLink)}</a>
        </p>
      </div>
    </div>
  );
}

type T = (v: Localized) => string;

function toButterflyRow(
  r: RankedPerDayRow,
  lang: Lang,
  total: number,
  year: number,
  t: T,
  tintShrinking: boolean,
): ButterflyRow {
  const name = countryName(r.code, lang);
  return {
    key: r.code,
    label: `${r.rank}  ${name}`,
    left: r.births,
    right: r.deaths,
    leftLabel: persons(r.births, lang),
    rightLabel: persons(r.deaths, lang),
    imageUrl: flagUrl(r.code),
    tint: tintShrinking && r.deaths > r.births,
    highlight: r.code === HOME,
    tooltip: {
      title: name,
      lines: [
        fill(t(txt.tipRank), { rank: r.rank, total }),
        fill(t(txt.tipBorn), { v: persons(r.births, lang), h: perHour(r.births, lang) }),
        fill(t(txt.tipDied), { v: persons(r.deaths, lang), h: perHour(r.deaths, lang) }),
        fill(t(txt.tipNet), { v: signed(r.net, lang) }),
        fill(t(txt.tipRatio), { v: ratio(r.ratio, lang) }),
        fill(t(txt.tipPop), { year, v: persons(r.population, lang) }),
      ],
    },
  };
}

/**
 * Live counter since the page opened. Text only (no motion), updated 4× a second; a Pause button meets
 * WCAG 2.2.2 (auto-updating content). role="timer" keeps screen readers quiet (implicit aria-live="off").
 * SSR and the first client render show zeros, so hydration never mismatches.
 */
function WorldClock({ world, year }: { world: WorldSummary; year: number }) {
  const { t, lang } = useLang();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const origin = useRef<number | null>(null);
  const banked = useRef(0);
  const titleId = useId();

  useEffect(() => {
    if (!running) return;
    origin.current = performance.now();
    const read = (): number => banked.current + (performance.now() - (origin.current ?? performance.now())) / 1000;
    const id = window.setInterval(() => setSeconds(read()), 250);
    return () => {
      window.clearInterval(id);
      banked.current = read();
    };
  }, [running]);

  const born = countSince(seconds, world.births);
  const died = countSince(seconds, world.deaths);
  const birthShare = world.births / (world.births + world.deaths);

  return (
    <section className="pd-clock" aria-labelledby={titleId}>
      <div className="pd-clock-head">
        <h2 id={titleId} className="pd-clock-title">
          {t(txt.clockTitle)}
        </h2>
        <button type="button" className="btn btn-ghost pd-clock-toggle" aria-pressed={!running} onClick={() => setRunning((r) => !r)}>
          {running ? `⏸ ${t(txt.pause)}` : `▶ ${t(txt.resume)}`}
        </button>
      </div>
      <div className="pd-counts" role="timer" aria-label={t(txt.clockLabel)}>
        <div className="pd-count pd-count-birth">
          <span className="pd-count-value">{persons(born, lang)}</span>
          <span className="pd-count-label">{t(txt.born)}</span>
        </div>
        <div className="pd-count pd-count-death">
          <span className="pd-count-value">{persons(died, lang)}</span>
          <span className="pd-count-label">{t(txt.died)}</span>
        </div>
        <div className="pd-count pd-count-net">
          <span className="pd-count-value">{signed(born - died, lang)}</span>
          <span className="pd-count-label">{t(txt.grew)}</span>
        </div>
      </div>
      <p className="pd-clock-rate">
        {fill(t(txt.perSecond), { b: oneDecimal(world.birthsPerSecond, lang), d: oneDecimal(world.deathsPerSecond, lang) })}
      </p>

      <h3 className="pd-split-title">{fill(t(txt.perDayTitle), { year })}</h3>
      <div
        className="pd-split"
        role="img"
        aria-label={fill(t(txt.splitLabel), {
          year,
          b: persons(world.births, lang),
          d: persons(world.deaths, lang),
          share: share(birthShare, lang),
        })}
      >
        <div className="pd-split-bar">
          <span className="pd-split-birth" style={{ flexGrow: world.births }} />
          <span className="pd-split-death" style={{ flexGrow: world.deaths }} />
        </div>
        <div className="pd-split-labels" aria-hidden="true">
          <span>
            <b>{persons(world.births, lang)}</b> {t(txt.splitBorn)}
          </span>
          <span>
            <b>{persons(world.deaths, lang)}</b> {t(txt.splitDied)}
          </span>
        </div>
      </div>
    </section>
  );
}

function PerDayTable({ rows, year, caption }: { rows: readonly RankedPerDayRow[]; year: number; caption: string }) {
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
              {t(txt.colBirths)}
            </th>
            <th scope="col" className="num">
              {t(txt.colDeaths)}
            </th>
            <th scope="col" className="num">
              {t(txt.colNet)}
            </th>
            <th scope="col" className="num">
              {t(txt.colRatio)}
            </th>
            <th scope="col" className="num">
              {t(txt.colPop)}, {year}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = flagUrl(r.code);
            return (
              <tr key={r.code} className={r.code === HOME ? 'is-home' : undefined}>
                <td className="num">{r.rank}</td>
                <th scope="row">
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />}{' '}
                  {countryName(r.code, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" />{' '}
                  {t(REGION_LABELS[r.region])}
                </td>
                <td className="num">{persons(r.births, lang)}</td>
                <td className="num">{persons(r.deaths, lang)}</td>
                <td className="num">{signed(r.net, lang)}</td>
                <td className="num">{ratio(r.ratio, lang)}</td>
                <td className="num">{persons(r.population, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

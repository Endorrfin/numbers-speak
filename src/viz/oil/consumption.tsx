// consumption.tsx — CHANGED (S3-oil): angle A, oil consumption by country in the EI's latest year (2025), in kb/d or in
// barrels per person a year (population joined at runtime from the population-by-country entry, like its density).
// Ukraine in focus (shared CountryFocus, ?focus=), region filter, Pager, table with the ten-year change.
import { useCallback, useId, useMemo } from 'react';
import { RankedBar } from '../../charts/RankedBar';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import { REGION_COLOR } from '../../charts/palette';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { focusText } from '../../components/viz/focusText';
import { CountryFocus } from '../../components/viz/CountryFocus';
import { Pager } from '../../components/viz/Pager';
import { countryName, flagUrl } from '../../lib/countries';
import { resolveFocus } from '../../lib/focus';
import { formatBarrels, formatChangePct, formatKbd, formatKbdTick, formatNumber, formatShare } from '../../lib/format';
import { hrefViz } from '../../lib/hashRouter';
import { paginate } from '../../lib/paginate';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE as POP_FILE, parsePopDataset } from '../population-by-country/data';
import type { PopDataset } from '../population-by-country/data';
import { DataState } from './common';
import type { AngleProps } from './common';
import { CONSUMPTION_METRICS, FILES, changeFrom, parseConsumption, rankConsumption, worldPerCapita } from './data';
import type { ConsumptionDataset, ConsumptionMetric, RankedConsumer } from './data';
import { PAGE_SIZE } from './state';
import { txt as shared } from './text';

type L = { en: string; uk: string };
type T = (v: L) => string;

const parseCons = (json: unknown): ConsumptionDataset => parseConsumption(json, FILES.consumption);
const parsePop = (json: unknown): PopDataset => parsePopDataset(json, POP_FILE);

const txt = {
  metric: { en: 'Measure', uk: 'Показник' },
  tab: {
    total: { en: 'Barrels a day', uk: 'Барелів на добу' },
    'per-capita': { en: 'Per person', uk: 'На одну людину' },
  },
  chartLabel: {
    total: {
      en: 'Horizontal bar chart: oil consumption in {year}, barrels a day, {region}, ranks {from} to {to} of {total}. Largest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: споживання нафти у {year} році, барелів на добу ({region}), місця {from}–{to} з {total}. Найбільше: {top}. Таблиця містить усі значення.',
    },
    'per-capita': {
      en: 'Horizontal bar chart: oil consumption per person in {year}, barrels a year, {region}, ranks {from} to {to} of {total}. Highest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: споживання нафти на одну людину у {year} році, барелів на рік ({region}), місця {from}–{to} з {total}. Найбільше: {top}. Таблиця містить усі значення.',
    },
  },
  axisPerCapita: { en: 'Barrels per person a year', uk: 'Барелів на людину на рік' },
  status: { en: 'World, {year}: {value} · {change} vs {prev}', uk: 'Світ, {year}: {value} · {change} до {prev}' },
  statusRegion: { en: '{region}: {value} · {share} of the world', uk: '{region}: {value} · {share} світового споживання' },
  statusPerCapita: { en: 'World, {year}: {value} per person', uk: 'Світ, {year}: {value} на людину' },
  tipUse: { en: 'Consumption, {year}: {value} · {share} of the world', uk: 'Споживання, {year}: {value} · {share} світу' },
  tipPerCapita: { en: 'Per person: {value} a year', uk: 'На людину: {value} на рік' },
  tipBefore: { en: '{year}: {value} ({change})', uk: '{year}: {value} ({change})' },
  colUse: { en: 'Consumption, kb/d', uk: 'Споживання, тис. б/д' },
  colShare: { en: 'Share of world', uk: 'Частка у світі' },
  colPerCapita: { en: 'Barrels per person a year', uk: 'Барелів на людину на рік' },
  colBefore: { en: '{year}, kb/d', uk: '{year}, тис. б/д' },
  colChange: { en: 'Change since {year}', uk: 'Зміна з {year}' },
  tableCaption: {
    en: 'Oil consumption by country, {year} — {region}',
    uk: 'Споживання нафти за країнами, {year} — {region}',
  },
  kpiWorld: { en: 'World oil consumption, {year}', uk: 'Світове споживання нафти, {year}' },
  kpiTop2: { en: '{a} + {b}: share of the world', uk: '{a} + {b}: частка світу' },
  kpiListed: { en: 'Countries listed by the EI: share of the world', uk: 'Країни, які наводить EI: частка світу' },
  kpiWorldPc: { en: 'World, barrels per person a year', uk: 'Світ, барелів на людину на рік' },
  kpiTopPc: { en: 'Highest per person: {value}', uk: 'Найбільше на людину: {value}' },
  kpiLowPc: { en: 'Lowest per person: {value}', uk: 'Найменше на людину: {value}' },
  noPop: { en: 'No population figure in “Population by country”, so no per-person value.', uk: 'У записі «Населення країн» немає цієї території, тож значення на людину немає.' },
  defNote: {
    en: 'Consumption = inland demand + international aviation and marine bunkers + refinery fuel and loss; biofuels excluded (EI definition). The EI lists {count} countries one by one; the rest of the world ({rest}, {restShare}) is published only as regional “other” totals, so those countries are not ranked. Every year comes from one edition (2026) — the EI revises its history in every edition.',
    uk: 'Споживання = внутрішній попит + міжнародне авіаційне й морське бункерне паливо + паливо та втрати НПЗ, без біопалива (визначення EI). EI наводить {count} країн окремо; решта світу ({rest}, {restShare}) публікується лише як регіональні «інші», тож ці країни не мають місця в рейтингу. Усі роки — з одного видання (2026): EI переглядає історію в кожному виданні.',
  },
  perCapitaHow: {
    en: 'Per person = consumption × days in the year ÷ population on 1 July {year} (UN WPP 2024, from',
    uk: 'На людину = споживання × днів у році ÷ населення на 1 липня {year} року (ООН, WPP 2024, із запису',
  },
  perCapitaLink: { en: 'Population by country', uk: 'Населення країн' },
  bunkers: {
    en: 'Fuel for international ships and aircraft counts in the country that sells it, which lifts shipping and aviation hubs per person — the top of this list is {top}.',
    uk: 'Паливо для міжнародних суден і літаків зараховують країні, яка його продає, тож морські й авіаційні хаби мають високе значення на людину — першим у цьому списку є {top}.',
  },
  homeHistory: {
    en: '{name}: {a} in {y0}, {b} in {y1} ({change}).',
    uk: '{name}: {a} у {y0} році, {b} у {y1} ({change}).',
  },
} as const;

function value(r: RankedConsumer, metric: ConsumptionMetric, lang: Lang): string {
  if (metric === 'total') return formatKbd(r.kbd, lang);
  return r.perCapita === null ? '—' : formatBarrels(r.perCapita, lang);
}

function toBarRow(r: RankedConsumer, metric: ConsumptionMetric, ds: ConsumptionDataset, total: number, lang: Lang, t: T): RankedBarRow {
  const name = countryName(r.code, lang);
  const lines = [
    fill(t(shared.tipRank), { rank: r.rank ?? '—', total }),
    fill(t(shared.tipRegion), { region: t(REGION_LABELS[r.region]) }),
    fill(t(txt.tipUse), { year: ds.to, value: formatKbd(r.kbd, lang), share: formatShare(r.share, lang) }),
  ];
  if (r.perCapita !== null) lines.push(fill(t(txt.tipPerCapita), { value: formatBarrels(r.perCapita, lang) }));
  if (r.before !== null && r.change !== null) {
    lines.push(fill(t(txt.tipBefore), { year: changeFrom(ds), value: formatKbd(r.before, lang), change: formatChangePct(r.change, lang) }));
  }
  return {
    key: r.code,
    label: `${r.rank ?? '—'}  ${name}`,
    value: r.value ?? 0,
    color: REGION_COLOR[r.region],
    valueLabel: metric === 'total' ? `${value(r, metric, lang)} · ${formatShare(r.share, lang)}` : value(r, metric, lang),
    imageUrl: flagUrl(r.code),
    tooltip: { title: name, lines },
  };
}

export function ConsumptionAngle({ settings, update }: AngleProps) {
  const cons = useDataset(dataUrl('oil', FILES.consumption), parseCons);
  // Population (≈ 9 kB) is requested with the page so the per-person tab opens at once; only that tab depends on it.
  const pop = useDataset(dataUrl('population-by-country', POP_FILE), parsePop);
  const perCapita = settings.metric === 'per-capita';
  if (cons.status !== 'ready') return <DataState status={cons.status} retry={cons.status === 'error' ? cons.retry : undefined} />;
  if (perCapita && pop.status !== 'ready') return <DataState status={pop.status} retry={pop.status === 'error' ? pop.retry : undefined} />;
  return <ConsumptionView ds={cons.data} pop={pop.status === 'ready' ? pop.data : null} settings={settings} update={update} />;
}

type ViewProps = AngleProps & { ds: ConsumptionDataset; pop: PopDataset | null };

function ConsumptionView({ ds, pop, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const metric = settings.metric;
  const population = useMemo(() => (pop ? new Map(pop.rows.map((r) => [r.code, r.population])) : null), [pop]);

  // Population fills the per-person column in both tabs; only the per-person tab ranks by it.
  const ranked = useMemo(() => rankConsumption(ds, metric, population), [ds, metric, population]);
  const filtered = useMemo(() => (settings.region === 'all' ? ranked : ranked.filter((r) => r.region === settings.region)), [ranked, settings.region]);
  const charted = useMemo(() => filtered.filter((r) => r.value !== null), [filtered]);
  const chartedAll = useMemo(() => ranked.filter((r) => r.value !== null), [ranked]);
  const rankedCount = chartedAll.length;
  const focus = useMemo(() => resolveFocus(settings.focus, (c) => ranked.some((r) => r.code === c)), [settings.focus, ranked]);
  const hi = useMemo(() => new Set(focus), [focus]);
  const page = useMemo(() => paginate(charted, settings.page, PAGE_SIZE), [charted, settings.page]);
  const pageItems = page.items;
  const rows = useMemo(
    () => pageItems.map((r) => ({ ...toBarRow(r, metric, ds, rankedCount, lang, t), emphasis: hi.has(r.code) })),
    [pageItems, metric, ds, rankedCount, lang, t, hi],
  );
  const tickFormat = useCallback((v: number) => (metric === 'total' ? formatKbdTick(v, lang) : formatNumber(v, lang)), [metric, lang]);

  const last = ds.to - ds.from;
  const world = ds.world[last]!;
  const prevWorld = ds.world[last - 1]!;
  const listed = ranked.reduce((s, r) => s + r.kbd, 0);
  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const worldPc = worldPerCapita(ds, pop?.world ?? null);

  let summary: string;
  if (metric === 'per-capita') summary = fill(t(txt.statusPerCapita), { year: ds.to, value: worldPc === null ? '—' : formatBarrels(worldPc, lang) });
  else if (settings.region === 'all') {
    summary = fill(t(txt.status), { year: ds.to, value: formatKbd(world, lang), change: formatChangePct(world / prevWorld - 1, lang), prev: ds.to - 1 });
  } else {
    const sum = filtered.reduce((s, r) => s + r.kbd, 0);
    summary = fill(t(txt.statusRegion), { region: regionName, value: formatKbd(sum, lang), share: formatShare(sum / world, lang) });
  }

  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel[metric]), {
    year: ds.to,
    region: regionName,
    from: page.from,
    to: page.to,
    total: page.total,
    top: top ? `${countryName(top.code, lang)}, ${value(top, metric, lang)}` : '—',
  });

  const byTotal = metric === 'total' ? ranked : rankConsumption(ds, 'total', null);
  const [first, second] = byTotal;
  const homeRow = chartedAll.find((r) => hi.has(r.code));
  const homeTile = homeRow && {
    value: value(homeRow, metric, lang),
    label: fill(t(focusText.focusKpi), { name: countryName(homeRow.code, lang), rank: homeRow.rank ?? '—', total: rankedCount }),
  };
  const pcRanked = metric === 'per-capita' ? chartedAll : [];

  // The highlighted countries' own history, first year with a value → latest (from the data, any country).
  const histories = focus
    .map((code) => ds.rows.find((r) => r.code === code))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => {
      const i0 = r.values.findIndex((v) => v !== null);
      const a = r.values[i0]!;
      const b = r.values[last];
      if (b === null || b === undefined || i0 === last) return null;
      return fill(t(txt.homeHistory), {
        name: countryName(r.code, lang),
        a: formatKbd(a, lang),
        y0: ds.from + i0,
        b: formatKbd(b, lang),
        y1: ds.to,
        change: formatChangePct(b / a - 1, lang),
      });
    })
    .filter(Boolean);

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-subtabs">
          <span className="field-label" id={`${base}-metric`}>
            {t(txt.metric)}
          </span>
          <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-metric`}>
            {CONSUMPTION_METRICS.map((m) => (
              <label key={m} className={metric === m ? 'is-on' : undefined}>
                <input type="radio" name={`${base}-metric`} value={m} checked={metric === m} onChange={() => update({ metric: m, page: 1 })} />
                {t(txt.tab[m])}
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
        {settings.view === 'chart' && <Pager id={`${base}-page`} page={page} size={PAGE_SIZE} onPage={(p) => update({ page: p })} />}
      </div>

      <CountryFocus
        codes={focus}
        all={chartedAll}
        filtered={charted}
        region={settings.region}
        size={PAGE_SIZE}
        rankOf={(r) => r.rank ?? undefined}
        onFocus={(f) => update({ focus: f })}
        onJump={(to) => update({ ...to, view: 'chart' })}
      />

      <p className="viz-status" aria-live="polite">
        {settings.view === 'chart'
          ? fill(t(ui.showingRange), { from: page.from, to: page.to, total: page.total })
          : fill(t(ui.showingAll), { total: filtered.length })}
        {' · '}
        {summary}
      </p>

      {settings.view === 'chart' ? (
        <RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} axisLabel={metric === 'total' ? t(shared.kbdAxis) : t(txt.axisPerCapita)} />
      ) : (
        <ConsumptionTable rows={filtered} ds={ds} hi={hi} caption={fill(t(txt.tableCaption), { year: ds.to, region: regionName })} />
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

      <ul className="kpi-row" aria-label={fill(t(txt.kpiWorld), { year: ds.to })}>
        {metric === 'total' ? (
          <>
            <li className="kpi">
              <span className="kpi-value">{formatKbd(world, lang)}</span>
              <span className="kpi-label">{fill(t(txt.kpiWorld), { year: ds.to })}</span>
            </li>
            {first && second && (
              <li className="kpi">
                <span className="kpi-value">{formatShare(first.share + second.share, lang)}</span>
                <span className="kpi-label">{fill(t(txt.kpiTop2), { a: countryName(first.code, lang), b: countryName(second.code, lang) })}</span>
              </li>
            )}
            <li className="kpi">
              <span className="kpi-value">{formatShare(listed / world, lang)}</span>
              <span className="kpi-label">{t(txt.kpiListed)}</span>
            </li>
          </>
        ) : (
          <>
            <li className="kpi">
              <span className="kpi-value">{worldPc === null ? '—' : formatBarrels(worldPc, lang)}</span>
              <span className="kpi-label">{t(txt.kpiWorldPc)}</span>
            </li>
            {pcRanked[0] && (
              <li className="kpi">
                <span className="kpi-value">{countryName(pcRanked[0].code, lang)}</span>
                <span className="kpi-label">{fill(t(txt.kpiTopPc), { value: value(pcRanked[0], metric, lang) })}</span>
              </li>
            )}
            {pcRanked.at(-1) && (
              <li className="kpi">
                <span className="kpi-value">{countryName(pcRanked.at(-1)!.code, lang)}</span>
                <span className="kpi-label">{fill(t(txt.kpiLowPc), { value: value(pcRanked.at(-1)!, metric, lang) })}</span>
              </li>
            )}
          </>
        )}
        {homeTile && (
          <li className="kpi kpi-home">
            <span className="kpi-value">{homeTile.value}</span>
            <span className="kpi-label">{homeTile.label}</span>
          </li>
        )}
      </ul>

      {histories.length > 0 && <p className="chart-note">{histories.join(' ')}</p>}
      <p className="chart-note muted">
        {fill(t(txt.defNote), { count: ranked.length, rest: formatKbd(world - listed, lang), restShare: formatShare((world - listed) / world, lang) })}
      </p>
      {metric === 'per-capita' && (
        <p className="chart-note muted">
          {fill(t(txt.perCapitaHow), { year: ds.to })} <a href={hrefViz('population-by-country')}>{t(txt.perCapitaLink)}</a>).{' '}
          {pcRanked[0] && fill(t(txt.bunkers), { top: countryName(pcRanked[0].code, lang) })}
        </p>
      )}
    </>
  );
}

type TableProps = { rows: readonly RankedConsumer[]; ds: ConsumptionDataset; hi: ReadonlySet<string>; caption: string };

function ConsumptionTable({ rows, ds, hi, caption }: TableProps) {
  const { t, lang } = useLang();
  const prev = changeFrom(ds);
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
              {t(txt.colUse)}
            </th>
            <th scope="col" className="num">
              {t(txt.colShare)}
            </th>
            <th scope="col" className="num">
              {t(txt.colPerCapita)}
            </th>
            <th scope="col" className="num">
              {fill(t(txt.colBefore), { year: prev })}
            </th>
            <th scope="col" className="num">
              {fill(t(txt.colChange), { year: prev })}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = flagUrl(r.code);
            return (
              <tr key={r.code} className={hi.has(r.code) ? 'is-home' : undefined}>
                <td className="num">{r.rank ?? '—'}</td>
                <th scope="row">
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(r.code, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                </td>
                <td className="num">{formatNumber(Math.round(r.kbd), lang)}</td>
                <td className="num">{formatShare(r.share, lang)}</td>
                <td className="num" title={r.perCapita === null ? t(txt.noPop) : undefined}>
                  {r.perCapita === null ? '—' : formatNumber(Math.round(r.perCapita * 10) / 10, lang)}
                </td>
                <td className="num">{r.before === null ? '—' : formatNumber(Math.round(r.before), lang)}</td>
                <td className="num">{r.change === null ? '—' : formatChangePct(r.change, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

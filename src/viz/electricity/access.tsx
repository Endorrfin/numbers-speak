// access.tsx — CHANGED (S3-el): angle F, who lives without electricity (World Bank, 2024): the share of people with
// access (lowest first) or the number of people without (largest first). Ukraine in focus; region filter, Pager, table.
import { useCallback, useId, useMemo } from 'react';
import { RankedBar } from '../../charts/RankedBar';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import { REGION_COLOR } from '../../charts/palette';
import { focusText } from '../../components/viz/focusText';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { formatCountCompact, formatCountTick, formatDate, formatNumber, formatPercentTick, formatShare } from '../../lib/format';
import { REGION_LABELS } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DataState, RankingFrame } from './common';
import { star, useRanking } from './ranking';
import type { AngleProps } from './common';
import { ACCESS_METRICS, FILES, parseAccess, rankAccess, withoutAccess } from './data';
import type { AccessDataset, AccessMetric, RankedAccess } from './data';
import { accessMetric } from './state';
import { txt as shared } from './text';

type L = { en: string; uk: string };
type T = (v: L) => string;

const parse = (json: unknown): AccessDataset => parseAccess(json, FILES.access);

const txt = {
  tab: { share: { en: 'Share with access', uk: 'Частка з доступом' }, people: { en: 'People without', uk: 'Людей без доступу' } },
  chartLabel: {
    share: {
      en: 'Horizontal bar chart: share of people with access to electricity in {year}, {region}, lowest first, ranks {from} to {to} of {total}. Lowest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: частка людей з доступом до електрики у {year} році ({region}), найнижча спершу, місця {from}–{to} з {total}. Найнижча: {top}. Таблиця містить усі значення.',
    },
    people: {
      en: 'Horizontal bar chart: people without access to electricity in {year}, {region}, most first, ranks {from} to {to} of {total}. Most: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: людей без доступу до електрики у {year} році ({region}), найбільше спершу, місця {from}–{to} з {total}. Найбільше: {top}. Таблиця містить усі значення.',
    },
  },
  axis: { share: { en: 'Share of people with electricity', uk: 'Частка людей з електрикою' }, people: { en: 'People without electricity', uk: 'Людей без електрики' } },
  summary: { en: 'World, {year}: {access} with access · {without} people without', uk: 'Світ, {year}: {access} з доступом · {without} людей без нього' },
  tipAccess: { en: 'With access: {share}', uk: 'З доступом: {share}' },
  tipWithout: { en: 'Without: {count} people', uk: 'Без доступу: {count} людей' },
  tipFirst: { en: 'In {year}: {share}', uk: 'У {year} році: {share}' },
  tipYear: { en: '* Latest year with data: {year}', uk: '* Останній рік з даними: {year}' },
  colAccess: { en: 'With access', uk: 'З доступом' },
  colWithout: { en: 'People without', uk: 'Людей без доступу' },
  colFirst: { en: 'In {year}', uk: 'У {year}' },
  tableCaption: { en: 'Access to electricity, {year} — {region}', uk: 'Доступ до електрики, {year} — {region}' },
  kpiWorld: { en: 'People without electricity, {year}', uk: 'Людей без електрики, {year}' },
  kpiSsa: { en: 'Of them in Sub-Saharan Africa ({access} have access)', uk: 'З них в Африці на південь від Сахари (доступ має {access})' },
  kpiFull: { en: 'Countries where everyone has access', uk: 'Країн, де доступ мають усі' },
  dated: { en: '* Latest year with data ({years}); the others are {year}.', uk: '* Останній рік з даними ({years}); решта — {year}.' },
  note: {
    en: 'Access = the share of people living in a household connected to the grid or with an off-grid source (solar home systems, mini-grids) — not how reliable the supply is. People without = (100 % − share) × population; the world and Sub-Saharan Africa are the World Bank’s own aggregates.',
    uk: 'Доступ = частка людей у домогосподарствах, підключених до мережі або з автономним джерелом (домашні сонячні системи, міні-мережі), — а не те, наскільки надійне постачання. Людей без доступу = (100 % − частка) × населення; світ і Африка на південь від Сахари — власні агрегати Світового банку.',
  },
  credit: {
    en: 'Data: World Bank, World Development Indicators — EG.ELC.ACCS.ZS (from the Tracking SDG 7 report) and SP.POP.TOTL, CC BY 4.0, updated {date}.',
    uk: 'Дані: Світовий банк, World Development Indicators — EG.ELC.ACCS.ZS (зі звіту Tracking SDG 7) і SP.POP.TOTL, CC BY 4.0, оновлено {date}.',
  },
} as const;

function value(r: RankedAccess, metric: AccessMetric, lang: Lang): string {
  return metric === 'share' ? formatShare(r.access / 100, lang) : formatCountCompact(r.without, lang);
}

function toBarRow(r: RankedAccess, metric: AccessMetric, total: number, firstYear: number, lang: Lang, t: T): RankedBarRow {
  const name = countryName(r.code, lang);
  const lines = [
    fill(t(shared.tipRank), { rank: r.rank, total }),
    fill(t(shared.tipRegion), { region: t(REGION_LABELS[r.region]) }),
    fill(t(txt.tipAccess), { share: formatShare(r.access / 100, lang) }),
    fill(t(txt.tipWithout), { count: formatCountCompact(r.without, lang) }),
  ];
  if (r.first !== null) lines.push(fill(t(txt.tipFirst), { year: firstYear, share: formatShare(r.first / 100, lang) }));
  if (r.dated) lines.push(fill(t(txt.tipYear), { year: r.year }));
  return {
    key: r.code,
    label: `${r.rank}  ${name}${star(r)}`,
    value: r.value,
    color: REGION_COLOR[r.region],
    valueLabel: value(r, metric, lang),
    imageUrl: flagUrl(r.code),
    tooltip: { title: name, lines },
  };
}

export function AccessAngle({ settings, update }: AngleProps) {
  const state = useDataset(dataUrl('electricity', FILES.access), parse);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  return <AccessView ds={state.data} settings={settings} update={update} />;
}

function AccessView({ ds, settings, update }: AngleProps & { ds: AccessDataset }) {
  const { t, lang } = useLang();
  const base = useId();
  const metric = accessMetric(settings);
  const ranked = useMemo(() => rankAccess(ds, metric), [ds, metric]);
  const view = useRanking(ranked, settings);
  const pageItems = view.page.items;
  const rows = useMemo(
    () => pageItems.map((r) => ({ ...toBarRow(r, metric, ranked.length, ds.firstYear, lang, t), emphasis: view.hi.has(r.code) })),
    [pageItems, metric, ranked.length, ds.firstYear, lang, t, view.hi],
  );
  const tickFormat = useCallback((v: number) => (metric === 'share' ? formatPercentTick(v, lang) : formatCountTick(v, lang)), [metric, lang]);

  const worldWithout = withoutAccess(ds.world);
  const ssaWithout = withoutAccess(ds.ssa);
  const full = ds.rows.filter((r) => r.access >= 100).length;
  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel[metric]), {
    year: ds.year,
    region: view.regionName,
    from: view.page.from,
    to: view.page.to,
    total: view.page.total,
    top: top ? `${countryName(top.code, lang)}, ${value(top, metric, lang)}` : '—',
  });
  const home = view.home;
  const shown = settings.view === 'chart' ? pageItems : view.filtered;
  const datedRows = shown.filter((r) => r.dated);

  const measure = (
    <div className="field field-subtabs">
      <span className="field-label" id={`${base}-metric`}>
        {t(shared.metric)}
      </span>
      <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-metric`}>
        {ACCESS_METRICS.map((m) => (
          <label key={m} className={metric === m ? 'is-on' : undefined}>
            <input type="radio" name={`${base}-metric`} value={m} checked={metric === m} onChange={() => update({ metric: m, page: 1 })} />
            {t(txt.tab[m])}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <RankingFrame
        settings={settings}
        update={update}
        ranked={ranked}
        view={view}
        measure={measure}
        summary={fill(t(txt.summary), { year: ds.year, access: formatShare(ds.world.access / 100, lang), without: formatCountCompact(worldWithout, lang) })}
        detail={(r) => `${value(r, metric, lang)}${star(r)}`}
        chart={<RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} axisLabel={t(txt.axis[metric])} />}
        table={<AccessTable rows={view.filtered} hi={view.hi} firstYear={ds.firstYear} caption={fill(t(txt.tableCaption), { year: ds.year, region: view.regionName })} />}
      />

      <ul className="kpi-row" aria-label={fill(t(txt.kpiWorld), { year: ds.year })}>
        <li className="kpi">
          <span className="kpi-value">{formatCountCompact(worldWithout, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiWorld), { year: ds.year })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatShare(ssaWithout / worldWithout, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiSsa), { access: formatShare(ds.ssa.access / 100, lang) })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(full, lang)}</span>
          <span className="kpi-label">{t(txt.kpiFull)}</span>
        </li>
        {home && (
          <li className="kpi kpi-home">
            <span className="kpi-value">
              {value(home, metric, lang)}
              {star(home)}
            </span>
            <span className="kpi-label">{fill(t(focusText.focusKpi), { name: countryName(home.code, lang), rank: home.rank, total: ranked.length })}</span>
          </li>
        )}
      </ul>

      {datedRows.length > 0 && (
        <p className="chart-note muted">
          {fill(t(txt.dated), { years: datedRows.map((r) => `${countryName(r.code, lang)} ${r.year}`).join(', '), year: ds.year })}
        </p>
      )}
      <p className="chart-note muted">{t(txt.note)}</p>
      <p className="chart-note muted">{fill(t(txt.credit), { date: formatDate(ds.updated, lang) })}</p>
    </>
  );
}

function AccessTable({ rows, hi, firstYear, caption }: { rows: readonly RankedAccess[]; hi: ReadonlySet<string>; firstYear: number; caption: string }) {
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
              {t(txt.colAccess)}
            </th>
            <th scope="col" className="num">
              {t(txt.colWithout)}
            </th>
            <th scope="col" className="num">
              {fill(t(txt.colFirst), { year: firstYear })}
            </th>
            <th scope="col" className="num">
              {t(shared.colYear)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = flagUrl(r.code);
            return (
              <tr key={r.code} className={hi.has(r.code) ? 'is-home' : undefined}>
                <td className="num">{r.rank}</td>
                <th scope="row">
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(r.code, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                </td>
                <td className="num">{formatShare(r.access / 100, lang)}</td>
                <td className="num">{formatNumber(Math.round(r.without), lang)}</td>
                <td className="num">{r.first === null ? '—' : formatShare(r.first / 100, lang)}</td>
                <td className="num">
                  {r.year}
                  {star(r)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

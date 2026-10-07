// imports.tsx — CHANGED (S3-oil): angles C and D, who sells crude oil to the two largest importers.
// C: the United States, EIA by country of origin — any year since 1973 or the latest months, a ranking + the history
//    of the five largest suppliers. D: China, its customs (GACC) via UN Comtrade — 2024 and 2025, tonnes converted to
//    barrels a day with the EI factor (≈), with the customs value per barrel and a note on oil re-labelled at sea.
import { useCallback, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import { RankedBar } from '../../charts/RankedBar';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import { YearChart } from '../../charts/YearChart';
import type { YearChartSpec } from '../../charts/renderYearChart';
import { REGION_COLOR, SERIES_COLOR } from '../../charts/palette';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { localeOf } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { Pager } from '../../components/viz/Pager';
import { countryName, flagUrl } from '../../lib/countries';
import { formatChangePct, formatKbd, formatKbdTick, formatNumber, formatShare, formatUsdBillions, formatUsdPrice } from '../../lib/format';
import { paginate } from '../../lib/paginate';
import { REGION_LABELS } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DataState } from './common';
import type { AngleProps } from './common';
import {
  BARRELS_PER_TONNE,
  FILES,
  chinaSuppliers,
  kbdFromTonnes,
  parseChinaImports,
  parseTrade,
  parseUsImports,
  usHistoryLeaders,
  usSuppliers,
  usUnlisted,
} from './data';
import type { ChinaDataset, ChinaSupplier, TradeDataset, UsDataset, UsPeriod, UsSupplier } from './data';
import { PAGE_SIZE } from './state';
import { txt as shared } from './text';

const parseUs = (json: unknown): UsDataset => parseUsImports(json, FILES.us);
const parseCn = (json: unknown): ChinaDataset => parseChinaImports(json, FILES.china);
const parseTr = (json: unknown): TradeDataset => parseTrade(json, FILES.trade);

/** "Jan–Jul" in the page language (UTC, so the month never shifts). */
function monthSpan(months: number, lang: Lang): string {
  const f = new Intl.DateTimeFormat(localeOf(lang), { month: 'short', timeZone: 'UTC' });
  const m = (i: number): string => f.format(Date.UTC(2001, i - 1, 15));
  return months === 1 ? m(1) : `${m(1)}–${m(months)}`;
}

const mt = (tonnes: number, lang: Lang): string => formatNumber(Math.round(tonnes / 1e5) / 10, lang);

// ── C: United States ─────────────────────────────────────────────────────────────────────────────

const us = {
  period: { en: 'Period', uk: 'Період' },
  partial: { en: '{year} ({months})', uk: '{year} ({months})' },
  chartLabel: {
    en: 'Horizontal bar chart: U.S. crude oil imports by country of origin, {period}, barrels a day, ranks {from} to {to} of {total}. Largest: {top}. The table view lists every value.',
    uk: 'Горизонтальна стовпчикова діаграма: імпорт сирої нафти США за країною походження, {period}, барелів на добу, місця {from}–{to} з {total}. Найбільше: {top}. Таблиця містить усі значення.',
  },
  status: { en: 'U.S. crude imports, {period}: {value}', uk: 'Імпорт сирої нафти США, {period}: {value}' },
  unlisted: { en: ' · {value} not itemised by country', uk: ' · {value} без розбивки за країнами' },
  tipUse: { en: 'Imports, {period}: {value} · {share} of the total', uk: 'Імпорт, {period}: {value} · {share} від загального' },
  tipBefore: { en: '{year}: {value}', uk: '{year}: {value}' },
  kpiTotal: { en: 'U.S. crude imports, {period}', uk: 'Імпорт сирої нафти США, {period}' },
  kpiTop: { en: '#1 {name}: share of all imports', uk: '№1 {name}: частка всього імпорту' },
  kpiCount: { en: 'Countries of origin', uk: 'Країн походження' },
  kpiChange: { en: '{change} vs {prev}', uk: '{change} до {prev}' },
  historyTitle: { en: 'The five largest suppliers ever, {from}–{to}', uk: 'П’ять найбільших постачальників за весь час, {from}–{to}' },
  historyLabel: {
    en: 'Line chart: U.S. crude imports from {names}, barrels a day, {from}–{to}. The table view lists every country and year.',
    uk: 'Лінійний графік: імпорт сирої нафти США з {names}, барелів на добу, {from}–{to}. Таблиця містить усі країни й роки.',
  },
  tipTotal: { en: 'All countries', uk: 'Усі країни' },
  colUse: { en: '{period}, kb/d', uk: '{period}, тис. б/д' },
  colShare: { en: 'Share', uk: 'Частка' },
  colBefore: { en: '{year}, kb/d', uk: '{year}, тис. б/д' },
  rowUnlisted: { en: 'Not itemised by the EIA', uk: 'Без розбивки EIA' },
  caption: { en: 'U.S. crude oil imports by country of origin, {period}', uk: 'Імпорт сирої нафти США за країною походження, {period}' },
  note: {
    en: 'Crude oil only (products such as gasoline or diesel are not included), by country of origin — where the oil was produced, not where the tanker loaded. Before 1993 the EIA itemises only its main sources; the rest is shown as “not itemised”. {partial} is the average of the months published so far (EIA release {release}).',
    uk: 'Лише сира нафта (без нафтопродуктів — бензину, дизелю тощо), за країною походження — де нафту видобуто, а не де завантажено танкер. До 1993 року EIA деталізує лише основних постачальників; решта показана як «без розбивки». {partial} — середнє за вже опубліковані місяці (випуск EIA {release}).',
  },
} as const;

export function UsAngle({ settings, update }: AngleProps) {
  const state = useDataset(dataUrl('oil', FILES.us), parseUs);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  return <UsView ds={state.data} settings={settings} update={update} />;
}

function UsView({ ds, settings, update }: AngleProps & { ds: UsDataset }) {
  const { t, lang } = useLang();
  const base = useId();
  const y = settings.year;
  const period: UsPeriod = y === ds.partial.year ? 'partial' : y !== null && y >= ds.from && y <= ds.to ? y : ds.to;
  const periodName = (p: UsPeriod): string =>
    p === 'partial' ? fill(t(us.partial), { year: ds.partial.year, months: monthSpan(ds.partial.months, lang) }) : String(p);
  const name = periodName(period);

  const suppliers = useMemo(() => usSuppliers(ds, period), [ds, period]);
  const unlisted = usUnlisted(ds, period);
  const total = period === 'partial' ? ds.partial.total : ds.total[period - ds.from]!;
  const prevYear = period === 'partial' ? ds.to : period - 1;
  const prevTotal = prevYear >= ds.from ? ds.total[prevYear - ds.from]! : null;
  const page = useMemo(() => paginate(suppliers, settings.page, PAGE_SIZE), [suppliers, settings.page]);
  const pageItems = page.items;
  const rows = useMemo(
    (): RankedBarRow[] =>
      pageItems.map((r) => {
        const n = countryName(r.code, lang);
        const lines = [
          fill(t(shared.tipRank), { rank: r.rank, total: suppliers.length }),
          fill(t(shared.tipRegion), { region: t(REGION_LABELS[r.region]) }),
          fill(t(us.tipUse), { period: name, value: formatKbd(r.kbd, lang), share: formatShare(r.share, lang) }),
        ];
        if (r.before !== null) lines.push(fill(t(us.tipBefore), { year: prevYear, value: formatKbd(r.before, lang) }));
        return {
          key: r.code,
          label: `${r.rank}  ${n}`,
          value: r.kbd,
          color: REGION_COLOR[r.region],
          valueLabel: `${formatKbd(r.kbd, lang)} · ${formatShare(r.share, lang)}`,
          imageUrl: flagUrl(r.code),
          tooltip: { title: n, lines },
        };
      }),
    [pageItems, suppliers.length, name, prevYear, lang, t],
  );
  const tickFormat = useCallback((v: number) => formatKbdTick(v, lang), [lang]);
  const top = suppliers[0];
  const years = Array.from({ length: ds.to - ds.from + 1 }, (_, i) => ds.to - i);

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field">
          <label htmlFor={`${base}-period`}>{t(us.period)}</label>
          <select
            id={`${base}-period`}
            value={period === 'partial' ? ds.partial.year : period}
            onChange={(e) => {
              const v = Number(e.target.value);
              update({ year: v === ds.to ? null : v, page: 1 });
            }}
          >
            <option value={ds.partial.year}>{periodName('partial')}</option>
            {years.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
        {settings.view === 'chart' && <Pager id={`${base}-page`} page={page} size={PAGE_SIZE} onPage={(p) => update({ page: p })} />}
      </div>

      <p className="viz-status" aria-live="polite">
        {settings.view === 'chart'
          ? fill(t(ui.showingRange), { from: page.from, to: page.to, total: page.total })
          : fill(t(ui.showingAll), { total: suppliers.length })}
        {' · '}
        {fill(t(us.status), { period: name, value: formatKbd(total, lang) })}
        {unlisted > 0 && fill(t(us.unlisted), { value: formatKbd(unlisted, lang) })}
      </p>

      {settings.view === 'chart' ? (
        <>
          <RankedBar
            rows={rows}
            tickFormat={tickFormat}
            axisLabel={t(shared.kbdAxis)}
            label={fill(t(us.chartLabel), {
              period: name,
              from: page.from,
              to: page.to,
              total: page.total,
              top: top ? `${countryName(top.code, lang)}, ${formatKbd(top.kbd, lang)}` : '—',
            })}
          />
          <UsHistory ds={ds} />
        </>
      ) : (
        <UsTable rows={suppliers} unlisted={unlisted} period={name} prevYear={prevYear} caption={fill(t(us.caption), { period: name })} />
      )}

      <ul className="kpi-row" aria-label={fill(t(us.kpiTotal), { period: name })}>
        <li className="kpi">
          <span className="kpi-value">{formatKbd(total, lang)}</span>
          <span className="kpi-label">
            {fill(t(us.kpiTotal), { period: name })}
            {prevTotal !== null && ` · ${fill(t(us.kpiChange), { change: formatChangePct(total / prevTotal - 1, lang), prev: prevYear })}`}
          </span>
        </li>
        {top && (
          <li className="kpi">
            <span className="kpi-value">{formatShare(top.share, lang)}</span>
            <span className="kpi-label">{fill(t(us.kpiTop), { name: countryName(top.code, lang) })}</span>
          </li>
        )}
        <li className="kpi">
          <span className="kpi-value">{suppliers.length}</span>
          <span className="kpi-label">{t(us.kpiCount)}</span>
        </li>
      </ul>
      <p className="chart-note muted">{fill(t(us.note), { partial: periodName('partial'), release: ds.release })}</p>
    </>
  );
}

const LINE_COLORS = [SERIES_COLOR.primary, SERIES_COLOR.s1, SERIES_COLOR.s2, SERIES_COLOR.s3, SERIES_COLOR.s4] as const;

function UsHistory({ ds }: { ds: UsDataset }) {
  const { t, lang } = useLang();
  const titleId = useId();
  const leaders = useMemo(() => usHistoryLeaders(ds, LINE_COLORS.length), [ds]);
  const spec = useMemo((): YearChartSpec => {
    const years = Array.from({ length: ds.to - ds.from + 1 }, (_, i) => ds.from + i);
    const max = Math.max(...leaders.flatMap((r) => r.values.map((v) => v ?? 0)));
    const last = years.length - 1;
    return {
      years,
      yDomain: [0, max * 1.05],
      yFormat: (v) => formatKbdTick(v, lang),
      lines: leaders.map((r, i) => ({ key: r.code, values: r.values.map((v) => v ?? 0), color: LINE_COLORS[i]! })),
      // End dots without labels: four of the five lines end close to zero, so labels would collide — the key names them.
      markers: leaders.map((r, i) => ({ key: r.code, index: last, value: r.values[last] ?? 0, color: LINE_COLORS[i]! })),
      hoverPoints: (i) => leaders.map((r, k) => ({ value: r.values[i] ?? 0, color: LINE_COLORS[k]! })),
      tooltip: (i) => ({
        title: String(years[i]),
        lines: [
          ...leaders.map((r, k) => ({ label: countryName(r.code, lang), value: r.values[i] === null ? '—' : formatKbd(r.values[i]!, lang), color: LINE_COLORS[k] })),
          { label: t(us.tipTotal), value: formatKbd(ds.total[i]!, lang) },
        ],
      }),
    };
  }, [ds, leaders, lang, t]);
  const names = leaders.map((r) => countryName(r.code, lang)).join(', ');
  return (
    <section className="race-share" aria-labelledby={titleId}>
      <h3 className="race-share-title" id={titleId}>
        {fill(t(us.historyTitle), { from: ds.from, to: ds.to })}
      </h3>
      <ul className="key-list" aria-label={t(ui.legend)}>
        {leaders.map((r, i) => (
          <li key={r.code}>
            <span className="key-line" style={{ background: LINE_COLORS[i] }} aria-hidden="true" />
            {countryName(r.code, lang)}
          </li>
        ))}
      </ul>
      <YearChart spec={spec} label={fill(t(us.historyLabel), { names, from: ds.from, to: ds.to })} />
    </section>
  );
}

function UsTable({ rows, unlisted, period, prevYear, caption }: { rows: readonly UsSupplier[]; unlisted: number; period: string; prevYear: number; caption: string }) {
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
              {fill(t(us.colUse), { period })}
            </th>
            <th scope="col" className="num">
              {t(us.colShare)}
            </th>
            <th scope="col" className="num">
              {fill(t(us.colBefore), { year: prevYear })}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <CountryRow key={r.code} code={r.code} rank={r.rank} region={r.region}>
              <td className="num">{formatNumber(Math.round(r.kbd), lang)}</td>
              <td className="num">{formatShare(r.share, lang)}</td>
              <td className="num">{r.before === null ? '—' : formatNumber(Math.round(r.before), lang)}</td>
            </CountryRow>
          ))}
          {unlisted > 0 && (
            <tr>
              <td className="num">—</td>
              <th scope="row">{t(us.rowUnlisted)}</th>
              <td>—</td>
              <td className="num">{formatNumber(Math.round(unlisted), lang)}</td>
              <td className="num">—</td>
              <td className="num">—</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CountryRow({ code, rank, region, children }: { code: string; rank: number; region: UsSupplier['region']; children: ReactNode }) {
  const { t, lang } = useLang();
  const flag = flagUrl(code);
  return (
    <tr>
      <td className="num">{rank}</td>
      <th scope="row">
        {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(code, lang)}
      </th>
      <td>
        <span className="swatch" style={{ background: REGION_COLOR[region] }} aria-hidden="true" /> {t(REGION_LABELS[region])}
      </td>
      {children}
    </tr>
  );
}

// ── D: China ─────────────────────────────────────────────────────────────────────────────────────

const cn = {
  chartLabel: {
    en: 'Horizontal bar chart: China’s crude oil imports by partner, {year}, barrels a day (converted from tonnes), ranks {from} to {to} of {total}. Largest: {top}. The table view lists every value.',
    uk: 'Горизонтальна стовпчикова діаграма: імпорт сирої нафти Китаю за партнерами, {year}, барелів на добу (переведено з тонн), місця {from}–{to} з {total}. Найбільше: {top}. Таблиця містить усі значення.',
  },
  status: { en: 'China’s crude imports, {year}: {mt} Mt ≈ {kbd}', uk: 'Імпорт сирої нафти Китаю, {year}: {mt} млн т ≈ {kbd}' },
  tipUse: { en: '{year}: {mt} Mt ≈ {kbd} · {share} of the total', uk: '{year}: {mt} млн т ≈ {kbd} · {share} від загального' },
  tipBefore: { en: '{year}: {mt} Mt ({change})', uk: '{year}: {mt} млн т ({change})' },
  tipValue: { en: 'Customs value: US$ {bn} bn ≈ {price} a barrel', uk: 'Митна вартість: {bn} млрд дол. ≈ {price} за барель' },
  kpiTotal: { en: 'China’s crude imports, {year} ({mt} Mt)', uk: 'Імпорт сирої нафти Китаю, {year} ({mt} млн т)' },
  kpiTop: { en: '#1 {name}: share of all imports', uk: '№1 {name}: частка всього імпорту' },
  kpiTop5: { en: 'Five largest suppliers: share', uk: 'П’ять найбільших постачальників: частка' },
  colMt: { en: 'Million tonnes', uk: 'Млн тонн' },
  colKbd: { en: '≈ kb/d', uk: '≈ тис. б/д' },
  colShare: { en: 'Share', uk: 'Частка' },
  colChange: { en: 'Change vs {year}', uk: 'Зміна до {year}' },
  colUsd: { en: 'Value, US$ bn', uk: 'Вартість, млрд дол.' },
  colPrice: { en: '≈ US$ a barrel', uk: '≈ дол. за барель' },
  caption: { en: 'China’s crude oil imports by partner, {year} (China customs)', uk: 'Імпорт сирої нафти Китаю за партнерами, {year} (митниця Китаю)' },
  relabel: {
    en: 'Customs record {mt} Mt of crude from {name} in {year} (rank {rank}) — far more than {name} produces. Independent trackers (Columbia University’s Center on Global Energy Policy, Kpler) trace most of it to Iran and Venezuela, transferred between tankers at sea and declared as coming from {name}. {iran}',
    uk: 'Митниця записує {mt} млн т сирої нафти з країни «{name}» у {year} році (місце {rank}) — значно більше, ніж ця країна видобуває. Незалежні аналітики (Центр глобальної енергетичної політики Колумбійського університету, Kpler) простежують більшість цієї нафти до Ірану й Венесуели: її перевантажують між танкерами в морі й декларують як нафту з цієї країни. {iran}',
  },
  noIran: { en: 'Iran itself does not appear in China’s customs data for {years}.', uk: 'Сам Іран у митних даних Китаю за {years} не фігурує.' },
  eiOther: {
    en: 'The Energy Institute’s trade table, which assigns such barrels to their origin, shows {mt} Mt of China’s {year} imports as coming from “Other Middle East” (≈ {kbd}).',
    uk: 'Торговельна таблиця Energy Institute, яка відносить такі барелі до країни походження, показує {mt} млн т імпорту Китаю у {year} році як «Інший Близький Схід» (≈ {kbd}).',
  },
  note: {
    en: 'Tonnes → barrels a day with the EI’s average factor for crude ({factor} barrels a tonne) and the number of days in the year, so every barrel figure here is approximate (≈). Customs value is CIF (cost, insurance and freight), so the price a barrel includes shipping. Source: China’s General Administration of Customs, as reported to UN Comtrade (HS 2709).',
    uk: 'Тонни → барелі на добу за середнім коефіцієнтом EI для сирої нафти ({factor} барелі на тонну) і кількістю днів у році, тож кожне значення в барелях тут приблизне (≈). Митна вартість — CIF (вартість, страхування і фрахт), тож ціна барелю включає доставку. Джерело: Головне митне управління Китаю, дані в UN Comtrade (HS 2709).',
  },
} as const;

/** The partner whose recorded volume most exceeds what it plausibly produces is named in the page text by code. */
const RELABEL_CODE = 'MY';

export function ChinaAngle({ settings, update }: AngleProps) {
  const china = useDataset(dataUrl('oil', FILES.china), parseCn);
  const trade = useDataset(dataUrl('oil', FILES.trade), parseTr);
  if (china.status !== 'ready') return <DataState status={china.status} retry={china.status === 'error' ? china.retry : undefined} />;
  return <ChinaView ds={china.data} trade={trade.status === 'ready' ? trade.data : null} settings={settings} update={update} />;
}

function ChinaView({ ds, trade, settings, update }: AngleProps & { ds: ChinaDataset; trade: TradeDataset | null }) {
  const { t, lang } = useLang();
  const base = useId();
  const latest = ds.years.at(-1)!;
  const year = settings.year !== null && ds.years.includes(settings.year) ? settings.year : latest;
  const yi = ds.years.indexOf(year);
  const suppliers = useMemo(() => chinaSuppliers(ds, year), [ds, year]);
  const total = ds.total[yi]!;
  const page = useMemo(() => paginate(suppliers, settings.page, PAGE_SIZE), [suppliers, settings.page]);
  const pageItems = page.items;
  const rows = useMemo(
    (): RankedBarRow[] =>
      pageItems.map((r) => {
        const n = countryName(r.code, lang);
        const lines = [
          fill(t(shared.tipRank), { rank: r.rank, total: suppliers.length }),
          fill(t(shared.tipRegion), { region: t(REGION_LABELS[r.region]) }),
          fill(t(cn.tipUse), { year, mt: mt(r.tonnes, lang), kbd: formatKbd(r.kbd, lang), share: formatShare(r.share, lang) }),
        ];
        if (r.before !== null && r.change !== null) lines.push(fill(t(cn.tipBefore), { year: year - 1, mt: mt(r.before, lang), change: formatChangePct(r.change, lang) }));
        if (r.usd !== null && r.usdPerBarrel !== null) {
          lines.push(fill(t(cn.tipValue), { bn: formatUsdBillions(r.usd, lang), price: formatUsdPrice(r.usdPerBarrel, lang) }));
        }
        return {
          key: r.code,
          label: `${r.rank}  ${n}`,
          value: r.kbd,
          color: REGION_COLOR[r.region],
          valueLabel: `≈ ${formatKbd(r.kbd, lang)} · ${formatShare(r.share, lang)}`,
          imageUrl: flagUrl(r.code),
          tooltip: { title: n, lines },
        };
      }),
    [pageItems, suppliers.length, year, lang, t],
  );
  const tickFormat = useCallback((v: number) => formatKbdTick(v, lang), [lang]);
  const top = suppliers[0];
  const top5 = suppliers.slice(0, 5).reduce((s, r) => s + r.share, 0);

  const relabel = suppliers.find((r) => r.code === RELABEL_CODE);
  const hasIran = ds.rows.some((r) => r.code === 'IR' && r.tonnes.some((v) => (v ?? 0) > 0));
  const eiOther = trade && trade.year === year ? trade.flows.find((f) => f.from === 'other-middle-east' && f.to === 'china') : undefined;

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-auto">
          <span className="field-label" id={`${base}-year`}>
            {t(shared.year)}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${base}-year`}>
            {ds.years.map((yr) => (
              <label key={yr} className={year === yr ? 'is-on' : undefined}>
                <input type="radio" name={`${base}-year`} value={yr} checked={year === yr} onChange={() => update({ year: yr === latest ? null : yr, page: 1 })} />
                {yr}
              </label>
            ))}
          </div>
        </div>
        {settings.view === 'chart' && <Pager id={`${base}-page`} page={page} size={PAGE_SIZE} onPage={(p) => update({ page: p })} />}
      </div>

      <p className="viz-status" aria-live="polite">
        {settings.view === 'chart'
          ? fill(t(ui.showingRange), { from: page.from, to: page.to, total: page.total })
          : fill(t(ui.showingAll), { total: suppliers.length })}
        {' · '}
        {fill(t(cn.status), { year, mt: mt(total, lang), kbd: formatKbd(kbdFromTonnes(total, year), lang) })}
      </p>

      {settings.view === 'chart' ? (
        <RankedBar
          rows={rows}
          tickFormat={tickFormat}
          axisLabel={`${t(shared.approx)} ${t(shared.kbdAxis)}`}
          label={fill(t(cn.chartLabel), {
            year,
            from: page.from,
            to: page.to,
            total: page.total,
            top: top ? `${countryName(top.code, lang)}, ≈ ${formatKbd(top.kbd, lang)}` : '—',
          })}
        />
      ) : (
        <ChinaTable rows={suppliers} year={year} caption={fill(t(cn.caption), { year })} />
      )}

      <ul className="kpi-row" aria-label={fill(t(cn.kpiTotal), { year, mt: mt(total, lang) })}>
        <li className="kpi">
          <span className="kpi-value">≈ {formatKbd(kbdFromTonnes(total, year), lang)}</span>
          <span className="kpi-label">{fill(t(cn.kpiTotal), { year, mt: mt(total, lang) })}</span>
        </li>
        {top && (
          <li className="kpi">
            <span className="kpi-value">{formatShare(top.share, lang)}</span>
            <span className="kpi-label">{fill(t(cn.kpiTop), { name: countryName(top.code, lang) })}</span>
          </li>
        )}
        <li className="kpi">
          <span className="kpi-value">{formatShare(top5, lang)}</span>
          <span className="kpi-label">{t(cn.kpiTop5)}</span>
        </li>
      </ul>

      {relabel && (
        <div className="notice coverage-note">
          <p>
            {fill(t(cn.relabel), {
              mt: mt(relabel.tonnes, lang),
              name: countryName(relabel.code, lang),
              year,
              rank: relabel.rank,
              iran: hasIran ? '' : fill(t(cn.noIran), { years: ds.years.join(lang === 'uk' ? ' і ' : ' and ') }),
            })}
          </p>
          {eiOther && (
            <p>{fill(t(cn.eiOther), { mt: formatNumber(eiOther.mt, lang), year, kbd: formatKbd(kbdFromTonnes(eiOther.mt * 1e6, year), lang) })}</p>
          )}
        </div>
      )}
      <p className="chart-note muted">{fill(t(cn.note), { factor: formatNumber(BARRELS_PER_TONNE, lang) })}</p>
    </>
  );
}

function ChinaTable({ rows, year, caption }: { rows: readonly ChinaSupplier[]; year: number; caption: string }) {
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
              {t(cn.colMt)}
            </th>
            <th scope="col" className="num">
              {t(cn.colKbd)}
            </th>
            <th scope="col" className="num">
              {t(cn.colShare)}
            </th>
            <th scope="col" className="num">
              {fill(t(cn.colChange), { year: year - 1 })}
            </th>
            <th scope="col" className="num">
              {t(cn.colUsd)}
            </th>
            <th scope="col" className="num">
              {t(cn.colPrice)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <CountryRow key={r.code} code={r.code} rank={r.rank} region={r.region}>
              <td className="num">{mt(r.tonnes, lang)}</td>
              <td className="num">{formatNumber(Math.round(r.kbd), lang)}</td>
              <td className="num">{formatShare(r.share, lang)}</td>
              <td className="num">{r.change === null ? '—' : formatChangePct(r.change, lang)}</td>
              <td className="num">{r.usd === null ? '—' : formatUsdBillions(r.usd, lang)}</td>
              <td className="num">{r.usdPerBarrel === null ? '—' : formatNumber(Math.round(r.usdPerBarrel), lang)}</td>
            </CountryRow>
          ))}
        </tbody>
      </table>
    </div>
  );
}

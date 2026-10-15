// users.tsx — CHANGED (S3-ai2): angle D, user counts the companies published themselves (Milestones: a log axis, the
// shape of a point = what was counted, a line only inside one product AND one measure). First-party sources only — every
// row of the table links the page the number is on and quotes its sentence. Companies with no such number are named.
// CHANGED (S3-ai3): a headline sentence and "Did you know" facts; world population joined at runtime from the
// population-by-country entry's file (UN WPP), like oil's per-person figures — not copied.
import { useMemo } from 'react';
import { Milestones } from '../../charts/Milestones';
import type { MilestoneSeries, MilestonesOptions } from '../../charts/renderMilestones';
import type { Localized } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatCountTick, formatDate, formatDays, formatMonth, formatNumber, formatPeople } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE as POP_FILE, parsePopDataset } from '../population-by-country/data';
import type { PopDataset } from '../population-by-country/data';
import { CompanySelect, DataState, Facts, Lead } from './common';
import type { AngleProps } from './common';
import { FILES, METRIC_SHAPE, claimSeries, knownCompany, monthOfMs, parseClaims, parseReleases, silentCompanies } from './data';
import type { ClaimSeries, ClaimsDataset, Hero, MetricShape, ReleasesDataset } from './data';
import { txt as shared } from './text';
import { CHART_LABEL, METRIC_TEXT, PRODUCT_TEXT, claimText, fastestDoubling, ms, oneIn, userAxis } from './views';

const parse = (json: unknown): ClaimsDataset => parseClaims(json, FILES.claims);
const parseHeroes = (json: unknown): ReleasesDataset => parseReleases(json, FILES.releases);
const parsePop = (json: unknown): PopDataset => parsePopDataset(json, POP_FILE);
const DAY = 86_400_000;

const SHAPE_TEXT: Record<MetricShape, Localized> = {
  circle: { en: 'weekly users', uk: 'користувачі за тиждень' },
  square: { en: 'monthly users of the product’s own app', uk: 'користувачі власного застосунку за місяць' },
  triangle: { en: 'monthly users, counted inside other products', uk: 'користувачі за місяць, пораховані всередині інших продуктів' },
};

const txt = {
  yLabel: { en: 'Users (logarithmic scale)', uk: 'Користувачі (логарифмічна шкала)' },
  chartLabel: {
    en: 'Chart: user counts published by the companies, {from} – {to}, on a logarithmic scale. Latest: {latest}. The table view lists every figure with its source.',
    uk: 'Графік: кількість користувачів, яку опублікували компанії, {from} – {to}, на логарифмічній шкалі. Останні: {latest}. Таблиця містить кожне число з джерелом.',
  },
  status: { en: '{n} figures from {companies} companies, {from} – {to}', uk: 'Чисел — {n}, від компаній — {companies}, {from} – {to}' },
  silentOne: { en: '{name}: no user count published by the company was found.', uk: '{name}: кількості користувачів від самої компанії не знайдено.' },
  silent: {
    en: 'No user counts published by the companies themselves were found for {names}. Third-party estimates (app trackers, web traffic) are not used.',
    uk: 'Кількості користувачів від самих компаній не знайдено для {names}. Оцінки третіх сторін (трекери застосунків, вебтрафік) не використано.',
  },
  noteMetrics: {
    en: 'The measures are not comparable and are never joined: ChatGPT counts weekly users; Google counts monthly users of the Gemini app; Meta counts monthly users of Meta AI across Facebook, Instagram, WhatsApp and Messenger; Microsoft counts its whole family of Copilots; the Grok figure (SpaceX filing, as of {grok}) counts users of Grok’s features, including inside X.',
    uk: 'Міри не порівнянні й ніколи не поєднуються: ChatGPT рахує користувачів за тиждень; Google — користувачів застосунку Gemini за місяць; Meta — користувачів Meta AI за місяць у Facebook, Instagram, WhatsApp і Messenger; Microsoft — усе сімейство Copilot; число Grok (документ SpaceX, станом на {grok}) — користувачів функцій Grok, разом із X.',
  },
  noteEarly: {
    en: 'Earlier ChatGPT figures (from November 2023) were given in keynotes, to reporters or on X; they are not drawn — only numbers on a company page or filing that can be linked are.',
    uk: 'Раніші числа ChatGPT (з листопада 2023) звучали в доповідях, у коментарях журналістам чи в X; їх не показано — лише числа зі сторінки компанії чи документа, на які можна дати посилання.',
  },
  credit: {
    en: 'Figures: the companies’ own posts, earnings remarks and filings, read {retrieved}; the table links each one and quotes its sentence.',
    uk: 'Числа: дописи, звіти інвесторам і документи самих компаній, прочитано {retrieved}; таблиця дає посилання на кожне й цитує речення.',
  },
  kpiLatest: { en: '{product}, {metric} — {date}', uk: '{product}, {metric} — {date}' },
  colAsOf: { en: 'As of', uk: 'Станом на' },
  colProduct: { en: 'Product', uk: 'Продукт' },
  colMeasure: { en: 'What was counted', uk: 'Що пораховано' },
  colFigure: { en: 'Figure', uk: 'Число' },
  colQuote: { en: 'In the company’s words', uk: 'Словами компанії' },
  caption: { en: 'Every figure, {from} – {to} ({n})', uk: 'Усі числа, {from} – {to} ({n})' },
  // CHANGED (S3-ai3)
  lead: {
    en: '{product}: {latest} {metric} as of {date} — ×{x} the first figure here ({first}, {d0}).',
    uk: '{product}: {latest} {metric} станом на {date} — ×{x} від першого числа тут ({first}, {d0}).',
  },
  leadOne: { en: '{product}: {latest} {metric} as of {date}.', uk: '{product}: {latest} {metric} станом на {date}.' },
  factDoubling: {
    en: 'The fastest doubling: {product}, from {a} to {b} {metric} in {days} ({d1} → {d2}).',
    uk: 'Найшвидше подвоєння: {product}, з {a} до {b} {metric} за {days} ({d1} → {d2}).',
  },
  factPeople: {
    en: '{product}: {latest} {metric} — as many as 1 in {n} of the world’s {world} people (UN, {year}); a count of users, though, is not a count of people.',
    uk: '{product}: {latest} {metric} — стільки, скільки кожен {n}-й із {world} жителів Землі (ООН, {year}); утім, користувачі — не те саме, що люди.',
  },
} as const;

export function UsersAngle(props: AngleProps) {
  const state = useDataset(dataUrl('ai-models', FILES.claims), parse);
  const heroes = useDataset(dataUrl('ai-models', FILES.releases), parseHeroes);
  const pop = useDataset(dataUrl('population-by-country', POP_FILE), parsePop);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  if (heroes.status !== 'ready') return <DataState status={heroes.status} retry={heroes.status === 'error' ? heroes.retry : undefined} />;
  // CHANGED (S3-ai3): the population only feeds one fact — the angle draws without it (loading or failed).
  return <UsersView ds={state.data} heroes={heroes.data.heroes} pop={pop.status === 'ready' ? pop.data : null} {...props} />;
}

function UsersView({ ds, heroes, pop, settings, update }: AngleProps & { ds: ClaimsDataset; heroes: readonly Hero[]; pop: PopDataset | null }) {
  const { t, lang } = useLang();
  const company = knownCompany(heroes, settings.company);
  const groups = useMemo(() => claimSeries(ds), [ds]);
  const product = (p: string): string => t(PRODUCT_TEXT[p] ?? { en: p, uk: p });
  const silent = silentCompanies(heroes, ds);
  const picked = heroes.find((h) => h.id === company);
  const byDate = [...ds.claims].sort((a, b) => (a.asOf < b.asOf ? -1 : a.asOf > b.asOf ? 1 : a.product < b.product ? -1 : 1));
  const first = byDate[0]!.asOf;
  const last = byDate.at(-1)!.asOf;
  const companies = new Set(ds.claims.map((c) => c.company)).size;
  const grok = ds.claims.find((c) => c.metric === 'monthly_incl_x');

  const series = useMemo(
    (): MilestoneSeries[] =>
      groups.map((g) => ({
        key: g.key,
        label: CHART_LABEL[g.product] ?? g.product,
        shape: METRIC_SHAPE[g.metric],
        emphasis: g.hero !== null && g.hero === company,
        points: g.claims.map((c, i) => ({
          key: `${g.key}:${i}`,
          t: ms(c.asOf),
          v: c.value,
          tooltip: {
            title: `${t(PRODUCT_TEXT[c.product] ?? { en: c.product, uk: c.product })} · ${c.company}`,
            lines: [`${claimText(c, lang)} ${t(METRIC_TEXT[c.metric])}`, formatDate(c.asOf, lang), new URL(c.url).hostname],
          },
        })),
      })),
    [groups, company, lang, t],
  );
  const axis = useMemo(() => userAxis(ds.claims.map((c) => c.value)), [ds]);
  const x = useMemo(
    (): MilestonesOptions['x'] => ({
      domain: [ms(first) - 45 * DAY, ms(ds.retrieved) + 20 * DAY],
      format: (tm: number) => (new Date(tm).getUTCMonth() === 0 ? String(new Date(tm).getUTCFullYear()) : formatMonth(monthOfMs(tm), lang)),
    }),
    [first, ds.retrieved, lang],
  );
  const y = useMemo((): MilestonesOptions['y'] => ({ ...axis, format: (v: number) => formatCountTick(v, lang), label: t(txt.yLabel) }), [axis, lang, t]);
  const latest = groups.map((g) => g.claims.at(-1)!).sort((a, b) => b.value - a.value);
  const fromText = formatDate(first, lang);
  const toText = formatDate(last, lang);
  const label = fill(t(txt.chartLabel), {
    from: fromText,
    to: toText,
    latest: latest.map((c) => `${product(c.product)} ${claimText(c, lang)} ${t(METRIC_TEXT[c.metric])}`).join('; '),
  });
  const shapes = [...new Set(groups.map((g) => METRIC_SHAPE[g.metric]))];

  // CHANGED (S3-ai3): headline = the series with the largest latest figure (of the highlighted company, if any).
  const lastOf = (g: ClaimSeries) => g.claims.at(-1)!;
  const pickSeries = (list: readonly ClaimSeries[]): ClaimSeries | undefined => [...list].sort((a, b) => lastOf(b).value - lastOf(a).value)[0];
  const headSeries = company ? pickSeries(groups.filter((g) => g.hero === company)) : pickSeries(groups);
  const sentence = (g: ClaimSeries): string => {
    const c = lastOf(g);
    const c0 = g.claims[0]!;
    const words = { product: product(g.product), latest: claimText(c, lang), metric: t(METRIC_TEXT[g.metric]), date: formatDate(c.asOf, lang) };
    return g.claims.length > 1
      ? fill(t(txt.lead), { ...words, x: formatNumber(Math.round((c.value / c0.value) * 10) / 10, lang), first: claimText(c0, lang), d0: formatDate(c0.asOf, lang) })
      : fill(t(txt.leadOne), words);
  };
  const lead = headSeries ? sentence(headSeries) : picked ? fill(t(txt.silentOne), { name: picked.name }) : '';
  const dbl = fastestDoubling(groups);
  const biggest = latest[0]!;
  const facts = [
    ...(dbl
      ? [
          fill(t(txt.factDoubling), {
            product: product(dbl.series.product),
            a: claimText(dbl.series.claims[dbl.a]!, lang),
            b: claimText(dbl.series.claims[dbl.b]!, lang),
            metric: t(METRIC_TEXT[dbl.series.metric]),
            days: formatDays(dbl.days, lang),
            d1: formatDate(dbl.series.claims[dbl.a]!.asOf, lang),
            d2: formatDate(dbl.series.claims[dbl.b]!.asOf, lang),
          }),
        ]
      : []),
    ...(pop
      ? [
          fill(t(txt.factPeople), {
            product: product(biggest.product),
            latest: claimText(biggest, lang),
            metric: t(METRIC_TEXT[biggest.metric]),
            n: formatNumber(oneIn(pop.world, biggest.value), lang),
            world: formatPeople(pop.world, lang),
            year: pop.year,
          }),
        ]
      : []),
  ];

  return (
    <>
      {lead && <Lead text={lead} />}
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <CompanySelect heroes={heroes} value={company} onChange={(id) => update({ company: id })} />
      </div>
      {/* CHANGED (S3-ai3): "no count found" for a picked company moved into the headline. */}
      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { n: ds.claims.length, companies, from: fromText, to: toText })}
      </p>

      {settings.view === 'table' ? (
        <div className="table-wrap">
          <table className="data-table">
            <caption>{fill(t(txt.caption), { from: fromText, to: toText, n: ds.claims.length })}</caption>
            <thead>
              <tr>
                <th scope="col">{t(txt.colAsOf)}</th>
                <th scope="col">{t(txt.colProduct)}</th>
                <th scope="col">{t(shared.colCompany)}</th>
                <th scope="col">{t(txt.colFigure)}</th>
                <th scope="col">{t(txt.colMeasure)}</th>
                <th scope="col">{t(txt.colQuote)}</th>
                <th scope="col">{t(shared.colSource)}</th>
              </tr>
            </thead>
            <tbody>
              {byDate.map((c, i) => (
                <tr key={`${c.product}-${c.asOf}-${i}`} className={c.hero !== null && c.hero === company ? 'is-home' : undefined}>
                  <td>{formatDate(c.asOf, lang)}</td>
                  <th scope="row">{product(c.product)}</th>
                  <td>{c.company}</td>
                  <td className="num">{claimText(c, lang)}</td>
                  <td>{t(METRIC_TEXT[c.metric])}</td>
                  <td className="quote">“{c.quote}”</td>
                  <td>
                    <a href={c.url} rel="noopener noreferrer" target="_blank">
                      {new URL(c.url).hostname}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <ul className="key-list" aria-label={t(shared.legend)}>
            {shapes.map((s) => (
              <li key={s}>
                <span className={`key-shape is-${s}`} aria-hidden="true" />
                {t(SHAPE_TEXT[s])}
              </li>
            ))}
          </ul>
          <Milestones series={series} label={label} x={x} y={y} />
        </>
      )}

      <ul className="kpi-row" aria-label={t(shared.keyFigures)}>
        {latest.map((c) => (
          <li key={`${c.product}-${c.metric}`} className={c.hero !== null && c.hero === company ? 'kpi kpi-home' : 'kpi'}>
            <span className="kpi-value">{claimText(c, lang)}</span>
            <span className="kpi-label">{fill(t(txt.kpiLatest), { product: product(c.product), metric: t(METRIC_TEXT[c.metric]), date: formatDate(c.asOf, lang) })}</span>
          </li>
        ))}
      </ul>
      <Facts items={facts} />
      {silent.length > 0 && <p className="chart-note">{fill(t(txt.silent), { names: silent.join(', ') })}</p>}
      <p className="chart-note muted">{fill(t(txt.noteMetrics), { grok: grok ? formatDate(grok.asOf, lang) : '—' })}</p>
      <p className="chart-note muted">{t(txt.noteEarly)}</p>
      <p className="chart-note muted">{fill(t(txt.credit), { retrieved: formatDate(ds.retrieved, lang) })}</p>
    </>
  );
}

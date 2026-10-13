// users.tsx — CHANGED (S3-ai2): angle D, user counts the companies published themselves (Milestones: a log axis, the
// shape of a point = what was counted, a line only inside one product AND one measure). First-party sources only — every
// row of the table links the page the number is on and quotes its sentence. Companies with no such number are named.
import { useMemo } from 'react';
import { Milestones } from '../../charts/Milestones';
import type { MilestoneSeries, MilestonesOptions } from '../../charts/renderMilestones';
import type { Localized } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatCountTick, formatDate, formatMonth } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { CompanySelect, DataState } from './common';
import type { AngleProps } from './common';
import { FILES, METRIC_SHAPE, claimSeries, knownCompany, monthOfMs, parseClaims, parseReleases, silentCompanies } from './data';
import type { ClaimsDataset, Hero, MetricShape, ReleasesDataset } from './data';
import { txt as shared } from './text';
import { CHART_LABEL, METRIC_TEXT, PRODUCT_TEXT, claimText, ms, userAxis } from './views';

const parse = (json: unknown): ClaimsDataset => parseClaims(json, FILES.claims);
const parseHeroes = (json: unknown): ReleasesDataset => parseReleases(json, FILES.releases);
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
} as const;

export function UsersAngle(props: AngleProps) {
  const state = useDataset(dataUrl('ai-models', FILES.claims), parse);
  const heroes = useDataset(dataUrl('ai-models', FILES.releases), parseHeroes);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  if (heroes.status !== 'ready') return <DataState status={heroes.status} retry={heroes.status === 'error' ? heroes.retry : undefined} />;
  return <UsersView ds={state.data} heroes={heroes.data.heroes} {...props} />;
}

function UsersView({ ds, heroes, settings, update }: AngleProps & { ds: ClaimsDataset; heroes: readonly Hero[] }) {
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

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <CompanySelect heroes={heroes} value={company} onChange={(id) => update({ company: id })} />
      </div>
      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { n: ds.claims.length, companies, from: fromText, to: toText })}
        {picked && silent.includes(picked.name) ? ` · ${fill(t(txt.silentOne), { name: picked.name })}` : ''}
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
      {silent.length > 0 && <p className="chart-note">{fill(t(txt.silent), { names: silent.join(', ') })}</p>}
      <p className="chart-note muted">{fill(t(txt.noteMetrics), { grok: grok ? formatDate(grok.asOf, lang) : '—' })}</p>
      <p className="chart-note muted">{t(txt.noteEarly)}</p>
      <p className="chart-note muted">{fill(t(txt.credit), { retrieved: formatDate(ds.retrieved, lang) })}</p>
    </>
  );
}

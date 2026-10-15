// arena.tsx — CHANGED (S3-ai2): angle C, who held No. 1 on the LMArena text leaderboard and when (Spans: one Gantt row
// per company that held it, its runs as bars, its days in the top 3 as a thin strip, the days at No. 1 as a bar on the
// right). The board is the one the site showed: raw until the style-control switch, style-controlled after (a marker).
// The table lists every run; a second table gives the eight companies' days at No. 1 and in the top 3.
// CHANGED (S3-ai3): a headline sentence and "Did you know" facts (company stretches, insights.ts).
import { useCallback, useMemo } from 'react';
import { Spans } from '../../charts/Spans';
import type { SpanRow } from '../../charts/renderSpans';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatDate, formatDays, formatMonth, formatNumber, formatShare } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { CompanySelect, DataState, Facts, Lead } from './common';
import type { AngleProps } from './common';
import { FILES, arenaLeaders, arenaRuns, daysBetween, knownCompany, monthOfMs, parseArena, parseReleases, top3Spans } from './data';
import type { ArenaDataset, ArenaRun, Hero, ReleasesDataset } from './data';
import { txt as shared } from './text';
import { companyRuns, lastDay, leadFacts, ms } from './views';
import type { CompanyRun } from './views';

const parse = (json: unknown): ArenaDataset => parseArena(json, FILES.arena);
const parseHeroes = (json: unknown): ReleasesDataset => parseReleases(json, FILES.releases);

const txt = {
  chartLabel: {
    en: 'Gantt chart: the company with the No. 1 model on the LMArena text leaderboard, {from} – {to} ({days}). Days at No. 1: {counts}. The table view lists all {runs} runs.',
    uk: 'Діаграма Ґантта: компанія з моделлю №1 у текстовому рейтингу LMArena, {from} – {to} ({days}). Днів на №1: {counts}. Таблиця містить усі {runs} серій.',
  },
  status: { en: '{from} – {to}: {runs} runs at No. 1, {companies} companies', uk: '{from} – {to}: серій на №1 — {runs}, компаній — {companies}' },
  legendFirst: { en: 'No. 1 (bar on the right: days at No. 1)', uk: '№1 (стовпець праворуч — днів на №1)' },
  legendTop3: { en: 'a model in the top 3', uk: 'модель у першій трійці' },
  legendSwitch: { en: 'style control from {date}', uk: 'style control з {date}' },
  marker: { en: 'style control →', uk: 'style control →' },
  tipRun: { en: '{from} – {to} · {days}', uk: '{from} – {to} · {days}' },
  stillFirst: { en: 'No. 1 when read, {date}', uk: '№1 на день читання, {date}' },
  kpiDays: { en: 'on the board, {from} – {to}', uk: 'на дошці, {from} – {to}' },
  kpiChanges: { en: 'times the No. 1 model changed', uk: 'разів змінювалася модель №1' },
  kpiLongest: { en: 'longest run: {model} ({company}, from {date})', uk: 'найдовша серія: {model} ({company}, з {date})' },
  kpiNow: { en: 'No. 1 when read ({date}): {company}', uk: '№1 на день читання ({date}): {company}' },
  kpiShare: { en: '{company}: share of the days at No. 1', uk: '{company}: частка днів на №1' },
  noteMissing: {
    en: 'The dataset keeps only the models still on the board. Models removed later are missing from every snapshot — Claude 1, 2.0 and 2.1, Claude Instant, Bard (Gemini Pro), Gemini 1.5 Pro 0409, Yi-Large — so a day one of them led is credited to the best model still listed. The first snapshot with GPT-4 is {from}; the series starts there.',
    uk: 'Датасет зберігає лише моделі, які досі на дошці. Моделі, яких потім зняли, відсутні в усіх знімках — Claude 1, 2.0 і 2.1, Claude Instant, Bard (Gemini Pro), Gemini 1.5 Pro 0409, Yi-Large, — тож день, коли першою була одна з них, зараховано найкращій моделі, що лишилася. Перший знімок із GPT-4 — {from}; з нього й починається ряд.',
  },
  noteMethod: {
    en: 'Until {last} the raw leaderboard; from {switch} the style-controlled one, which LMArena made the default that day (it discounts answers that win by length and formatting). Ratings: Elo until 9 Jan 2024, Bradley–Terry after; re-weighted by prompt frequency from 23 Jul 2025.',
    uk: 'До {last} — сирий рейтинг; з {switch} — зі style control, який LMArena того дня зробила основним (він знецінює перемоги завдяки довжині й оформленню відповіді). Рейтинг: Elo до 9 січня 2024, далі Bradley–Terry; з 23 липня 2025 — з поправкою на частоту запитів.',
  },
  colRun: { en: 'Run', uk: 'Серія' },
  colFirst: { en: 'Days at No. 1', uk: 'Днів на №1' },
  colTop3: { en: 'Days in the top 3', uk: 'Днів у трійці' },
  colShare: { en: 'Share of the days at No. 1', uk: 'Частка днів на №1' },
  runsCaption: { en: 'Every run at No. 1, {from} – {to} ({n})', uk: 'Усі серії на №1, {from} – {to} ({n})' },
  sumCaption: { en: 'The eight companies on the LMArena text leaderboard, {from} – {to}', uk: 'Вісім компаній у текстовому рейтингу LMArena, {from} – {to}' },
  // CHANGED (S3-ai3)
  lead: { en: '{name} held No. 1 the longest: {days} of {total} ({share}).', uk: '{name} найдовше була №1: {days} із {total} ({share}).' },
  leadCompany: {
    en: '{name}: No. 1 for {days} of {total} ({share}), in {runs} stretches; the first began {date}.',
    uk: '{name}: №1 — {days} із {total} ({share}), серій — {runs}; перша почалася {date}.',
  },
  leadCompanyOne: { en: '{name}: No. 1 for {days} of {total} ({share}), in one stretch from {date}.', uk: '{name}: №1 — {days} із {total} ({share}), однією серією з {date}.' },
  leadNever: { en: '{name}: never No. 1 from {from} to {to}; {top3} in the top 3.', uk: '{name}: жодного дня на №1 з {from} до {to}; у трійці — {top3}.' },
  factChanges: { en: 'The lead passed from one company to another {n} times.', uk: 'Переходів першого місця від однієї компанії до іншої — {n}.' },
  factLongest: { en: 'The longest stretch of one company: {name}, {days} ({from} – {to}).', uk: 'Найдовша серія однієї компанії: {name}, {days} ({from} – {to}).' },
  factShortest: { en: 'The shortest: {name}, {days} — {model}, from {from}.', uk: 'Найкоротша: {name}, {days} — {model}, з {from}.' },
} as const;

export function ArenaAngle(props: AngleProps) {
  const state = useDataset(dataUrl('ai-models', FILES.arena), parse);
  const heroes = useDataset(dataUrl('ai-models', FILES.releases), parseHeroes);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  if (heroes.status !== 'ready') return <DataState status={heroes.status} retry={heroes.status === 'error' ? heroes.retry : undefined} />;
  return <ArenaView ds={state.data} heroes={heroes.data.heroes} {...props} />;
}

function ArenaView({ ds, heroes, settings, update }: AngleProps & { ds: ArenaDataset; heroes: readonly Hero[] }) {
  const { t, lang } = useLang();
  const company = knownCompany(heroes, settings.company);
  // heroes.csv uses the LMArena organization key as the company id.
  const nameOf = useMemo(() => new Map(heroes.map((h) => [h.id, h.name])), [heroes]);
  const name = useCallback((org: string): string => nameOf.get(org) ?? org, [nameOf]);
  const leaders = useMemo(() => arenaLeaders(ds), [ds]);
  const runs = useMemo(() => arenaRuns(ds), [ds]);
  const first = ds.snapshots[0]!.date;
  const total = daysBetween(first, ds.end);
  const span = (r: ArenaRun): string => (r.to === ds.end ? fill(t(txt.stillFirst), { date: formatDate(ds.end, lang) }) : formatDate(lastDay(r.to), lang));

  const rows = useMemo(
    (): SpanRow[] =>
      leaders.map((l) => ({
        key: l.org,
        label: name(l.org),
        emphasis: l.org === company,
        spans: l.runs.map((r) => ({
          key: r.from,
          t0: ms(r.from),
          t1: ms(r.to),
          tooltip: {
            title: r.model,
            lines: [name(r.org), fill(t(txt.tipRun), { from: formatDate(r.from, lang), to: r.to === ds.end ? formatDate(ds.end, lang) : formatDate(lastDay(r.to), lang), days: formatDays(r.days, lang) })],
          },
        })),
        minor: top3Spans(ds, l.org).map((s) => [ms(s.from), ms(s.to)] as const),
        total: l.first,
        totalLabel: formatNumber(l.first, lang),
      })),
    [leaders, ds, company, name, lang, t],
  );
  const formatTick = useCallback((tm: number) => (new Date(tm).getUTCMonth() === 0 ? String(new Date(tm).getUTCFullYear()) : formatMonth(monthOfMs(tm), lang)), [lang]);

  const longest = runs.reduce((a, b) => (b.days > a.days ? b : a));
  const now = runs.at(-1)!;
  const top = leaders[0]!;
  const fromText = formatDate(first, lang);
  const toText = formatDate(ds.end, lang);
  const label = fill(t(txt.chartLabel), {
    from: fromText,
    to: toText,
    days: formatDays(total, lang),
    counts: leaders.map((l) => `${name(l.org)} ${formatNumber(l.first, lang)}`).join(', '),
    runs: runs.length,
  });
  const top3Of = new Map(heroes.map((h) => [h.id, h.top3Days]));

  // CHANGED (S3-ai3): headline (the leader, or the highlighted company) and facts on company stretches.
  const stretches = useMemo(() => companyRuns(ds), [ds]);
  const facts = leadFacts(stretches);
  const totalN = formatNumber(total, lang);
  const own = company ? leaders.find((l) => l.org === company) : undefined;
  const ownRuns = company ? stretches.filter((r) => r.org === company) : [];
  const lead = company
    ? own
      ? fill(t(ownRuns.length === 1 ? txt.leadCompanyOne : txt.leadCompany), {
          name: name(company),
          days: formatDays(own.first, lang),
          total: totalN,
          share: formatShare(own.first / total, lang),
          runs: formatNumber(ownRuns.length, lang),
          date: formatDate(ownRuns[0]!.from, lang),
        })
      : fill(t(txt.leadNever), { name: name(company), from: fromText, to: toText, top3: formatDays(top3Of.get(company) ?? 0, lang) })
    : fill(t(txt.lead), { name: name(top.org), days: formatDays(top.first, lang), total: totalN, share: formatShare(top.first / total, lang) });
  const until = (r: CompanyRun): string => (r.open ? fill(t(txt.stillFirst), { date: toText }) : formatDate(lastDay(r.to), lang));
  const factItems = [
    fill(t(txt.factChanges), { n: formatNumber(facts.changes, lang) }),
    fill(t(txt.factLongest), { name: name(facts.longest.org), days: formatDays(facts.longest.days, lang), from: formatDate(facts.longest.from, lang), to: until(facts.longest) }),
    fill(t(txt.factShortest), { name: name(facts.shortest.org), days: formatDays(facts.shortest.days, lang), model: facts.shortest.models.join(', '), from: formatDate(facts.shortest.from, lang) }),
  ];
  const firstOf = new Map(leaders.map((l) => [l.org, l.first]));

  return (
    <>
      <Lead text={lead} />
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <CompanySelect heroes={heroes} value={company} onChange={(id) => update({ company: id })} />
      </div>
      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { from: fromText, to: toText, runs: formatNumber(runs.length, lang), companies: leaders.length })}
      </p>

      {settings.view === 'table' ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <caption>{fill(t(txt.runsCaption), { from: fromText, to: toText, n: runs.length })}</caption>
              <thead>
                <tr>
                  <th scope="col" className="num">
                    {t(txt.colRun)}
                  </th>
                  <th scope="col">{t(shared.colFrom)}</th>
                  <th scope="col">{t(shared.colTo)}</th>
                  <th scope="col">{t(shared.colModel)}</th>
                  <th scope="col">{t(shared.colCompany)}</th>
                  <th scope="col" className="num">
                    {t(shared.colDays)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={r.from} className={r.org === company ? 'is-home' : undefined}>
                    <td className="num">{i + 1}</td>
                    <td>{formatDate(r.from, lang)}</td>
                    <td>{span(r)}</td>
                    <th scope="row">{r.model}</th>
                    <td>{name(r.org)}</td>
                    <td className="num">{formatNumber(r.days, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <caption>{fill(t(txt.sumCaption), { from: fromText, to: toText })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t(shared.colCompany)}</th>
                  <th scope="col" className="num">
                    {t(txt.colFirst)}
                  </th>
                  <th scope="col" className="num">
                    {t(txt.colShare)}
                  </th>
                  <th scope="col" className="num">
                    {t(txt.colTop3)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...heroes]
                  .sort((a, b) => (firstOf.get(b.id) ?? 0) - (firstOf.get(a.id) ?? 0) || (top3Of.get(b.id) ?? 0) - (top3Of.get(a.id) ?? 0))
                  .map((h) => (
                    <tr key={h.id} className={h.id === company ? 'is-home' : undefined}>
                      <th scope="row">{h.name}</th>
                      <td className="num">{formatNumber(firstOf.get(h.id) ?? 0, lang)}</td>
                      <td className="num">{formatShare((firstOf.get(h.id) ?? 0) / total, lang)}</td>
                      <td className="num">{formatNumber(h.top3Days, lang)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <ul className="key-list" aria-label={t(shared.legend)}>
            <li>
              <span className="key-bar is-first" aria-hidden="true" />
              {t(txt.legendFirst)}
            </li>
            <li>
              <span className="key-bar is-top3" aria-hidden="true" />
              {t(txt.legendTop3)}
            </li>
            <li>
              <span className="key-dash" aria-hidden="true" />
              {fill(t(txt.legendSwitch), { date: formatDate(ds.switchDate, lang) })}
            </li>
          </ul>
          <Spans rows={rows} label={label} domain={[ms(first), ms(ds.end)]} formatTick={formatTick} totalMax={top.first} marker={{ t: ms(ds.switchDate), label: t(txt.marker) }} />
        </>
      )}

      <ul className="kpi-row" aria-label={t(shared.keyFigures)}>
        <li className="kpi">
          <span className="kpi-value">{formatDays(total, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiDays), { from: fromText, to: toText })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(runs.length - 1, lang)}</span>
          <span className="kpi-label">{t(txt.kpiChanges)}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatDays(longest.days, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiLongest), { model: longest.model, company: name(longest.org), date: formatDate(longest.from, lang) })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{now.model}</span>
          <span className="kpi-label">{fill(t(txt.kpiNow), { date: toText, company: name(now.org) })}</span>
        </li>
        {company && firstOf.has(company) ? (
          <li className="kpi kpi-home">
            <span className="kpi-value">{formatShare(firstOf.get(company)! / total, lang)}</span>
            <span className="kpi-label">{fill(t(txt.kpiShare), { company: name(company) })}</span>
          </li>
        ) : null}
      </ul>
      <Facts items={factItems} />
      <p className="chart-note muted">{fill(t(txt.noteMissing), { from: fromText })}</p>
      <p className="chart-note muted">{fill(t(txt.noteMethod), { last: formatDate(lastDay(ds.switchDate), lang), switch: formatDate(ds.switchDate, lang) })}</p>
      <p className="chart-note muted">{fill(t(shared.creditArena), { retrieved: formatDate(ds.retrieved, lang) })}</p>
    </>
  );
}

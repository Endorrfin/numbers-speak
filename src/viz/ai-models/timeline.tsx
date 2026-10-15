// timeline.tsx — CHANGED (S3-ai1): angle A, every language and multimodal model of the eight companies on its company's
// lane (Lanes + d3-brush on the overview strip). The period lives in the URL (?from=YYYY-MM&to=YYYY-MM); the From / To
// selects and Reset are the keyboard path to the brush; the table lists the same models. With a company highlighted and
// a period of two years or less, its dots carry their names. CHANGED (S3-ai3): a headline sentence, "Did you know" facts
// and event lines — ChatGPT's launch (first-party page) and each company's first day at No. 1 on LMArena (arena.json).
import { useCallback, useId, useMemo } from 'react';
import { Lanes } from '../../charts/Lanes';
import type { LaneEvent, LanePoint, LaneRow } from '../../charts/renderLanes';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatDate, formatMonth, formatNumber, formatShare } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { CompanySelect, DataState, EpochCredit, Facts, Lead, RuleNote } from './common';
import type { AngleProps } from './common';
import {
  FILES,
  fullPeriod,
  knownCompany,
  isFull,
  laneSummaries,
  monthEndMs,
  monthOfMs,
  monthStartMs,
  monthsBetween,
  parseArena,
  parseReleases,
  periodMonths,
  resolvePeriod,
} from './data';
import type { ArenaDataset, Month, Period, Release, ReleasesDataset } from './data';
import { MANUAL_EVENTS, arenaFirsts, busiestMonth, recentShare } from './insights';
import { ACCESS_TEXT, txt as shared } from './text';

const parse = (json: unknown): ReleasesDataset => parseReleases(json, FILES.releases);
const parseBoard = (json: unknown): ArenaDataset => parseArena(json, FILES.arena);

/** CHANGED (S3-ai3): an event on the timeline — its date, words and where it comes from. */
export type TimelineEvent = { key: string; date: string; title: string; detail: string; url?: string };

/** A highlighted company's dots carry names when the period is this short (months). */
export const LABEL_MONTHS = 24;

const txt = {
  from: { en: 'From', uk: 'Від' },
  to: { en: 'To', uk: 'До' },
  reset: { en: 'Whole period', uk: 'Увесь період' },
  status: { en: '{from} – {to}: {n} models · open weights {open}', uk: '{from} – {to}: моделей — {n} · відкриті ваги — {open}' },
  chartLabel: {
    en: 'Timeline: AI models of eight companies, one lane each, {from} – {to}: {counts}. Marked: {events}. The table view lists every model.',
    uk: 'Хронологія: AI-моделі восьми компаній, по доріжці на кожну, {from} – {to}: {counts}. Позначено: {events}. Таблиця містить кожну модель.',
  },
  // CHANGED (S3-ai3): headline, facts, events.
  lead: {
    en: '{from} – {to}: {n} models of the eight companies; the busiest month was {month}, with {k}.',
    uk: '{from} – {to}: моделей восьми компаній — {n}; найбільше за місяць — {k}, у {month}.',
  },
  leadNone: { en: '{from} – {to}: no models on the lanes.', uk: '{from} – {to}: на доріжках немає моделей.' },
  leadCompany: {
    en: '{name}: {n} models, {from} – {to} — the first {first} ({d1}), the latest {last} ({d2}).',
    uk: '{name}: моделей — {n}, {from} – {to}; перша — {first} ({d1}), остання — {last} ({d2}).',
  },
  leadCompanyOne: { en: '{name}: one model, {from} – {to} — {first} ({d1}).', uk: '{name}: одна модель, {from} – {to}, — {first} ({d1}).' },
  leadCompanyNone: { en: '{name}: no models, {from} – {to}.', uk: '{name}: моделей немає, {from} – {to}.' },
  factMonth: { en: 'The busiest month on the lanes: {month}, with {n} models of the eight companies.', uk: 'Найбільше моделей вісімки за місяць — {n}, у {month}.' },
  factRecent: {
    en: '{n} of the {total} models on the lanes ({share}) were published from {from} to {through}.',
    uk: '{n} з {total} моделей на доріжках ({share}) опубліковано з {from} року до {through}.',
  },
  eventFirst: { en: '{name}: first day at No. 1 on LMArena', uk: '{name}: перший день на №1 у LMArena' },
  legendEvents: { en: 'events (hover for what happened)', uk: 'події (наведіть, щоб побачити)' },
  eventsCaption: { en: 'Events on the timeline ({n})', uk: 'Події на хронології ({n})' },
  colEvent: { en: 'Event', uk: 'Подія' },
  colDetail: { en: 'Model or source', uk: 'Модель або джерело' },
  eventsNote: {
    en: 'Lines mark ChatGPT’s launch (OpenAI’s announcement) and the first day each company’s model was No. 1 on the LMArena text leaderboard — except OpenAI’s, which is where that series starts ({start}).',
    uk: 'Лінії позначають запуск ChatGPT (оголошення OpenAI) і перший день, коли модель кожної компанії була №1 у текстовому рейтингу LMArena, — крім OpenAI, з якої цей ряд починається ({start}).',
  },
  open: { en: 'open weights', uk: 'відкриті ваги' },
  closed: { en: 'closed', uk: 'закриті' },
  unknown: { en: 'access not recorded', uk: 'доступ не зазначено' },
  highlighted: { en: '{name} — highlighted', uk: '{name} — виділено' },
  kpiModels: { en: 'models on the lanes, {from} – {to}', uk: 'моделей на доріжках, {from} – {to}' },
  kpiOpen: { en: 'with open weights', uk: 'з відкритими вагами' },
  kpiMost: { en: 'most models in the period', uk: 'найбільше моделей за період' },
  kpiNewest: { en: 'newest in the period', uk: 'найновіша за період' },
  note: {
    en: 'A lane holds the models of the product lines in its label (a model must carry the line’s name and come from the company itself: GPT-Neo by EleutherAI is not on OpenAI’s lane, Llama Nemotron by Nvidia is not on Meta’s). The companies’ other models — BERT, T5, AlphaFold… — are counted in “Scale” and “Who and where”. Language and multimodal models only; the data run to {through}.',
    uk: 'На доріжці — моделі лінійок, названих у її підписі (модель має носити назву лінійки й походити від самої компанії: GPT-Neo від EleutherAI не на доріжці OpenAI, Llama Nemotron від Nvidia — не на доріжці Meta). Інші моделі компаній — BERT, T5, AlphaFold… — враховано в «Масштабі» та «Хто й звідки». Лише мовні й мультимодальні моделі; дані — до {through}.',
  },
  sumCaption: { en: 'Models on each lane, {from} – {to}', uk: 'Моделі на кожній доріжці, {from} – {to}' },
  colLines: { en: 'Lines', uk: 'Лінійки' },
  colModels: { en: 'Models', uk: 'Моделей' },
  colOpen: { en: 'Open weights', uk: 'Відкриті ваги' },
  colFirst: { en: 'First in the period', uk: 'Перша за період' },
  colLast: { en: 'Last in the period', uk: 'Остання за період' },
  listCaption: { en: 'Every model, {from} – {to} ({n})', uk: 'Усі моделі, {from} – {to} ({n})' },
  listCaptionOne: { en: '{name}: every model, {from} – {to} ({n})', uk: '{name}: усі моделі, {from} – {to} ({n})' },
} as const;

export function TimelineAngle(props: AngleProps) {
  const state = useDataset(dataUrl('ai-models', FILES.releases), parse);
  const board = useDataset(dataUrl('ai-models', FILES.arena), parseBoard);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  if (board.status !== 'ready') return <DataState status={board.status} retry={board.status === 'error' ? board.retry : undefined} />;
  return <TimelineView ds={state.data} board={board.data} {...props} />;
}

function TimelineView({ ds, board, settings, update }: AngleProps & { ds: ReleasesDataset; board: ArenaDataset }) {
  const { t, lang } = useLang();
  const base = useId();
  const full = useMemo(() => fullPeriod(ds), [ds]);
  const period = resolvePeriod(full, settings.from, settings.to);
  const company = knownCompany(ds.heroes, settings.company);
  const nameOf = useMemo(() => new Map(ds.heroes.map((h) => [h.id, h.name])), [ds]);

  const setPeriod = useCallback(
    (p: Period) => {
      const whole = isFull(p, full);
      update({ from: whole ? null : p.from, to: whole ? null : p.to });
    },
    [full, update],
  );
  const onBrush = useCallback(
    (span: [number, number] | null) => setPeriod(span ? resolvePeriod(full, monthOfMs(span[0]), monthOfMs(span[1] - 1)) : full),
    [full, setPeriod],
  );
  const formatTick = useCallback((ms: number, fine: boolean) => (fine ? formatMonth(monthOfMs(ms), lang) : String(new Date(ms).getUTCFullYear())), [lang]);

  const labelled = company !== null && periodMonths(period) <= LABEL_MONTHS;
  const lanes = useMemo(
    (): LaneRow[] => ds.heroes.map((h) => ({ key: h.id, label: h.name, sublabel: h.lines, emphasis: h.id === company })),
    [ds, company],
  );
  const points = useMemo(
    (): LanePoint[] =>
      ds.rows.map((r, i) => ({
        key: `${i}`,
        lane: r.hero,
        t: Date.parse(`${r.date}T00:00:00Z`),
        mark: r.access,
        label: labelled && r.hero === company ? r.model : undefined,
        tooltip: { title: r.model, lines: [`${nameOf.get(r.hero)} · ${formatDate(r.date, lang)}`, t(ACCESS_TEXT[r.access])] },
      })),
    [ds, labelled, company, nameOf, lang, t],
  );

  // CHANGED (S3-ai3): events — the first-party launch, then each company's first day at No. 1 (in date order).
  const events = useMemo(
    (): TimelineEvent[] =>
      [
        ...MANUAL_EVENTS.map((e) => ({ key: e.key, date: e.date, title: t(e.title), detail: new URL(e.url).hostname, url: e.url })),
        ...arenaFirsts(board).map((f) => ({ key: `first-${f.org}`, date: f.date, title: fill(t(txt.eventFirst), { name: nameOf.get(f.org) ?? f.org }), detail: f.model })),
      ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [board, nameOf, t],
  );
  const laneEvents = useMemo(
    (): LaneEvent[] => events.map((e) => ({ key: e.key, t: Date.parse(`${e.date}T00:00:00Z`), tooltip: { title: e.title, lines: [`${formatDate(e.date, lang)} · ${e.detail}`] } })),
    [events, lang],
  );

  const sums = laneSummaries(ds, period);
  const inPeriod = sums.flatMap((s) => s.models).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.model < b.model ? -1 : 1));
  const open = inPeriod.filter((r) => r.access === 'open').length;
  const most = sums.reduce((a, b) => (b.models.length > a.models.length ? b : a));
  const newest = inPeriod.at(-1);
  const fromText = formatMonth(period.from, lang);
  const toText = formatMonth(period.to, lang);
  const share = inPeriod.length ? formatShare(open / inPeriod.length, lang) : '—';
  const months = monthsBetween(full.from, full.to);
  const label = fill(t(txt.chartLabel), {
    from: fromText,
    to: toText,
    counts: sums.map((s) => `${s.hero.name} ${formatNumber(s.models.length, lang)}`).join(', '),
    events: events.map((e) => `${e.title}, ${formatDate(e.date, lang)}`).join('; '),
  });

  // CHANGED (S3-ai3): the headline follows the period and the highlighted company; the facts are about all the data.
  const peak = busiestMonth(inPeriod);
  const own = company ? inPeriod.filter((r) => r.hero === company) : [];
  const cname = company ? (nameOf.get(company) ?? '') : '';
  const lead = company
    ? own.length === 0
      ? fill(t(txt.leadCompanyNone), { name: cname, from: fromText, to: toText })
      : own.length === 1
        ? fill(t(txt.leadCompanyOne), { name: cname, from: fromText, to: toText, first: own[0]!.model, d1: formatDate(own[0]!.date, lang) })
        : fill(t(txt.leadCompany), {
            name: cname,
            n: formatNumber(own.length, lang),
            from: fromText,
            to: toText,
            first: own[0]!.model,
            d1: formatDate(own[0]!.date, lang),
            last: own.at(-1)!.model,
            d2: formatDate(own.at(-1)!.date, lang),
          })
    : peak
      ? fill(t(txt.lead), { from: fromText, to: toText, n: formatNumber(inPeriod.length, lang), month: formatMonth(peak.month, lang), k: formatNumber(peak.n, lang) })
      : fill(t(txt.leadNone), { from: fromText, to: toText });
  const allPeak = busiestMonth(ds.rows);
  const recent = recentShare(ds.rows, ds.through, 3);
  const facts = [
    ...(allPeak ? [fill(t(txt.factMonth), { month: formatMonth(allPeak.month, lang), n: formatNumber(allPeak.n, lang) })] : []),
    fill(t(txt.factRecent), {
      n: formatNumber(recent.n, lang),
      total: formatNumber(recent.total, lang),
      share: formatShare(recent.n / Math.max(1, recent.total), lang),
      from: recent.from,
      through: formatDate(ds.through, lang),
    }),
  ];

  return (
    <>
      <Lead text={lead} />
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <CompanySelect heroes={ds.heroes} value={company} onChange={(id) => update({ company: id })} />
        <MonthSelect id={`${base}-from`} label={t(txt.from)} months={months} value={period.from} onChange={(m) => setPeriod(resolvePeriod(full, m, m > period.to ? m : period.to))} />
        <MonthSelect id={`${base}-to`} label={t(txt.to)} months={months} value={period.to} onChange={(m) => setPeriod(resolvePeriod(full, m < period.from ? m : period.from, m))} />
        {!isFull(period, full) && (
          <div className="field field-auto">
            <span className="field-label" aria-hidden="true">
              &nbsp;
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setPeriod(full)}>
              {t(txt.reset)}
            </button>
          </div>
        )}
      </div>
      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { from: fromText, to: toText, n: formatNumber(inPeriod.length, lang), open: share })}
      </p>

      {settings.view === 'table' ? (
        <TimelineTables ds={ds} period={period} company={company} rows={inPeriod} fromText={fromText} toText={toText} events={events} />
      ) : (
        <>
          <ul className="key-list" aria-label={t(shared.legend)}>
            <li>
              <span className="key-dot is-open" aria-hidden="true" />
              {t(txt.open)}
            </li>
            <li>
              <span className="key-dot is-closed" aria-hidden="true" />
              {t(txt.closed)}
            </li>
            <li>
              <span className="key-dot is-unknown" aria-hidden="true" />
              {t(txt.unknown)}
            </li>
            {company && (
              <li>
                <span className="key-dot is-emphasis" aria-hidden="true" />
                {fill(t(txt.highlighted), { name: nameOf.get(company) ?? '' })}
              </li>
            )}
            <li>
              <span className="key-dash" aria-hidden="true" />
              {t(txt.legendEvents)}
            </li>
          </ul>
          <Lanes
            lanes={lanes}
            points={points}
            label={label}
            domain={[monthStartMs(full.from), monthEndMs(full.to)]}
            view={[monthStartMs(period.from), monthEndMs(period.to)]}
            formatTick={formatTick}
            onBrush={onBrush}
            events={laneEvents}
          />
        </>
      )}

      <ul className="kpi-row" aria-label={t(shared.keyFigures)}>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(inPeriod.length, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiModels), { from: fromText, to: toText })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{share}</span>
          <span className="kpi-label">{t(txt.kpiOpen)}</span>
        </li>
        {most.models.length > 0 && (
          <li className="kpi">
            <span className="kpi-value">
              {most.hero.name} · {formatNumber(most.models.length, lang)}
            </span>
            <span className="kpi-label">{t(txt.kpiMost)}</span>
          </li>
        )}
        {newest && (
          <li className="kpi">
            <span className="kpi-value">{newest.model}</span>
            <span className="kpi-label">
              {t(txt.kpiNewest)} · {nameOf.get(newest.hero)}, {formatDate(newest.date, lang)}
            </span>
          </li>
        )}
      </ul>
      <Facts items={facts} />
      <p className="chart-note muted">{fill(t(txt.note), { through: formatDate(ds.through, lang) })}</p>
      <p className="chart-note muted">{fill(t(txt.eventsNote), { start: formatDate(board.snapshots[0]!.date, lang) })}</p>
      <RuleNote ds={ds} />
      <EpochCredit ds={ds} />
    </>
  );
}

function MonthSelect({ id, label, months, value, onChange }: { id: string; label: string; months: readonly Month[]; value: Month; onChange: (m: Month) => void }) {
  const { lang } = useLang();
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {years.map((y) => (
          <optgroup key={y} label={y}>
            {months
              .filter((m) => m.startsWith(y))
              .map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m, lang)}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

type TablesProps = { ds: ReleasesDataset; period: Period; company: string | null; rows: readonly Release[]; fromText: string; toText: string; events: readonly TimelineEvent[] };

function TimelineTables({ ds, period, company, rows, fromText, toText, events }: TablesProps) {
  const { t, lang } = useLang();
  const sums = laneSummaries(ds, period);
  const listed = company ? rows.filter((r) => r.hero === company) : rows;
  const nameOf = new Map(ds.heroes.map((h) => [h.id, h.name]));
  const span = (r: Release | undefined): string => (r ? `${r.model} · ${formatDate(r.date, lang)}` : '—');
  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <caption>{fill(t(txt.sumCaption), { from: fromText, to: toText })}</caption>
          <thead>
            <tr>
              <th scope="col">{t(shared.colCompany)}</th>
              <th scope="col">{t(txt.colLines)}</th>
              <th scope="col" className="num">
                {t(txt.colModels)}
              </th>
              <th scope="col" className="num">
                {t(txt.colOpen)}
              </th>
              <th scope="col">{t(txt.colFirst)}</th>
              <th scope="col">{t(txt.colLast)}</th>
            </tr>
          </thead>
          <tbody>
            {sums.map((s) => (
              <tr key={s.hero.id} className={s.hero.id === company ? 'is-home' : undefined}>
                <th scope="row">{s.hero.name}</th>
                <td>{s.hero.lines}</td>
                <td className="num">{formatNumber(s.models.length, lang)}</td>
                <td className="num">{formatNumber(s.open, lang)}</td>
                <td>{span(s.models[0])}</td>
                <td>{span(s.models.at(-1))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            {company
              ? fill(t(txt.listCaptionOne), { name: nameOf.get(company) ?? '', from: fromText, to: toText, n: formatNumber(listed.length, lang) })
              : fill(t(txt.listCaption), { from: fromText, to: toText, n: formatNumber(listed.length, lang) })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t(shared.colDate)}</th>
              <th scope="col">{t(shared.colModel)}</th>
              <th scope="col">{t(shared.colCompany)}</th>
              <th scope="col">{t(shared.colWeights)}</th>
            </tr>
          </thead>
          <tbody>
            {listed.map((r, i) => (
              <tr key={`${r.date}-${r.model}-${i}`}>
                <td>{formatDate(r.date, lang)}</td>
                <th scope="row">{r.model}</th>
                <td>{nameOf.get(r.hero)}</td>
                <td>{t(ACCESS_TEXT[r.access])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* CHANGED (S3-ai3): the events, with their dates and sources */}
      <div className="table-wrap">
        <table className="data-table">
          <caption>{fill(t(txt.eventsCaption), { n: events.length })}</caption>
          <thead>
            <tr>
              <th scope="col">{t(shared.colDate)}</th>
              <th scope="col">{t(txt.colEvent)}</th>
              <th scope="col">{t(txt.colDetail)}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.key}>
                <td>{formatDate(e.date, lang)}</td>
                <th scope="row">{e.title}</th>
                <td>
                  {e.url ? (
                    <a href={e.url} rel="noopener noreferrer" target="_blank">
                      {e.detail}
                    </a>
                  ) : (
                    e.detail
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

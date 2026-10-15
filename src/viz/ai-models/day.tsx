// day.tsx — CHANGED (S3-ai4): angle G "Then and now" — pick a day and read what the files showed then (No. 1 on LMArena,
// models of the eight companies, the largest training run, the companies' own user counts) next to the latest figure of
// each file. No Play button and no animation (owner, 2026-10-15: a narrower "time machine" — the other angles already draw
// the history; this one is the cross-section). Keyboard: the date field, the range slider (arrows = one day) and the jumps.
// A lazy chunk of its own, like C · D · E; it loads records.json (19 rows) instead of compute.json.
import { useId, useMemo } from 'react';
import type { Localized } from '../../catalog/types';
import type { Lang } from '../../i18n/lang';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatDate, formatDays, formatFlop, formatNumber, formatPeople, formatShare } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { ArenaCredit, DataState, EpochCredit, Facts, Lead } from './common';
import type { AngleProps } from './common';
import { FILES, MANUAL_EVENTS, arenaRuns, daysBetween, parseArena, parseClaims, parseRecords, parseReleases } from './data';
import type { ArenaDataset, ClaimsDataset, ComputeRow, RecordsDataset, ReleasesDataset } from './data';
import {
  DAY_FIRST,
  addDays,
  afterDay,
  claimsOn,
  dayLast,
  dayPresets,
  defaultDay,
  firstClaimDay,
  leaderNow,
  leaderOn,
  modelsOn,
  recordOn,
  resolveDay,
} from './dayState';
import type { DayClaims, DayLeader, DayPreset } from './dayState';
import { oneStop, txt as shared } from './text';
import { METRIC_TEXT, PRODUCT_TEXT, claimText } from './views';

const parseRel = (json: unknown): ReleasesDataset => parseReleases(json, FILES.releases);
const parseAr = (json: unknown): ArenaDataset => parseArena(json, FILES.arena);
const parseRec = (json: unknown): RecordsDataset => parseRecords(json, FILES.records);
const parseCl = (json: unknown): ClaimsDataset => parseClaims(json, FILES.claims);

const txt = {
  day: { en: 'Day', uk: 'День' },
  slider: { en: 'Day, {from} – {to}', uk: 'День, {from} – {to}' },
  jumps: { en: 'Jump to', uk: 'Перейти до' },
  yearsAgo1: { en: 'A year earlier', uk: 'Рік тому' },
  yearsAgo2: { en: 'Two years earlier', uk: 'Два роки тому' },
  firstNo1: { en: '{name}: first No. 1', uk: '{name}: перший №1' },
  onDay: { en: 'On {date}', uk: 'На {date}' },
  latest: { en: 'Latest in the data', uk: 'Останнє в даних' },
  then: { en: 'Then', uk: 'Тоді' },
  now: { en: 'Latest', uk: 'Останнє' },
  rowNo1: { en: 'No. 1 on LMArena', uk: '№1 на LMArena' },
  rowNo1Sub: { en: 'text leaderboard, overall', uk: 'текстовий рейтинг, overall' },
  rowModels: { en: 'Models of the eight companies', uk: 'Моделі восьми компаній' },
  rowModelsSub: { en: 'on the timeline’s lanes', uk: 'на доріжках хронології' },
  rowFlop: { en: 'Largest training run', uk: 'Найбільше навчання' },
  rowFlopSub: { en: 'any organization, published figures', uk: 'будь-яка організація, оприлюднені числа' },
  rowUsers: { en: 'Users, as each company counts them', uk: 'Користувачі — як рахує кожна компанія' },
  rowUsersSub: { en: 'the companies’ own figures', uk: 'числа самих компаній' },
  inRow: { en: 'day {n} in a row, since {from}', uk: '{n}-й день поспіль, від {from}' },
  since: { en: '{company} · since {from} ({days})', uk: '{company} · від {from} ({days})' },
  noArena: { en: 'The LMArena data begin on {date}.', uk: 'Дані LMArena починаються {date}.' },
  noUsers: { en: 'No company had published a user count yet (the first: {date}).', uk: 'Жодна компанія ще не публікувала числа користувачів (перше — {date}).' },
  noUserSeries: { en: 'no figure yet', uk: 'числа ще немає' },
  noRecord: { en: 'No figure yet.', uk: 'Числа ще немає.' },
  released: { en: 'released by this day', uk: 'вийшло до цього дня' },
  through: { en: 'through {date}', uk: 'до {date}' },
  flopMeta: { en: '{model} · {org} · {date}', uk: '{model} · {org} · {date}' },
  asOf: { en: 'as of {date}', uk: 'станом на {date}' },
  legendThen: { en: 'by {date}', uk: 'до {date}' },
  legendNow: { en: 'through {date}', uk: 'до {date}' },
  barsLabel: { en: 'Models per company: by this day and through {date}', uk: 'Моделі за компаніями: до цього дня і до {date}' },
  lead: {
    en: 'On {date}, the eight companies had released {models}; by {through}, {now}. The largest training run then was {model}; today’s record, {top}, used ×{x} its compute.',
    uk: '{date} у восьми компаній було моделей — {n}; до {through} — {now}. Найбільше навчання тоді — {model}; нинішній рекорд, {top}, — ×{x} від нього.',
  },
  leadSame: {
    en: 'On {date}, the eight companies had released {models}; by {through}, {now}. {model}, the largest training run then, is still the record.',
    uk: '{date} у восьми компаній було моделей — {n}; до {through} — {now}. {model}, найбільше навчання тоді, досі рекорд.',
  },
  leadNoRecord: {
    en: 'On {date}, the eight companies had released {models}; by {through}, {now}.',
    uk: '{date} у восьми компаній було моделей — {n}; до {through} — {now}.',
  },
  leadNone: {
    en: 'On {date}, none of the eight companies had a model on the lanes yet; by {through}, {now}.',
    uk: '{date} жодна з восьми компаній ще не мала моделі на доріжках; до {through} їх {now}.',
  },
  factModels: {
    en: '{k} of the {n} models of the eight ({share}) were published after this day.',
    uk: '{k} з {n} моделей вісімки ({share}) опубліковано після цього дня.',
  },
  factRecords: { en: 'Since this day, the record for the largest training run has been broken {times}.', uk: 'Відтоді рекорд найбільшого навчання оновлювався {times}.' },
  factChanges: { en: 'Since this day, No. 1 on LMArena has passed from one company to another {times}.', uk: 'Відтоді №1 на LMArena переходило від однієї компанії до іншої {times}.' },
  factChangesFrom: {
    en: 'From {start}, where the LMArena data begin, No. 1 passed from one company to another {times}.',
    uk: 'Від {start}, звідки починаються дані LMArena, №1 переходило від однієї компанії до іншої {times}.',
  },
  noteDay: {
    en: 'Each “then” is the last figure dated on or before the day — nothing is interpolated. No. 1 holds from one snapshot of the board to the next, as in “No. 1 on LMArena”.',
    uk: 'Кожне «тоді» — останнє число, датоване цим днем або раніше, — нічого не інтерпольовано. №1 тримається від одного знімка рейтингу до наступного, як у «№1 на LMArena».',
  },
  noteFlop: {
    en: 'Closed models rarely publish their training compute, so the record is the largest published figure (as in “Scale”).',
    uk: 'Закриті моделі рідко публікують обчислення на навчання, тож рекорд — найбільше оприлюднене число (як у «Масштабі»).',
  },
  creditUsers: { en: 'User counts: the companies’ own posts and filings — sources in “Users”.', uk: 'Користувачі: дописи й документи самих компаній — джерела в «Користувачах».' },
  colMeasure: { en: 'Measure', uk: 'Показник' },
  colChange: { en: 'Change', uk: 'Зміна' },
  captionDay: { en: 'On {date} and in the latest data', uk: 'На {date} і в останніх даних' },
  captionModels: { en: 'Models per company: by {date} and through {through}', uk: 'Моделі за компаніями: до {date} і до {through}' },
} as const satisfies Record<string, Localized>;

/** "×2.6", "×20", "×56.9 million" — growth as a multiple, compact once it is large. */
function times(ratio: number, lang: Lang): string {
  if (ratio < 10) return `×${formatNumber(Math.round(ratio * 10) / 10, lang)}`;
  if (ratio < 1000) return `×${formatNumber(Math.round(ratio), lang)}`;
  return `×${formatPeople(ratio, lang)}`;
}

/** "once" / "twice" / "5 times" · «1 раз» / «2 рази» / «5 разів». */
function count(n: number, lang: Lang): string {
  if (lang === 'en') return n === 1 ? 'once' : n === 2 ? 'twice' : `${formatNumber(n, 'en')} times`;
  const form = new Intl.PluralRules('uk').select(n);
  return `${formatNumber(n, 'uk')} ${form === 'one' ? 'раз' : form === 'few' ? 'рази' : 'разів'}`;
}

/** "1 model" / "57 models" (English only — the Ukrainian sentences say «моделей — N»). */
const modelsEn = (n: number): string => (n === 1 ? '1 model' : `${formatNumber(n, 'en')} models`);

export function DayAngle(props: AngleProps) {
  const rel = useDataset(dataUrl('ai-models', FILES.releases), parseRel);
  const ar = useDataset(dataUrl('ai-models', FILES.arena), parseAr);
  const rec = useDataset(dataUrl('ai-models', FILES.records), parseRec);
  const cl = useDataset(dataUrl('ai-models', FILES.claims), parseCl);
  for (const s of [rel, ar, rec, cl]) if (s.status !== 'ready') return <DataState status={s.status} retry={s.status === 'error' ? s.retry : undefined} />;
  if (rel.status !== 'ready' || ar.status !== 'ready' || rec.status !== 'ready' || cl.status !== 'ready') return null;
  return <DayView rel={rel.data} ar={ar.data} rec={rec.data} cl={cl.data} {...props} />;
}

function DayView({ rel, ar, rec, cl, settings, update }: AngleProps & { rel: ReleasesDataset; ar: ArenaDataset; rec: RecordsDataset; cl: ClaimsDataset }) {
  const { t, lang } = useLang();
  const base = useId();
  const last = dayLast(ar, rel);
  const day = resolveDay(settings.on, last);
  const span = daysBetween(DAY_FIRST, last);
  const runs = useMemo(() => arenaRuns(ar), [ar]);
  const presets = useMemo(() => dayPresets(ar, last), [ar, last]);
  const nameOf = useMemo(() => new Map(rel.heroes.map((h) => [h.id, h.name])), [rel]);
  const name = (org: string): string => nameOf.get(org) ?? org;
  // The default day goes back to the canonical link (no ?on=).
  const go = (d: string): void => {
    if (d < DAY_FIRST || d > last) return;
    update({ on: d === defaultDay(last) ? null : d });
  };

  const models = modelsOn(rel, day);
  const leader = leaderOn(runs, day);
  const now = leaderNow(ar);
  const record = recordOn(rec.rows, day);
  const top = rec.rows.at(-1)!;
  const users = claimsOn(cl, day);
  const after = afterDay(models, rec.rows, runs, day);
  const d = (iso: string): string => formatDate(iso, lang);
  const product = (p: string): string => t(PRODUCT_TEXT[p] ?? { en: p, uk: p });

  const presetLabel = (p: DayPreset): string => {
    if (p.kind === 'years') return t(p.years === 1 ? txt.yearsAgo1 : txt.yearsAgo2);
    if (p.kind === 'manual') return t(MANUAL_EVENTS.find((e) => e.key === p.key)!.title);
    return fill(t(txt.firstNo1), { name: name(p.org) });
  };

  const words = { date: d(day), through: d(rel.through), now: formatNumber(models.now, lang), n: formatNumber(models.then, lang), models: modelsEn(models.then) };
  const lead =
    models.then === 0
      ? fill(t(txt.leadNone), words)
      : !record
        ? fill(t(txt.leadNoRecord), words)
        : record.flop < top.flop
          ? fill(t(txt.lead), { ...words, model: record.model, top: top.model, x: times(top.flop / record.flop, lang).slice(1) })
          : fill(t(txt.leadSame), { ...words, model: record.model });
  const facts = [
    after.models > 0 ? fill(t(txt.factModels), { k: formatNumber(after.models, lang), n: formatNumber(models.now, lang), share: formatShare(after.models / models.now, lang) }) : null,
    after.records > 0 ? fill(t(txt.factRecords), { times: count(after.records, lang) }) : null,
    after.changes > 0 ? fill(t(after.beforeArena ? txt.factChangesFrom : txt.factChanges), { times: count(after.changes, lang), start: d(runs[0]!.from) }) : null,
  ].filter((f): f is string => f !== null);

  const inRow = (l: DayLeader): string => fill(t(txt.inRow), { n: formatNumber(l.inRow, lang), from: d(l.run.from) });
  const flopMeta = (r: ComputeRow): string => fill(t(txt.flopMeta), { model: r.model, org: r.org ?? '—', date: d(r.date) });
  const claimLine = (c: DayClaims, which: 'then' | 'now'): string | null => {
    const claim = which === 'then' ? c.then : c.now;
    return claim ? `${claimText(claim, lang)} ${t(METRIC_TEXT[c.series.metric])}` : null;
  };
  const claimChange = (c: DayClaims): string | null => (c.then && c.now.value > c.then.value ? times(c.now.value / c.then.value, lang) : null);
  const anyThen = users.some((u) => u.then);
  const maxNow = Math.max(...models.byCompany.map((c) => c.now));

  return (
    <>
      <Lead text={lead} />
      <div className="day-when" role="group" aria-label={t(ui.chartSettings)}>
        <div className="day-when-row">
          <div className="field">
            <label htmlFor={`${base}-date`}>{t(txt.day)}</label>
            <input id={`${base}-date`} type="date" min={DAY_FIRST} max={last} value={day} onChange={(e) => go(e.target.value)} />
          </div>
          <div className="field day-range">
            <label htmlFor={`${base}-range`}>{fill(t(txt.slider), { from: d(DAY_FIRST), to: d(last) })}</label>
            <input
              id={`${base}-range`}
              type="range"
              min={0}
              max={span}
              step={1}
              value={daysBetween(DAY_FIRST, day)}
              aria-valuetext={d(day)}
              onChange={(e) => go(addDays(DAY_FIRST, Number(e.target.value)))}
            />
          </div>
        </div>
        <div className="field">
          <span className="field-label" id={`${base}-jumps`}>
            {t(txt.jumps)}
          </span>
          <div className="day-jumps" role="group" aria-labelledby={`${base}-jumps`}>
            {presets.map((p) => (
              <button key={p.date} type="button" className="day-jump" aria-pressed={p.date === day} onClick={() => go(p.date)}>
                {presetLabel(p)} <time dateTime={p.date}>{d(p.date)}</time>
              </button>
            ))}
          </div>
        </div>
      </div>

      {settings.view === 'table' ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <caption>{fill(t(txt.captionDay), { date: d(day) })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t(txt.colMeasure)}</th>
                  <th scope="col">{fill(t(txt.onDay), { date: d(day) })}</th>
                  <th scope="col">{t(txt.latest)}</th>
                  <th scope="col">{t(txt.colChange)}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{t(txt.rowNo1)}</th>
                  <td>{leader ? `${leader.run.model} (${name(leader.run.org)}), ${inRow(leader)}` : oneStop(fill(t(txt.noArena), { date: d(runs[0]!.from) }))}</td>
                  <td>{`${now.run.model} (${name(now.run.org)}), ${d(now.run.from)}`}</td>
                  <td />
                </tr>
                <tr>
                  <th scope="row">{t(txt.rowModels)}</th>
                  <td className="num">{formatNumber(models.then, lang)}</td>
                  <td className="num">{`${formatNumber(models.now, lang)} (${fill(t(txt.through), { date: d(rel.through) })})`}</td>
                  <td className="num">{models.then > 0 ? times(models.now / models.then, lang) : ''}</td>
                </tr>
                <tr>
                  <th scope="row">{t(txt.rowFlop)}</th>
                  <td>{record ? `${formatFlop(record.flop, lang)} — ${flopMeta(record)}` : t(txt.noRecord)}</td>
                  <td>{`${formatFlop(top.flop, lang)} — ${flopMeta(top)}`}</td>
                  <td className="num">{record && record.flop < top.flop ? times(top.flop / record.flop, lang) : ''}</td>
                </tr>
                {users.map((u) => (
                  <tr key={u.series.key}>
                    <th scope="row">{`${t(txt.rowUsers)}: ${product(u.series.product)}`}</th>
                    <td>{u.then ? `${claimLine(u, 'then')}, ${fill(t(txt.asOf), { date: d(u.then.asOf) })}` : t(txt.noUserSeries)}</td>
                    <td>{`${claimLine(u, 'now')}, ${fill(t(txt.asOf), { date: d(u.now.asOf) })}`}</td>
                    <td className="num">{claimChange(u) ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <caption>{fill(t(txt.captionModels), { date: d(day), through: d(rel.through) })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t(shared.colCompany)}</th>
                  <th scope="col">{fill(t(txt.onDay), { date: d(day) })}</th>
                  <th scope="col">{fill(t(txt.through), { date: d(rel.through) })}</th>
                </tr>
              </thead>
              <tbody>
                {models.byCompany.map((c) => (
                  <tr key={c.hero.id}>
                    <th scope="row">{c.hero.name}</th>
                    <td className="num">{formatNumber(c.then, lang)}</td>
                    <td className="num">{formatNumber(c.now, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="day-cmp">
          <div className="day-cmp-head" aria-hidden="true">
            <span />
            <span>{fill(t(txt.onDay), { date: d(day) })}</span>
            <span>{t(txt.latest)}</span>
          </div>
          <section className="day-cmp-row" aria-label={t(txt.rowNo1)}>
            <h3 className="day-cmp-label">
              {t(txt.rowNo1)}
              <small>{t(txt.rowNo1Sub)}</small>
            </h3>
            <div className="day-cell">
              <span className="day-tag">{fill(t(txt.onDay), { date: d(day) })}</span>
              {leader ? (
                <>
                  <span className="day-model">{leader.run.model}</span>
                  <span className="day-meta">{`${name(leader.run.org)} · ${inRow(leader)}`}</span>
                </>
              ) : (
                <span className="day-none">{oneStop(fill(t(txt.noArena), { date: d(runs[0]!.from) }))}</span>
              )}
            </div>
            <div className="day-cell">
              <span className="day-tag">{t(txt.now)}</span>
              <span className="day-model">{now.run.model}</span>
              <span className="day-meta">{fill(t(txt.since), { company: name(now.run.org), from: d(now.run.from), days: formatDays(now.inRow, lang) })}</span>
            </div>
          </section>
          <section className="day-cmp-row" aria-label={t(txt.rowModels)}>
            <h3 className="day-cmp-label">
              {t(txt.rowModels)}
              <small>{t(txt.rowModelsSub)}</small>
            </h3>
            <div className="day-cell">
              <span className="day-tag">{fill(t(txt.onDay), { date: d(day) })}</span>
              <span className="day-big">{formatNumber(models.then, lang)}</span>
              <span className="day-meta">{t(txt.released)}</span>
            </div>
            <div className="day-cell">
              <span className="day-tag">{t(txt.now)}</span>
              <span className="day-big">
                {formatNumber(models.now, lang)}
                {models.then > 0 && models.now > models.then && <span className="day-x">{times(models.now / models.then, lang)}</span>}
              </span>
              <span className="day-meta">{fill(t(txt.through), { date: d(rel.through) })}</span>
            </div>
            <div className="day-bars" role="list" aria-label={fill(t(txt.barsLabel), { date: d(rel.through) })}>
              {models.byCompany.map((c) => (
                <div key={c.hero.id} className="day-bar" role="listitem">
                  <span className="day-bar-name">{c.hero.name}</span>
                  <span className="day-bar-track" aria-hidden="true">
                    <svg viewBox="0 0 100 10" preserveAspectRatio="none">
                      <rect className="day-bar-now" x="0" y="0" height="10" width={(c.now / maxNow) * 100} />
                      <rect className="day-bar-then" x="0" y="0" height="10" width={(c.then / maxNow) * 100} />
                    </svg>
                  </span>
                  <span className="day-bar-nums">
                    {formatNumber(c.then, lang)} → {formatNumber(c.now, lang)}
                  </span>
                </div>
              ))}
              <ul className="key-list day-bars-key" aria-hidden="true">
                <li>
                  <span className="day-swatch is-then" />
                  {fill(t(txt.legendThen), { date: d(day) })}
                </li>
                <li>
                  <span className="day-swatch is-now" />
                  {fill(t(txt.legendNow), { date: d(rel.through) })}
                </li>
              </ul>
            </div>
          </section>
          <section className="day-cmp-row" aria-label={t(txt.rowFlop)}>
            <h3 className="day-cmp-label">
              {t(txt.rowFlop)}
              <small>{t(txt.rowFlopSub)}</small>
            </h3>
            <div className="day-cell">
              <span className="day-tag">{fill(t(txt.onDay), { date: d(day) })}</span>
              {record ? (
                <>
                  <span className="day-big">{formatFlop(record.flop, lang)} FLOP</span>
                  <span className="day-meta">{flopMeta(record)}</span>
                </>
              ) : (
                <span className="day-none">{t(txt.noRecord)}</span>
              )}
            </div>
            <div className="day-cell">
              <span className="day-tag">{t(txt.now)}</span>
              <span className="day-big">
                {formatFlop(top.flop, lang)} FLOP
                {record && record.flop < top.flop && <span className="day-x">{times(top.flop / record.flop, lang)}</span>}
              </span>
              <span className="day-meta">{flopMeta(top)}</span>
            </div>
          </section>
          <section className="day-cmp-row" aria-label={t(txt.rowUsers)}>
            <h3 className="day-cmp-label">
              {t(txt.rowUsers)}
              <small>{t(txt.rowUsersSub)}</small>
            </h3>
            <div className="day-cell">
              <span className="day-tag">{fill(t(txt.onDay), { date: d(day) })}</span>
              {anyThen ? (
                <ul className="day-users">
                  {users
                    .filter((u) => u.then)
                    .map((u) => (
                      <li key={u.series.key}>
                        <b>{product(u.series.product)}</b> {claimLine(u, 'then')}
                        <span className="day-meta">{fill(t(txt.asOf), { date: d(u.then!.asOf) })}</span>
                      </li>
                    ))}
                </ul>
              ) : (
                <span className="day-none">{fill(t(txt.noUsers), { date: d(firstClaimDay(cl)) })}</span>
              )}
            </div>
            <div className="day-cell">
              <span className="day-tag">{t(txt.now)}</span>
              <ul className="day-users">
                {users.map((u) => (
                  <li key={u.series.key}>
                    <b>{product(u.series.product)}</b> {claimLine(u, 'now')}
                    {claimChange(u) && <span className="day-x">{claimChange(u)}</span>}
                    <span className="day-meta">{fill(t(txt.asOf), { date: d(u.now.asOf) })}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}

      <Facts items={facts} />
      <p className="chart-note muted">{t(txt.noteDay)}</p>
      <p className="chart-note muted">{t(txt.noteFlop)}</p>
      <EpochCredit ds={rel} />
      <ArenaCredit retrieved={ar.retrieved} />
      <p className="chart-note muted">{t(txt.creditUsers)}</p>
    </>
  );
}

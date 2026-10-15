// common.tsx — CHANGED (S3-ai1): pieces the angles share — props, loading / error state, the company select, the
// Epoch credit and the rule that chose the eight companies. CHANGED (S3-ai3): the headline sentence and "Did you know".
import { useId } from 'react';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatDate, formatNumber } from '../../lib/format';
import type { Hero, ReleasesDataset } from './data';
import type { AiState } from './state';
import { oneStop, txt } from './text';

export type AngleProps = { settings: AiState; update: (patch: Partial<AiState>) => void };

/** Loading and error states shared by the angles (the same markup as the other entries). */
export function DataState({ status, retry }: { status: 'loading' | 'error'; retry?: () => void }) {
  const { t } = useLang();
  if (status === 'loading') return <p className="muted stage-loading">{t(ui.loading)}</p>;
  return (
    <div className="notice notice-warn load-error" role="alert">
      <p>{t(ui.dataLoadError)}</p>
      <button type="button" className="btn btn-ghost" onClick={retry}>
        {t(ui.retry)}
      </button>
    </div>
  );
}

/** The company to highlight (an id that is not one of the eight reads as none). */
export function CompanySelect({ heroes, value, onChange }: { heroes: readonly Hero[]; value: string | null; onChange: (id: string | null) => void }) {
  const { t } = useLang();
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{t(txt.company)}</label>
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{t(txt.none)}</option>
        {heroes.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// CHANGED (S3-ai4): oneStop — a Ukrainian date ends in "р.", so "{retrieved}." printed "р..".
export function EpochCredit({ ds }: { ds: { epochUpdated: string; retrieved: string } }) {
  const { t, lang } = useLang();
  return <p className="chart-note muted">{oneStop(fill(t(txt.creditEpoch), { updated: formatDate(ds.epochUpdated, lang), retrieved: formatDate(ds.retrieved, lang) }))}</p>;
}

/** CHANGED (S3-ai4): the LMArena credit (angles C and G). */
export function ArenaCredit({ retrieved }: { retrieved: string }) {
  const { t, lang } = useLang();
  return <p className="chart-note muted">{oneStop(fill(t(txt.creditArena), { retrieved: formatDate(retrieved, lang) }))}</p>;
}

/** The rule, its result and the closest companies outside — stated on the page, not only in the docs. */
export function RuleNote({ ds }: { ds: ReleasesDataset }) {
  const { t, lang } = useLang();
  const r = ds.rule;
  return (
    <details className="rule-note">
      <summary>{t(txt.ruleTitle)}</summary>
      <p>
        {fill(t(txt.rule), {
          days: r.minTop3Days,
          from: formatDate(r.arenaFrom, lang),
          to: formatDate(r.arenaTo, lang),
          derived: r.minDerived,
          t3name: r.nextTop3.name,
          t3days: formatNumber(r.nextTop3.days, lang),
          dname: r.nextDerived.name,
          dmodels: formatNumber(r.nextDerived.models, lang),
        })}
      </p>
      <ul>
        {ds.heroes.map((h) => (
          <li key={h.id}>
            {fill(t(txt.ruleRow), { name: h.name, days: formatNumber(h.top3Days, lang), derived: formatNumber(h.derived, lang), orgs: formatNumber(h.derivedOrgs, lang) })}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** CHANGED (S3-ai3): one sentence above the chart that says what the current view shows (numbers from the data). */
export function Lead({ text }: { text: string }) {
  return <p className="angle-lead">{oneStop(text)}</p>;
}

/** CHANGED (S3-ai3): two or three facts under the chart, each computed by a rule in insights.ts. */
export function Facts({ items }: { items: readonly string[] }) {
  const { t } = useLang();
  const id = useId();
  if (!items.length) return null;
  return (
    <section className="angle-facts" aria-labelledby={id}>
      <h3 id={id}>{t(txt.factsTitle)}</h3>
      <ul>
        {items.map((f) => (
          <li key={f}>{oneStop(f)}</li>
        ))}
      </ul>
    </section>
  );
}

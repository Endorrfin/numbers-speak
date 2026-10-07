// CountryPage.tsx — CHANGED (S3-cp): "Ukraine in numbers" (#/c/ua). One country's place in every ranking of the
// gallery, grouped by section, each row opening the entry with the country highlighted; then the key figures of the
// entries that are about Ukraine only. Data: public/data/country-facts.json (scripts/gen-facts.ts), fetched here only.
import { useMemo } from 'react';
import { CATALOG } from '../../catalog';
import { FACTS_URL, FACT_GROUPS, parseFacts } from '../../catalog/facts';
import type { FactId } from '../../catalog/facts';
import { isVisible } from '../../catalog/filter';
import { getPreview } from '../../catalog/previews';
import type { Lang } from '../../catalog/types';
import { pick, useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { IS_DEV } from '../../lib/env';
import { hrefCatalog, hrefViz } from '../../lib/hashRouter';
import { HOME_CODE, isProfileCode } from '../../lib/home';
import { groupFacts, positionOf, profileOf } from '../../lib/profile';
import type { ProfileFact } from '../../lib/profile';
import { useDataset } from '../../lib/useDataset';
import { formatKeyLabel, formatKeyValue } from '../catalog/previewFormat';
import { NotFound } from '../pages/NotFound';
import { formatFact } from './factFormat';
import { GROUP_TITLES, countriesWord, rankingsCount, rankingsIn, txt } from './text';

/** The four figures in the top row, when the country has them. */
const KEY_FACTS: readonly FactId[] = ['population', 'gdp-total', 'deaths-per-birth', 'peace-index'];

function Flag({ code }: { code: string }) {
  const src = flagUrl(code);
  return src ? <img className="prof-flag" src={src} alt="" width={30} height={22} decoding="async" /> : null;
}

const yearOf = (f: ProfileFact): number | null => f.ownYear ?? f.table.year;

function Value({ f, lang }: { f: ProfileFact; lang: Lang }) {
  const year = yearOf(f);
  return (
    <span className="prof-value">
      {formatFact(f.value, f.table.format, lang)}
      {f.marked && <span className="prof-mark">*</span>}
      {year !== null && <small>{year}</small>}
    </span>
  );
}

function RankText({ f, lang }: { f: ProfileFact; lang: Lang }) {
  const of = fill(pick(txt.of, lang), { of: f.of });
  const head = f.tieTo ? fill(pick(txt.shared, lang), { from: f.rank, to: f.tieTo }) : fill(pick(txt.rank, lang), { rank: f.rank });
  const c = f.change;
  const change = c
    ? c.places === 0
      ? fill(pick(txt.same, lang), { year: c.since })
      : fill(pick(c.places > 0 ? txt.up : txt.down, lang), { n: Math.abs(c.places), year: c.since })
    : null;
  return (
    <span className="prof-rank">
      {head} <span className="prof-of">{of}</span>
      {change && <span className="prof-change">{change}</span>}
    </span>
  );
}

/** The 1…N line: a dot at the place, or a band over a shared rank. Decorative — the rank text says the same. */
function Position({ f }: { f: ProfileFact }) {
  const at = (n: number) => `${(positionOf(n, f.of) * 100).toFixed(2)}%`;
  return (
    <span className="prof-pos" aria-hidden="true">
      <span className="prof-track" />
      {f.tieTo ? (
        <span className="prof-tie" style={{ left: at(f.rank), right: `calc(100% - ${at(f.tieTo)})` }} />
      ) : (
        <span className="prof-dot" style={{ left: at(f.rank) }} />
      )}
      <span className="prof-end prof-end-l">1</span>
      <span className="prof-end prof-end-r">{f.of}</span>
    </span>
  );
}

function FactRow({ f, lang }: { f: ProfileFact; lang: Lang }) {
  const label = pick(f.table.label, lang);
  const notes = [fill(pick(f.table.first, lang), { of: f.of })];
  if (f.tieTo) {
    const k = f.tieTo - f.rank;
    notes.push(fill(pick(txt.sameAs, lang), { k, countries: countriesWord(k, lang) }));
  }
  if (f.ownYear !== undefined && f.table.year !== null) notes.push(fill(pick(txt.ownYear, lang), { own: f.ownYear, year: f.table.year }));
  return (
    <li className="prof-row">
      <span className="prof-label">
        <span className="prof-name">{label}</span>
        <span className="prof-first">{notes.join(' · ')}</span>
      </span>
      <Value f={f} lang={lang} />
      <RankText f={f} lang={lang} />
      <Position f={f} />
      <a className="prof-open" href={hrefViz(f.table.entry, f.link)} aria-label={fill(pick(txt.openLabel, lang), { label })}>
        {pick(txt.open, lang)}
      </a>
    </li>
  );
}

/** Published entries about Ukraine only, with the key figure of their card preview. */
function onlyHome() {
  return CATALOG.filter((m) => m.geo === 'ukraine' && m.status === 'published' && isVisible(m, IS_DEV))
    .map((m) => ({ meta: m, preview: getPreview(m.id) }))
    .filter((x) => x.preview !== undefined);
}

export function CountryPage({ code }: { code: string }) {
  const { lang, t } = useLang();
  const state = useDataset(FACTS_URL, parseFacts);
  const profile = useMemo(() => (state.status === 'ready' ? profileOf(state.data.tables, code) : null), [state, code]);
  const only = useMemo(() => (code === HOME_CODE ? onlyHome() : []), [code]);

  if (!isProfileCode(code)) return <NotFound />;

  const country = countryName(code, lang);
  const title = fill(pick(txt.title, lang), { country });

  let body;
  if (state.status === 'loading') body = <p className="muted">{t(ui.loading)}</p>;
  else if (state.status === 'error') {
    body = (
      <div className="notice notice-warn load-error" role="alert">
        <p>{t(ui.dataLoadError)}</p>
        <button type="button" className="btn btn-ghost" onClick={state.retry}>
          {t(ui.retry)}
        </button>
      </div>
    );
  } else if (profile) {
    const n = profile.facts.length;
    const keys = KEY_FACTS.map((id) => profile.facts.find((f) => f.table.id === id)).filter((f): f is ProfileFact => f !== undefined);
    body = (
      <>
        <p className="lede prof-lede">{fill(pick(txt.lede, lang), { country, n, rankings: rankingsIn(n, lang) })}</p>
        {keys.length > 0 && (
          <ul className="kpi-row prof-kpis">
            {keys.map((f) => (
              <li className="kpi" key={f.table.id}>
                <span className="kpi-label">
                  {pick(f.table.label, lang)}
                  {yearOf(f) !== null && `, ${yearOf(f)}`}
                </span>
                <span className="kpi-value prof-kpi-value">{formatFact(f.value, f.table.format, lang)}</span>
                <span className="prof-kpi-rank">
                  {f.tieTo ? fill(pick(txt.shared, lang), { from: f.rank, to: f.tieTo }) : fill(pick(txt.rank, lang), { rank: f.rank })}{' '}
                  {fill(pick(txt.of, lang), { of: f.of })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="prof-how">
          <span>{pick(txt.howRead, lang)}</span> <span>{pick(txt.howYear, lang)}</span>
        </p>
        {groupFacts(profile.facts, FACT_GROUPS).map(({ group, facts }) => (
          <section className="prof-group" key={group} aria-labelledby={`prof-${group}`}>
            <h2 id={`prof-${group}`}>
              <span>{pick(GROUP_TITLES[group], lang)}</span>
              <span className="prof-count">{rankingsCount(facts.length, lang)}</span>
            </h2>
            <ul className="prof-rows">
              {facts.map((f) => (
                <FactRow key={f.table.id} f={f} lang={lang} />
              ))}
            </ul>
          </section>
        ))}
        {profile.missing.length > 0 && (
          <p className="prof-missing">
            {pick(txt.missing, lang)}{' '}
            {profile.missing
              .map((m) => fill(pick(txt.missingItem, lang), { label: pick(m.label, lang), of: m.rows.length, countries: countriesWord(m.rows.length, lang) }))
              .join('; ')}
            .
          </p>
        )}
        {only.length > 0 && (
          <section className="prof-group" aria-labelledby="prof-only">
            <h2 id="prof-only">
              <span>{pick(txt.onlyTitle, lang)}</span>
            </h2>
            <ul className="prof-only">
              {only.map(({ meta, preview }) => (
                <li key={meta.id}>
                  <a className="prof-card" href={hrefViz(meta.id)}>
                    <span className="prof-card-title">{t(meta.title)}</span>
                    <span className="prof-card-value">{formatKeyValue(preview!.key, lang)}</span>
                    <span className="prof-card-note">{formatKeyLabel(preview!.key, lang)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="prof-notes">
          {profile.facts.some((f) => f.marked) && <p>{pick(txt.noteMarked, lang)}</p>}
          <p>{pick(txt.noteSources, lang)}</p>
        </div>
      </>
    );
  }

  return (
    <article className="page viz prof">
      <nav className="crumbs" aria-label={t(ui.breadcrumbs)}>
        <a href={hrefCatalog()}>{t(ui.backToGallery)}</a>
      </nav>
      <header className="page-head">
        <h1 className="prof-title">
          <Flag code={code} />
          <span>{title}</span>
        </h1>
      </header>
      {body}
    </article>
  );
}

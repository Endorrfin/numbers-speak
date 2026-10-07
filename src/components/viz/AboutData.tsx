// CHANGED (S3-lz): the panels take the entry's card (always at hand) and its full manifest when it has loaded.
// Period, dates, chart type, stack and the code link render at once; description, sources, licence, data files
// and d3 modules follow the manifest chunk, which loads next to the page body.
import type { ReactNode } from 'react';
import type { DetailsState } from '../../catalog/details';
import { CHART_LABELS } from '../../catalog/rubrics';
import type { VizCard, VizMeta } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { formatDate, formatPeriod } from '../../lib/format';
import { sourceUrlFor } from '../../lib/links';

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </>
  );
}

/** The manifest-dependent part of a panel: the content when ready, else one quiet line (or the retry). */
function WithDetails({ details, children }: { details: DetailsState; children: (meta: VizMeta) => ReactNode }) {
  const { t } = useLang();
  if (details.status === 'ready') return <>{children(details.meta)}</>;
  if (details.status === 'error') {
    return (
      <div className="notice notice-warn load-error" role="alert">
        <p>{t(ui.detailsLoadError)}</p>
        <button type="button" className="btn btn-ghost" onClick={details.retry}>
          {t(ui.retry)}
        </button>
      </div>
    );
  }
  return <p className="muted">{t(ui.loading)}</p>;
}

function Sources({ meta }: { meta: VizMeta }) {
  const { t, lang } = useLang();
  return (
    <>
      <h3>{t(ui.sources)}</h3>
      {meta.sources.length > 0 ? (
        <ul className="sources">
          {meta.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>{' '}
              <span className="muted">
                · {t(ui.retrieved)} <time dateTime={s.retrieved}>{formatDate(s.retrieved, lang)}</time>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t(ui.noSources)}</p>
      )}

      <h3>{t(ui.licence)}</h3>
      {meta.origin.kind === 'adapted' ? (
        <p>
          {t(ui.adaptedFrom)}{' '}
          <a href={meta.origin.url} target="_blank" rel="noopener noreferrer">
            {meta.origin.title}
          </a>{' '}
          ({meta.origin.license}).
        </p>
      ) : (
        <p>{t(ui.originalWork)}</p>
      )}

      <h3>{t(ui.dataFiles)}</h3>
      {meta.data.length > 0 ? (
        <ul className="files">
          {meta.data.map((f) => (
            <li key={f}>
              <a href={`./data/${meta.id}/${f}`} download>
                {f}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t(ui.noDataFiles)}</p>
      )}
    </>
  );
}

export function AboutData({ card, details }: { card: VizCard; details: DetailsState }) {
  const { t, lang } = useLang();
  return (
    <section className="panel" aria-labelledby="about-data" aria-busy={details.status === 'loading' || undefined}>
      <h2 id="about-data">{t(ui.aboutData)}</h2>
      <WithDetails details={details}>{(meta) => <Paragraphs text={t(meta.description)} />}</WithDetails>

      <dl className="facts">
        {card.period && (
          <>
            <dt>{t(ui.period)}</dt>
            <dd>{formatPeriod(card.period)}</dd>
          </>
        )}
        <dt>{t(ui.added)}</dt>
        <dd>
          <time dateTime={card.added}>{formatDate(card.added, lang)}</time>
        </dd>
        <dt>{t(ui.updated)}</dt>
        <dd>
          <time dateTime={card.updated}>{formatDate(card.updated, lang)}</time>
        </dd>
      </dl>

      {details.status === 'ready' && <Sources meta={details.meta} />}
    </section>
  );
}

export function HowBuilt({ card, details }: { card: VizCard; details: DetailsState }) {
  const { t } = useLang();
  const modules = details.status === 'ready' ? details.meta.d3Modules : undefined;
  return (
    <section className="panel" aria-labelledby="how-built">
      <h2 id="how-built">{t(ui.howBuilt)}</h2>
      <dl className="facts">
        <dt>{t(ui.chartType)}</dt>
        <dd>{t(CHART_LABELS[card.chart])}</dd>
        <dt>{t(ui.d3Modules)}</dt>
        <dd>
          {details.status !== 'ready' ? (
            <span className="muted">{details.status === 'loading' ? t(ui.loading) : '—'}</span>
          ) : modules && modules.length > 0 ? (
            <span className="mono">{modules.join(' · ')}</span>
          ) : (
            <span className="muted">{t(ui.d3ModulesSoon)}</span>
          )}
        </dd>
        <dt>{t(ui.stack)}</dt>
        <dd>D3.js 7 · React 19 · TypeScript · Vite</dd>
      </dl>
      <p>
        <a href={sourceUrlFor(card.id)} target="_blank" rel="noopener noreferrer">
          {t(ui.sourceCode)}
        </a>
      </p>
    </section>
  );
}

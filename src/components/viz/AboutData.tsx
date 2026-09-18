import { CHART_LABELS } from '../../catalog/rubrics';
import type { VizMeta } from '../../catalog/types';
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

export function AboutData({ meta }: { meta: VizMeta }) {
  const { t, lang } = useLang();
  return (
    <section className="panel" aria-labelledby="about-data">
      <h2 id="about-data">{t(ui.aboutData)}</h2>
      <Paragraphs text={t(meta.description)} />

      <dl className="facts">
        {meta.period && (
          <>
            <dt>{t(ui.period)}</dt>
            <dd>{formatPeriod(meta.period)}</dd>
          </>
        )}
        <dt>{t(ui.added)}</dt>
        <dd>
          <time dateTime={meta.added}>{formatDate(meta.added, lang)}</time>
        </dd>
        <dt>{t(ui.updated)}</dt>
        <dd>
          <time dateTime={meta.updated}>{formatDate(meta.updated, lang)}</time>
        </dd>
      </dl>

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
    </section>
  );
}

export function HowBuilt({ meta }: { meta: VizMeta }) {
  const { t } = useLang();
  return (
    <section className="panel" aria-labelledby="how-built">
      <h2 id="how-built">{t(ui.howBuilt)}</h2>
      <dl className="facts">
        <dt>{t(ui.chartType)}</dt>
        <dd>{t(CHART_LABELS[meta.chart])}</dd>
        <dt>{t(ui.d3Modules)}</dt>
        <dd>
          {meta.d3Modules && meta.d3Modules.length > 0 ? (
            <span className="mono">{meta.d3Modules.join(' · ')}</span>
          ) : (
            <span className="muted">{t(ui.d3ModulesSoon)}</span>
          )}
        </dd>
        <dt>{t(ui.stack)}</dt>
        <dd>D3.js 7 · React 19 · TypeScript · Vite</dd>
      </dl>
      <p>
        <a href={sourceUrlFor(meta.id)} target="_blank" rel="noopener noreferrer">
          {t(ui.sourceCode)}
        </a>
      </p>
    </section>
  );
}

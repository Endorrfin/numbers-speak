import { Suspense, lazy, useMemo } from 'react';
import type { ComponentType } from 'react';
import { CATALOG, getViz, getVizLoader } from '../../catalog';
import { useDetails } from '../../catalog/details';
import { CHART_LABELS, GEO_LABELS, getRubric } from '../../catalog/rubrics';
import { isVisible, newIds } from '../../catalog/filter';
import type { VizBodyProps, VizParams } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { IS_DEV } from '../../lib/env';
import { formatPeriod } from '../../lib/format';
import { hrefCatalog, replaceParams } from '../../lib/hashRouter';
import { ISSUES_URL } from '../../lib/links';
import { NotFound } from '../pages/NotFound';
import { AboutData, HowBuilt } from './AboutData';
import { ErrorBoundary } from './ErrorBoundary';
import { ShareButton } from './ShareButton';

// One lazy component per id, created once — React.lazy must not be re-created on every render.
const bodies = new Map<string, ComponentType<VizBodyProps>>();
function bodyFor(id: string): ComponentType<VizBodyProps> | undefined {
  const cached = bodies.get(id);
  if (cached) return cached;
  const loader = getVizLoader(id);
  if (!loader) return undefined;
  const Body = lazy(loader);
  bodies.set(id, Body);
  return Body;
}

export function VizPage({ id, params }: { id: string; params: VizParams }) {
  const { t } = useLang();
  const meta = getViz(id);
  // CHANGED (S3-lz): the full manifest (About the data, How it's built) loads next to the body chunk; an unknown
  // or hidden id loads nothing (it ends at NotFound below).
  const details = useDetails(meta && isVisible(meta, IS_DEV) ? meta.id : null);
  // (S3-nw): the same "New" set as the gallery (the NEW_MAX newest), not a per-entry date check.
  const fresh = useMemo(() => newIds(CATALOG, { now: new Date(), dev: IS_DEV }), []);

  if (!meta || !isVisible(meta, IS_DEV)) {
    return <NotFound message={t(ui.vizNotFound)} />;
  }

  const Body = bodyFor(meta.id);
  const primary = getRubric(meta.rubrics[0]);

  return (
    <article className="page viz">
      {/* CHANGED (S3-aa2): badges share the breadcrumb row — one row less above the title. */}
      <div className="viz-top">
        <nav className="crumbs" aria-label={t(ui.breadcrumbs)}>
          <a href={hrefCatalog()}>{t(ui.backToGallery)}</a>
          <span aria-hidden="true"> / </span>
          <a href={hrefCatalog(primary.id)}>{t(primary.title)}</a>
        </nav>
        <div className="card-badges">
          {meta.status === 'soon' && <span className="badge badge-soon">{t(ui.badgeSoon)}</span>}
          {meta.status === 'draft' && <span className="badge badge-draft">{t(ui.badgeDraft)}</span>}
          {fresh.has(meta.id) && <span className="badge badge-new">{t(ui.badgeNew)}</span>}
        </div>
      </div>

      <header className="page-head">
        <h1>{t(meta.title)}</h1>
        <p className="lede">{t(meta.subtitle)}</p>
        <p className="card-meta">
          <span className="chip">{t(CHART_LABELS[meta.chart])}</span>
          {meta.geo !== 'none' && <span className="chip">{t(GEO_LABELS[meta.geo])}</span>}
          {meta.period && <span className="chip">{formatPeriod(meta.period)}</span>}
        </p>
      </header>

      {meta.status === 'soon' && <p className="notice">{t(ui.soonNotice)}</p>}
      {meta.status === 'draft' && <p className="notice notice-warn">{t(ui.draftNotice)}</p>}

      <section className="stage" aria-label={t(meta.title)}>
        {Body ? (
          <ErrorBoundary
            resetKey={meta.id}
            fallback={
              <p className="notice notice-warn">
                {t(ui.chartError)}{' '}
                {/* CHANGED (S3-bdd2): a failed chunk after a deploy is fixed by a reload, so offer it here. */}
                <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
                  {t(ui.reloadPage)}
                </button>{' '}
                <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
                  {t(ui.reportIssue)}
                </a>
              </p>
            }
          >
            <Suspense fallback={<p className="muted stage-loading">{t(ui.loading)}</p>}>
              <Body params={params} setParams={replaceParams} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <p className="notice notice-warn">{t(ui.chartError)}</p>
        )}
      </section>

      <ShareButton />

      <div className="panels">
        <AboutData card={meta} details={details} />
        <HowBuilt card={meta} details={details} />
      </div>
    </article>
  );
}

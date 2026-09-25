import { getPreview } from '../../catalog/previews'; // CHANGED (S3-th)
import { CHART_LABELS, GEO_LABELS } from '../../catalog/rubrics';
import type { VizMeta } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { formatPeriod } from '../../lib/format';
import { hrefViz } from '../../lib/hashRouter';
import { ChartGlyph } from '../viz/ChartGlyph';
import { CardPreview } from './CardPreview'; // CHANGED (S3-th)

export function VizCard({ meta, isNew }: { meta: VizMeta; isNew: boolean }) {
  const { t } = useLang();
  const preview = getPreview(meta.id); // CHANGED (S3-th): data-driven preview; the glyph stays as the fallback
  return (
    <article className={`card card--${meta.status}`}>
      <a className="card-link" href={hrefViz(meta.id)}>
        <div className={preview ? 'card-thumb card-thumb--preview' : 'card-thumb'} aria-hidden="true">
          {preview ? <CardPreview preview={preview} /> : <ChartGlyph kind={meta.chart} />}
        </div>
        <div className="card-body">
          <div className="card-badges">
            {meta.status === 'soon' && <span className="badge badge-soon">{t(ui.badgeSoon)}</span>}
            {meta.status === 'draft' && <span className="badge badge-draft">{t(ui.badgeDraft)}</span>}
            {isNew && <span className="badge badge-new">{t(ui.badgeNew)}</span>}
          </div>
          <h3 className="card-title">{t(meta.title)}</h3>
          <p className="card-sub">{t(meta.subtitle)}</p>
          <p className="card-meta">
            <span className="chip">{t(CHART_LABELS[meta.chart])}</span>
            {meta.geo !== 'none' && <span className="chip">{t(GEO_LABELS[meta.geo])}</span>}
            {meta.period && <span className="chip">{formatPeriod(meta.period)}</span>}
          </p>
        </div>
      </a>
    </article>
  );
}

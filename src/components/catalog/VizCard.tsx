import { CHART_LABELS, GEO_LABELS } from '../../catalog/rubrics';
import type { VizMeta } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { formatPeriod } from '../../lib/format';
import { hrefViz } from '../../lib/hashRouter';
import { ChartGlyph } from '../viz/ChartGlyph';

export function VizCard({ meta, isNew }: { meta: VizMeta; isNew: boolean }) {
  const { t } = useLang();
  return (
    <article className={`card card--${meta.status}`}>
      <a className="card-link" href={hrefViz(meta.id)}>
        <div className="card-thumb" aria-hidden="true">
          <ChartGlyph kind={meta.chart} />
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

import { useMemo } from 'react';
import { CATALOG } from '../../catalog';
import { getRubric } from '../../catalog/rubrics';
import { filterCatalog, isNew, parseCatalogQuery, TAB_IDS, tabEntries, toCatalogParams } from '../../catalog/filter';
import type { CatalogQuery, TabId } from '../../catalog/filter';
import type { VizParams } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { IS_DEV } from '../../lib/env';
import { replaceParams } from '../../lib/hashRouter';
import { FilterBar } from './FilterBar';
import { TabBar } from './TabBar';
import { VizCard } from './VizCard';

export function CatalogPage({ tab, params }: { tab: TabId; params: VizParams }) {
  const { t } = useLang();
  // `now` is read once per render: "New" badges and the New tab agree within a page view.
  const now = useMemo(() => new Date(), []);
  const opts = useMemo(() => ({ now, dev: IS_DEV }), [now]);

  const query = useMemo(() => parseCatalogQuery(tab, params), [tab, params]);
  const pool = useMemo(() => tabEntries(CATALOG, tab, opts), [tab, opts]);
  const items = useMemo(() => filterCatalog(CATALOG, query, opts), [query, opts]);
  const counts = useMemo(() => {
    const out = {} as Record<TabId, number>;
    for (const id of TAB_IDS) out[id] = tabEntries(CATALOG, id, opts).length;
    return out;
  }, [opts]);

  const onChange = (next: CatalogQuery) => replaceParams(toCatalogParams(next));

  const heading =
    tab === 'all' ? t(ui.heroTitle) : tab === 'new' ? t(ui.tabNew) : t(getRubric(tab).title);
  const lede =
    tab === 'all' ? t(ui.heroLede) : tab === 'new' ? t(ui.tabNewLede) : t(getRubric(tab).lede);

  return (
    <div className="page catalog">
      <header className="page-head">
        <h1>{heading}</h1>
        <p className="lede">{lede}</p>
      </header>

      <TabBar active={tab} counts={counts} params={params} />
      <FilterBar query={query} pool={pool} onChange={onChange} />

      <p className="results-count" role="status" aria-live="polite">
        {fill(t(ui.resultsCount), { n: items.length })}
      </p>

      {items.length > 0 ? (
        <ul className="card-grid">
          {items.map((m) => (
            <li key={m.id}>
              <VizCard meta={m} isNew={isNew(m, now)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <p className="empty-title">{pool.length === 0 ? t(ui.emptyTab) : t(ui.emptyTitle)}</p>
          {pool.length > 0 && (
            <button type="button" className="btn" onClick={() => onChange({ tab })}>
              {t(ui.clearFilters)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

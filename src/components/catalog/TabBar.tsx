// Topic tabs. Tabs are real routes (#/t/<tab>), so they are links with aria-current,
// not an ARIA tablist (same pattern as english-guide's VocabTabs).
import { RUBRICS } from '../../catalog/rubrics';
import type { TabId } from '../../catalog/filter';
import type { Localized, VizParams } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { hrefCatalog } from '../../lib/hashRouter';
import { cx } from '../../lib/utils';

type TabDef = { id: TabId; icon: string; title: Localized };

const TABS: readonly TabDef[] = [
  { id: 'all', icon: '✦', title: ui.tabAll },
  { id: 'new', icon: '✧', title: ui.tabNew },
  ...RUBRICS.map((r) => ({ id: r.id, icon: r.icon, title: r.title })),
];

export function TabBar({
  active,
  counts,
  params,
}: {
  active: TabId;
  counts: Readonly<Record<TabId, number>>;
  params: VizParams;
}) {
  const { t } = useLang();
  return (
    <nav className="tabbar" aria-label={t(ui.topics)}>
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <a
            key={tab.id}
            className={cx('tab', on && 'is-active')}
            href={hrefCatalog(tab.id, params)}
            aria-current={on ? 'page' : undefined}
          >
            <span className="tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="tab-label">{t(tab.title)}</span>
            <span className="tab-count">{counts[tab.id]}</span>
          </a>
        );
      })}
    </nav>
  );
}

import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { useAppState } from '../../lib/appState';
import type { ThemeMode } from '../../lib/appState';
import { hrefAbout, hrefCatalog } from '../../lib/hashRouter';
import type { Route } from '../../lib/hashRouter';
import { cx } from '../../lib/utils';

const THEME_OPTIONS: ReadonlyArray<{ value: ThemeMode; label: typeof ui.themeSystem }> = [
  { value: 'system', label: ui.themeSystem },
  { value: 'dark', label: ui.themeDark },
  { value: 'light', label: ui.themeLight },
];

export function TopBar({ route }: { route: Route }) {
  const { lang, t, toggle } = useLang();
  const { themeMode, setThemeMode } = useAppState();
  const inGallery = route.name === 'catalog' || route.name === 'viz';

  return (
    <header className="topbar">
      <a className="brand" href={hrefCatalog()}>
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
            <rect x="3" y="12" width="4" height="8" rx="1" />
            <rect x="10" y="8" width="4" height="12" rx="1" />
            <rect x="17" y="4" width="4" height="16" rx="1" />
          </svg>
        </span>
        <span className="brand-text">
          <strong>{t(ui.brandTitle)}</strong>
          <span className="brand-sub">{t(ui.brandSubtitle)}</span>
        </span>
      </a>

      <nav className="topnav" aria-label={t(ui.mainNav)}>
        <a
          className={cx('topnav-link', inGallery && 'is-active')}
          href={hrefCatalog()}
          aria-current={route.name === 'catalog' ? 'page' : undefined}
        >
          {t(ui.gallery)}
        </a>
        <a
          className={cx('topnav-link', route.name === 'about' && 'is-active')}
          href={hrefAbout()}
          aria-current={route.name === 'about' ? 'page' : undefined}
        >
          {t(ui.about)}
        </a>
      </nav>

      <div className="topbar-tools">
        <label className="theme-select">
          <span className="sr-only">{t(ui.theme)}</span>
          <select value={themeMode} onChange={(e) => setThemeMode(e.target.value as ThemeMode)}>
            {THEME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.label)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-ghost" onClick={toggle} aria-label={t(ui.languageToggleLabel)}>
          {/* Phones show the short code; the accessible name always carries the full sentence. */}
          <span className="lang-long">{t(ui.languageToggle)}</span>
          <span className="lang-short" aria-hidden="true">
            {lang === 'en' ? 'UA' : 'EN'}
          </span>
        </button>
      </div>
    </header>
  );
}

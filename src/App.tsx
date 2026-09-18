import { Suspense, lazy, useEffect, useRef } from 'react';
import { CatalogPage } from './components/catalog/CatalogPage';
import { Footer } from './components/layout/Footer';
import { TopBar } from './components/layout/TopBar';
import { NotFound } from './components/pages/NotFound';
import { useLang } from './i18n/lang';
import { ui } from './i18n/ui';
import { useHashLocation } from './lib/hashRouter';

// The catalog is the landing page, so it stays eager; the other routes load on demand.
const VizPage = lazy(() => import('./components/viz/VizPage').then((m) => ({ default: m.VizPage })));
const AboutPage = lazy(() => import('./components/pages/AboutPage').then((m) => ({ default: m.AboutPage })));

export function App() {
  const { route, params, path } = useHashLocation();
  const { t } = useLang();
  const firstRender = useRef(true);

  // On real navigation (path change, not a filter change): scroll to top and move focus to <main>,
  // so keyboard and screen-reader users land on the new page.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [path]);

  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t(ui.skipToContent)}
      </a>
      <TopBar route={route} />
      <main className="main" id="main" tabIndex={-1}>
        <Suspense fallback={<p className="page muted">{t(ui.loading)}</p>}>
          {route.name === 'catalog' && <CatalogPage tab={route.tab} params={params} />}
          {route.name === 'viz' && <VizPage id={route.id} params={params} />}
          {route.name === 'about' && <AboutPage />}
          {route.name === 'notFound' && <NotFound />}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

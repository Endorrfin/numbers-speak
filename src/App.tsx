import { Suspense, lazy, useEffect, useRef } from 'react';
import { CatalogPage } from './components/catalog/CatalogPage';
import { Footer } from './components/layout/Footer';
import { TopBar } from './components/layout/TopBar';
import { NotFound } from './components/pages/NotFound';
import { useLang } from './i18n/lang';
import { ui } from './i18n/ui';
import { applyOptOut, trackPageview } from './lib/analytics';
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

  // CHANGED (S3-an): the owner's opt-out (#/about?no-count=1, =0 undoes it). Declared before the page view
  // below — effects run in order — so the visit that sets the flag is not counted itself.
  const noCount = params['no-count'];
  useEffect(() => applyOptOut(noCount), [noCount]);

  // CHANGED (S3-an): one anonymous page view per real navigation — keyed on the path, so a settings change
  // (?region=…, ?show=…) is never a new page. Sent later, at idle time (src/lib/analytics.ts).
  useEffect(() => trackPageview(path), [path]);

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
          {/* CHANGED (S3-an): About reads ?no-count to confirm the owner's opt-out. */}
          {route.name === 'about' && <AboutPage params={params} />}
          {route.name === 'notFound' && <NotFound />}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

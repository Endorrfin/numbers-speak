// Related.tsx — CHANGED (S3-nav): "See also" at the end of a visualization page — the gallery's own cards (with their
// data previews), picked by catalog/related.ts. Drawn from the eager cards, so it never waits for the manifest chunk.
import { useMemo } from 'react';
import { CATALOG } from '../../catalog';
import { relatedFor } from '../../catalog/related';
import type { VizCard as VizCardData } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { VizCard } from '../catalog/VizCard';

export function Related({ card, fresh }: { card: VizCardData; fresh: ReadonlySet<string> }) {
  const { t } = useLang();
  const items = useMemo(() => relatedFor(card, CATALOG), [card]);
  if (items.length === 0) return null;
  return (
    <section className="related" aria-labelledby="related-title">
      <h2 id="related-title">{t(ui.seeAlso)}</h2>
      <ul className="card-grid">
        {items.map((m) => (
          <li key={m.id}>
            <VizCard meta={m} isNew={fresh.has(m.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

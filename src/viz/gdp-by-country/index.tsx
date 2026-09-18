import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';

// S1 placeholder: a static preview of the ranked-bar layout. S2 replaces it with the D3 chart,
// its settings (region, page) and the cleaned 2023 dataset.
const PREVIEW = [100, 64, 16, 15, 13, 12, 11, 8];

export default function GdpByCountry(_props: VizBodyProps) {
  const { t } = useLang();
  const label = t({
    en: 'Preview of the ranked bar chart — the interactive version is on the way',
    uk: 'Попередній вигляд рейтингової діаграми — інтерактивна версія вже в роботі',
  });
  return (
    <figure className="preview">
      <svg viewBox="0 0 400 190" role="img" aria-label={label}>
        {PREVIEW.map((v, i) => (
          <g key={i}>
            <rect className="preview-label" x="0" y={8 + i * 22} width="56" height="12" rx="3" />
            <rect className="preview-bar" x="66" y={6 + i * 22} width={v * 3.2} height="16" rx="8" />
          </g>
        ))}
      </svg>
      <figcaption className="muted">{label}</figcaption>
    </figure>
  );
}

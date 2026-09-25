// Pager.tsx — the "Rows" field of every paged ranking: ‹ select › (S3-fx; was copied into 7 pages).
// The select is at least as wide as its longest label (`--pager-ch`, tabular digits) and the field
// does not shrink, so "151–163" is never clipped; on a narrow row the whole field wraps instead.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { pageRanges } from '../../lib/paginate';
import type { Page } from '../../lib/paginate';

type Props = {
  /** id of the <select> (the field's <label> points at it). */
  id: string;
  page: Pick<Page<unknown>, 'page' | 'pages' | 'total'>;
  /** Rows per page (the entry's PAGE_SIZE). */
  size: number;
  onPage: (page: number) => void;
};

export function Pager({ id, page, size, onPage }: Props) {
  const { t } = useLang();
  const options = useMemo(() => pageRanges(page.total, size), [page.total, size]);
  const chars = options.reduce((n, o) => Math.max(n, o.label.length), 1);
  const style = { '--pager-ch': chars } as CSSProperties;

  return (
    <div className="field field-pager">
      <label htmlFor={id}>{t(ui.rows)}</label>
      <div className="pager" style={style}>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label={t(ui.prevPage)}
          disabled={page.page <= 1}
          onClick={() => onPage(page.page - 1)}
        >
          ‹
        </button>
        <select id={id} value={page.page} onChange={(e) => onPage(Number(e.target.value))}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label={t(ui.nextPage)}
          disabled={page.page >= page.pages}
          onClick={() => onPage(page.page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}

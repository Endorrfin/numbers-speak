// Finder.tsx — CHANGED (S3-uf): moved out of real-estate-world/angles.tsx (S3-re) for every ranking with a focus.
// One button per highlighted row: its rank in the current list; a click opens the page that shows it (the page
// decides how — see focusJump in lib/focus.ts). A row the list does not have gets a muted "not in this list".
import { useLang } from '../../i18n/lang';
import { fill } from '../../i18n/ui';
import { focusText } from './focusText';

export type FinderItem = {
  key: string;
  name: string;
  /** Rank in the current list; undefined = the list does not have this row. */
  rank?: number;
  /** Optional text after the button, e.g. the row's value. */
  detail?: string;
};

type Props = {
  /** Field label, e.g. "Ukraine in this ranking". */
  label: string;
  items: readonly FinderItem[];
  onJump: (key: string) => void;
};

export function Finder({ label, items, onJump }: Props) {
  const { t } = useLang();
  if (!items.length) return null;
  return (
    <div className="finder">
      <span className="field-label">{label}</span>
      <ul className="finder-list">
        {items.map((it) => (
          <li key={it.key}>
            {it.rank !== undefined ? (
              <button type="button" className="btn btn-ghost finder-btn" title={fill(t(focusText.findTitle), { name: it.name })} onClick={() => onJump(it.key)}>
                {fill(t(focusText.findButton), { name: it.name, rank: it.rank })}
              </button>
            ) : (
              <span className="finder-missing muted">{fill(t(focusText.notListed), { name: it.name })}</span>
            )}
            {it.detail && it.rank !== undefined && <span className="finder-detail muted">{it.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

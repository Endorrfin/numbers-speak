// FocusPicker.tsx — CHANGED (S3-uf): the highlight picker, moved out of real-estate-world (CityPicker, S3-re) and
// shared with the country rankings. A native <datalist> (no dependency, keyboard and screen-reader friendly),
// chips to remove, preset buttons, one polite status line. The caller owns the URL state: `onChange(null)` =
// back to the page's default highlight, `[]` = none.
import { useId, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useLang } from '../../i18n/lang';
import { fill } from '../../i18n/ui';
import { focusText } from './focusText';

export type FocusOption = {
  id: string;
  /** Text of the suggestion (unique within the list). */
  label: string;
  /** Short name on the chip. */
  name: string;
  /** Other texts that pick this option when typed exactly (case-insensitive): names in both languages, codes. */
  keys?: readonly string[];
};

/** Strings already in the page's language; {name} / {q} / {n} are filled here. */
export type FocusPickerText = {
  label: string;
  hint: string;
  placeholder: string;
  remove: string;
  notFound: string;
  full: string;
  already: string;
  none: string;
  chips: string;
  presets: string;
};

export type FocusPreset = { label: string; ids: readonly string[] | null };

type Props = {
  options: readonly FocusOption[];
  /** Highlighted ids in order. */
  selected: readonly string[];
  max: number;
  text: FocusPickerText;
  presets: readonly FocusPreset[];
  onChange: (ids: string[] | null) => void;
  className?: string;
};

export function FocusPicker({ options, selected, max, text, presets, onChange, className }: Props) {
  const { t, lang } = useLang();
  const base = useId();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const sorted = useMemo(() => [...options].sort((a, b) => a.label.localeCompare(b.label, lang === 'uk' ? 'uk' : 'en')), [options, lang]);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const labels = useMemo(() => new Set(options.map((o) => o.label.toLowerCase())), [options]);
  const lookup = useMemo(() => {
    const map = new Map<string, FocusOption>();
    for (const o of options) for (const k of o.keys ?? []) map.set(k.toLowerCase(), o);
    for (const o of options) map.set(o.label.toLowerCase(), o); // a suggestion's own text always wins
    return map;
  }, [options]);

  const add = (raw: string, strict: boolean): boolean => {
    const q = raw.trim();
    if (!q) return false;
    const o = lookup.get(q.toLowerCase());
    if (!o) {
      if (strict) setMessage(fill(text.notFound, { q }));
      return false;
    }
    if (selected.includes(o.id)) setMessage(fill(text.already, { name: o.name }));
    else if (selected.length >= max) setMessage(fill(text.full, { n: max }));
    else {
      onChange([...selected, o.id]);
      setMessage('');
    }
    setQuery('');
    return true;
  };
  // A chip or a preset changes the list: an old "already" / "full" message no longer applies.
  const change = (ids: string[] | null): void => {
    setMessage('');
    onChange(ids);
  };
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    add(query, true);
  };

  return (
    <div className={className ? `fp ${className}` : 'fp'}>
      <form className="fp-form" onSubmit={submit} role="search">
        <div className="field fp-field">
          <label htmlFor={`${base}-q`}>
            {text.label} <span className="muted">({fill(text.hint, { n: max })})</span>
          </label>
          <div className="fp-row">
            <input
              id={`${base}-q`}
              type="search"
              list={`${base}-list`}
              value={query}
              placeholder={text.placeholder}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setMessage('');
                // A picked suggestion matches an option exactly: add it without waiting for Enter.
                if (labels.has(e.target.value.trim().toLowerCase())) add(e.target.value, false);
              }}
            />
            <button type="submit" className="btn btn-ghost">
              {t(focusText.add)}
            </button>
          </div>
          <datalist id={`${base}-list`}>
            {sorted.map((o) => (
              <option key={o.id} value={o.label} />
            ))}
          </datalist>
        </div>
      </form>
      <p className="fp-message" role="status">
        {message}
      </p>
      <div className="fp-chips">
        {selected.length ? (
          <ul className="fp-chip-list" aria-label={text.chips}>
            {selected.map((id) => {
              const name = byId.get(id)?.name ?? id;
              return (
                <li key={id}>
                  <button type="button" className="fp-chip" aria-label={fill(text.remove, { name })} onClick={() => change(selected.filter((x) => x !== id))}>
                    {name} <span aria-hidden="true">×</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <span className="muted">{text.none}</span>
        )}
        <span className="fp-presets">
          <span className="field-label">{text.presets}:</span>
          {presets.map((p) => (
            <button key={p.label} type="button" className="btn btn-ghost fp-preset" onClick={() => change(p.ids && [...p.ids])}>
              {p.label}
            </button>
          ))}
          {selected.length > 0 && (
            <button type="button" className="btn btn-ghost fp-preset" onClick={() => change([])}>
              {t(focusText.clear)}
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

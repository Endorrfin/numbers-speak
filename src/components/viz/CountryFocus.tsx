// CountryFocus.tsx — CHANGED (S3-uf): "Ukraine in focus" for the country rankings (RankedBar + Pager). The country
// picker (shared FocusPicker) + the Finder: one button per highlighted country with its rank in the current list;
// a click opens the page that shows it, resetting the region filter when the region hides it (lib/focus.ts).
// The page owns the state (`?focus=`) and draws the highlight itself (RankedBar `emphasis`, table `is-home`).
import { useMemo } from 'react';
import { useLang } from '../../i18n/lang';
import { fill } from '../../i18n/ui';
import { focusText } from './focusText';
import { countryName } from '../../lib/countries';
import { MAX_FOCUS, focusJump, normalizeFocus } from '../../lib/focus';
import type { JumpTarget } from '../../lib/focus';
import type { Region } from '../../lib/regions';
import { Finder } from './Finder';
import type { FinderItem } from './Finder';
import { FocusPicker } from './FocusPicker';
import type { FocusOption } from './FocusPicker';

type Row = { code: string };

type Props<T extends Row> = {
  /** Highlighted codes, resolved (lib/focus.ts `resolveFocus`). */
  codes: readonly string[];
  /** The current ranking in chart order (every region). */
  all: readonly T[];
  /** The rows the chart pages through (region filter applied), same order. */
  filtered: readonly T[];
  region: Region | 'all';
  size: number;
  /** The rank printed in the chart label; undefined = the row is listed but unranked (no button). */
  rankOf: (row: T) => number | undefined;
  /** Text after the button (the value), on pages without a KPI tile for the country. */
  detail?: (row: T) => string;
  onFocus: (focus: string[] | null) => void;
  onJump: (to: JumpTarget<Region>) => void;
};

export function CountryFocus<T extends Row>({ codes, all, filtered, region, size, rankOf, detail, onFocus, onJump }: Props<T>) {
  const { t, lang } = useLang();
  const byCode = useMemo(() => new Map(all.map((r) => [r.code, r])), [all]);
  const options = useMemo<FocusOption[]>(() => {
    const list = [...new Set([...all.map((r) => r.code), ...codes])];
    return list.map((code) => {
      const name = countryName(code, lang);
      return { id: code, label: name, name, keys: [countryName(code, 'en'), countryName(code, 'uk'), code] };
    });
  }, [all, codes, lang]);
  const items = codes.map<FinderItem>((code) => {
    const row = byCode.get(code);
    const rank = row && rankOf(row);
    return { key: code, name: countryName(code, lang), rank, detail: row && rank !== undefined && detail ? detail(row) : undefined };
  });
  const jump = (code: string): void => {
    const to = focusJump(code, { all, filtered, keyOf: (r) => r.code, region, size });
    if (to) onJump(to);
  };

  return (
    <>
      <FocusPicker
        className="fp-compact"
        options={options}
        selected={codes}
        max={MAX_FOCUS}
        text={{
          label: t(focusText.focusLabel),
          hint: t(focusText.focusHint),
          placeholder: t(focusText.focusPlaceholder),
          remove: t(focusText.focusRemove),
          notFound: t(focusText.focusNotFound),
          full: t(focusText.focusFull),
          already: t(focusText.focusAlready),
          none: t(focusText.focusNone),
          chips: t(focusText.focusChips),
          presets: t(focusText.focusPresets),
        }}
        presets={[{ label: t(focusText.focusPresetUa), ids: null }]}
        onChange={(next) => onFocus(normalizeFocus(next))}
      />
      <Finder label={fill(t(focusText.focusFinder), { total: all.length })} items={items} onJump={jump} />
    </>
  );
}

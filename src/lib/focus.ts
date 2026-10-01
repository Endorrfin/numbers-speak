// focus.ts — CHANGED (S3-uf): the highlighted rows of a ranking ("focus"), shared by every page with a Finder.
// Pure and unit-tested. URL form: `?focus=ua,pl` (lower-case ISO codes, at most MAX_FOCUS, in the order added);
// `focus=none` = nothing highlighted; absent = the default (Ukraine, when the list has it). The same list parser
// serves real-estate-world's `?cities=` (city ids instead of codes).

/** Most countries highlighted at once on a country ranking (each one adds a Finder button). */
export const MAX_FOCUS = 3;
/** The reader's own country on a Ukrainian site: highlighted unless the URL says otherwise. */
export const HOME_CODE = 'UA';

const FOCUS_CODE = /^[a-z]{2}$/;

/** Generic id list: 'a,b' → well-formed unique ids (at most `max`, URL order); 'none' → []; absent → null. */
export function parseIdList(raw: string | undefined, valid: RegExp, max: number): string[] | null {
  if (raw === undefined) return null;
  if (raw === 'none') return [];
  const ids = raw.split(',').filter((id) => valid.test(id));
  return [...new Set(ids)].slice(0, max);
}

/** Generic id list → URL value; null (the default) → undefined, so the default stays out of the URL. */
export function idListParam(ids: readonly string[] | null, max: number): string | undefined {
  if (!ids) return undefined;
  return ids.length ? ids.slice(0, max).join(',') : 'none';
}

/** '?focus=ua,pl' → ['UA', 'PL']; 'none' → []; absent or nothing well-formed but not 'none' → see parseIdList. */
export function parseFocus(raw: string | undefined): string[] | null {
  const ids = parseIdList(raw?.toLowerCase(), FOCUS_CODE, MAX_FOCUS);
  return ids && ids.map((c) => c.toUpperCase());
}

/** ['UA', 'PL'] → 'ua,pl'; [] → 'none'; null → undefined (omitted). */
export function focusParam(focus: readonly string[] | null): string | undefined {
  return idListParam(focus && focus.map((c) => c.toLowerCase()), MAX_FOCUS);
}

/** The codes actually highlighted: null → [HOME_CODE] when the data has it; an explicit list as given. */
export function resolveFocus(focus: readonly string[] | null, has: (code: string) => boolean): string[] {
  if (focus === null) return has(HOME_CODE) ? [HOME_CODE] : [];
  return [...focus];
}

/** The default spelled out ([HOME_CODE]) → null, so a picked "Ukraine only" keeps the canonical URL. */
export function normalizeFocus(focus: readonly string[] | null): string[] | null {
  return focus && !(focus.length === 1 && focus[0] === HOME_CODE) ? [...focus] : null;
}

export type JumpTarget<R extends string> = { region: R | 'all'; page: number };

/**
 * Where the Finder sends the reader: the page of `key` in the region-filtered list when the region keeps it,
 * otherwise the page in the whole list with the region reset to 'all'; null when the list does not have it.
 */
export function focusJump<T, R extends string>(
  key: string,
  opts: { all: readonly T[]; filtered: readonly T[]; keyOf: (row: T) => string; region: R | 'all'; size: number },
): JumpTarget<R> | null {
  const { all, filtered, keyOf, region, size } = opts;
  const here = filtered.findIndex((r) => keyOf(r) === key);
  if (here >= 0) return { region, page: Math.floor(here / size) + 1 };
  const anywhere = all.findIndex((r) => keyOf(r) === key);
  return anywhere >= 0 ? { region: 'all', page: Math.floor(anywhere / size) + 1 } : null;
}

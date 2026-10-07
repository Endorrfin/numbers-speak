// home.ts — CHANGED (S3-cp): the reader's own country and the countries with a public profile page. A module of its
// own so the shell (top bar, gallery banner, router, page counter) can use them without pulling focus.ts or the
// profile logic into the initial chunk.

/** The reader's own country on a Ukrainian site: highlighted unless the URL says otherwise. */
export const HOME_CODE = 'UA';

/** Countries with a public profile page (#/c/<iso>). Phase 2 opens the rest — the data already covers every country. */
export const PROFILE_CODES: readonly string[] = [HOME_CODE];

export const isProfileCode = (code: string): boolean => PROFILE_CODES.includes(code);

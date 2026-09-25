// previews.ts — CHANGED (S3-th): card previews by entry id, from the generated JSON (scripts/gen-previews.ts
// validates every entry against the contract in ./preview.ts before writing the file).
import type { CardPreview } from './preview';
import data from './previews.generated.json';

const PREVIEWS = data as unknown as Readonly<Record<string, CardPreview>>;

/** The card preview of an entry, or undefined (the card then shows its chart-kind glyph). */
export function getPreview(id: string): CardPreview | undefined {
  return Object.prototype.hasOwnProperty.call(PREVIEWS, id) ? PREVIEWS[id] : undefined;
}

// paginate.ts — fixed-size pages over a ranked list (pure; unit-tested).

export type Page<T> = {
  items: T[];
  /** 1-based, clamped into [1, pages]. */
  page: number;
  pages: number;
  /** 1-based positions of the first and last item shown (0 / 0 when empty). */
  from: number;
  to: number;
  total: number;
};

export function paginate<T>(all: readonly T[], page: number, size: number): Page<T> {
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Number.isInteger(page) ? Math.min(Math.max(page, 1), pages) : 1;
  const start = (p - 1) * size;
  const items = all.slice(start, start + size);
  return { items, page: p, pages, from: items.length ? start + 1 : 0, to: start + items.length, total };
}

/** '?page=2' → 2; anything else (missing, '0', '-1', '2.5', 'abc', '1e3') → 1. */
export function parsePage(raw: string | undefined): number {
  if (!raw || !/^[1-9]\d{0,3}$/.test(raw)) return 1;
  return Number(raw);
}

// CHANGED (S3-fx): one source for the pager labels ("1–15" … "151–163") — was copied into 7 pages.
export type PageRange = { value: number; label: string };

/** Every page of a ranked list as a rank range; an empty list is one page labelled "0". */
export function pageRanges(total: number, size: number): PageRange[] {
  if (total <= 0) return [{ value: 1, label: '0' }];
  const pages = Math.ceil(total / size);
  return Array.from({ length: pages }, (_, i) => {
    const from = i * size + 1;
    const to = Math.min(from + size - 1, total);
    return { value: i + 1, label: from === to ? String(from) : `${from}–${to}` };
  });
}

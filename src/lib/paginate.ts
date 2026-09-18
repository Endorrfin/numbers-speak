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

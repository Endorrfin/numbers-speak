// views.ts — CHANGED (S3-ai2): pure helpers of angles C · D · E (kept out of the component files, so React Fast Refresh
// sees components only; unit-tested in scripts/test-ai-models.ts).
import type { TreeDatum } from '../../charts/renderTree';
import type { Localized } from '../../catalog/types';
import type { Lang } from '../../i18n/lang';
import { fill } from '../../i18n/ui';
import { formatPeople } from '../../lib/format';
import { arenaRuns, daysBetween, familyTrees } from './data';
import type { ArenaDataset, Claim, ClaimSeries, FamilyNode, LineageDataset, Metric, Qualifier } from './data';

/** Midnight UTC of a YYYY-MM-DD day. */
export const ms = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

// ── C ──
/** A run's last day: the day before the next leader's first. */
export const lastDay = (iso: string): string => new Date(ms(iso) - 86_400_000).toISOString().slice(0, 10);

// ── D ──
export const PRODUCT_TEXT: Record<string, Localized> = {
  chatgpt: { en: 'ChatGPT', uk: 'ChatGPT' },
  gemini: { en: 'Gemini app', uk: 'Застосунок Gemini' },
  metaai: { en: 'Meta AI', uk: 'Meta AI' },
  copilot: { en: 'Copilot family', uk: 'Сімейство Copilot' },
  grok: { en: 'Grok', uk: 'Grok' },
};
/** Names beside the lines: short, the same in both languages (the legend, tooltips and table give the full name). */
export const CHART_LABEL: Record<string, string> = { chatgpt: 'ChatGPT', gemini: 'Gemini', metaai: 'Meta AI', copilot: 'Copilot', grok: 'Grok' };
export const METRIC_TEXT: Record<Metric, Localized> = {
  weekly_active: { en: 'weekly active users', uk: 'активних користувачів за тиждень' },
  monthly_active: { en: 'monthly active users of the app', uk: 'активних користувачів застосунку за місяць' },
  monthly_in_apps: { en: 'monthly users, inside Meta’s apps', uk: 'користувачів за місяць у застосунках Meta' },
  monthly_family: { en: 'monthly users of all Microsoft’s Copilots', uk: 'користувачів за місяць усіх Copilot від Microsoft' },
  monthly_incl_x: { en: 'monthly users of Grok features, incl. inside X', uk: 'користувачів функцій Grok за місяць, разом із X' },
};
const QUALIFIER_TEXT: Record<Qualifier, Localized> = {
  exact: { en: '{v}', uk: '{v}' },
  more_than: { en: 'more than {v}', uk: 'понад {v}' },
  almost: { en: 'almost {v}', uk: 'майже {v}' },
  about: { en: 'about {v}', uk: 'близько {v}' },
};
/** "more than 800 million" / "понад 800 млн". */
export function claimText(c: Pick<Claim, 'value' | 'qualifier'>, lang: Lang): string {
  return fill(QUALIFIER_TEXT[c.qualifier][lang], { v: formatPeople(c.value, lang) });
}

/** Log axis from the power of ten below the smallest figure to the next 1-2-5 step above the largest (exported for tests). */
export function userAxis(values: readonly number[]): { domain: [number, number]; ticks: number[] } {
  const lo = 10 ** Math.floor(Math.log10(Math.min(...values)));
  const steps: number[] = [];
  for (let p = lo; p <= 1e11; p *= 10) for (const k of [1, 2, 5]) steps.push(k * p);
  const hi = steps.find((s) => s >= Math.max(...values) * 1.15)!;
  return { domain: [lo, hi], ticks: steps.filter((s) => s >= lo && s <= hi) };
}

// ── E ──
/** The tree shows at most this many of a company's root models, children per node and grandchildren per child. */
export const TREE_CAPS = { roots: 6, children: 5, grandchildren: 3 } as const;

/**
 * The visible forest: the largest `roots` families, `children` per root and `grandchildren` per child; what is left
 * out becomes a "+n more" leaf, and a node with hidden descendants says how many (exported for tests).
 */
export function familyView(trees: readonly FamilyNode[], caps: typeof TREE_CAPS, more: (n: number, m: number) => string): { roots: TreeDatum[]; shown: number } {
  let shown = 0;
  const outside = (list: readonly FamilyNode[]): number => list.reduce((s, c) => s + 1 + c.size, 0);
  // depth 0 = the company's own model; 1 = built on it; 2 = built on those (their descendants are counted, not drawn).
  const node = (n: FamilyNode, depth: number, path: string): TreeDatum => {
    const limit = depth === 0 ? caps.children : depth === 1 ? caps.grandchildren : 0;
    if (depth > 0) shown++;
    const children = n.children.slice(0, limit).map((c, i) => node(c, depth + 1, `${path}/${i}`));
    const rest = n.children.slice(limit);
    if (rest.length && limit > 0) children.push({ key: `${path}/more`, label: more(rest.length, outside(rest)), more: true });
    const hidden = limit === 0 ? n.size : 0;
    const year = n.date.slice(0, 4);
    return {
      key: path,
      label: n.model,
      sub: [n.org ?? '', year, hidden ? `+${hidden}` : ''].filter(Boolean).join(' · '),
      title: [n.model, n.org, year].filter(Boolean).join(' · '),
      children: children.length ? children : undefined,
    };
  };
  const roots = trees.slice(0, caps.roots).map((f, i) => node(f, 0, `r${i}`));
  const rest = trees.slice(caps.roots);
  if (rest.length) roots.push({ key: 'more', label: more(rest.length, rest.reduce((s, f) => s + f.size, 0)), more: true });
  return { roots, shown };
}

// ── CHANGED (S3-ai3): headline / "Did you know" numbers of C · D · E (rules, recomputed in test-ai-models) ──

// C──────────────────────────────────────────────────────────────────────────────────────────────

/** Consecutive model runs of one company merged: a company's stretch at No. 1. `open` = still No. 1 on the last day. */
export type CompanyRun = { org: string; from: string; to: string; days: number; models: string[]; open: boolean };

export function companyRuns(ds: ArenaDataset): CompanyRun[] {
  const out: CompanyRun[] = [];
  for (const r of arenaRuns(ds)) {
    const last = out.at(-1);
    if (last && last.org === r.org) {
      last.to = r.to;
      last.days = daysBetween(last.from, r.to);
      if (!last.models.includes(r.model)) last.models.push(r.model);
    } else out.push({ org: r.org, from: r.from, to: r.to, days: r.days, models: [r.model], open: false });
  }
  if (out.length) out.at(-1)!.open = out.at(-1)!.to === ds.end;
  return out;
}

/** How often the lead passed to another company; the longest stretch; the shortest finished one (earliest of equals). */
export function leadFacts(runs: readonly CompanyRun[]): { changes: number; longest: CompanyRun; shortest: CompanyRun } {
  const longest = runs.reduce((a, b) => (b.days > a.days ? b : a));
  const shortest = runs.filter((r) => !r.open).reduce((a, b) => (b.days < a.days ? b : a));
  return { changes: runs.length - 1, longest, shortest };
}

// D──────────────────────────────────────────────────────────────────────────────────────────────

/** The shortest time in which one series' published figure at least doubled (within one product AND one measure). */
export function fastestDoubling(series: readonly ClaimSeries[]): { series: ClaimSeries; a: number; b: number; days: number } | null {
  let best: { series: ClaimSeries; a: number; b: number; days: number } | null = null;
  for (const s of series)
    s.claims.forEach((ca, a) => {
      const b = s.claims.findIndex((cb, j) => j > a && cb.value >= 2 * ca.value);
      if (b < 0) return;
      const days = daysBetween(ca.asOf, s.claims[b]!.asOf);
      if (!best || days < best.days || (days === best.days && ca.asOf < best.series.claims[best.a]!.asOf)) best = { series: s, a, b, days };
    });
  return best;
}

/** "1 in N people on Earth": N rounded to a whole number (a user count is not a count of people — the page says so). */
export const oneIn = (world: number, value: number): number => Math.round(world / value);

// E──────────────────────────────────────────────────────────────────────────────────────────────

/** Models with the most models built directly on them, across the eight (a model in two companies' trees counted once). */
export function topBases(ds: LineageDataset): Array<{ model: string; hero: string; children: number }> {
  const best = new Map<string, { model: string; hero: string; children: number }>();
  for (const h of ds.heroes)
    for (const f of familyTrees(h)) {
      const walk = (n: FamilyNode): void => {
        const prev = best.get(n.model);
        if (!prev || n.children.length > prev.children) best.set(n.model, { model: n.model, hero: h.id, children: n.children.length });
        n.children.forEach(walk);
      };
      walk(f);
    }
  return [...best.values()].filter((b) => b.children > 0).sort((a, b) => b.children - a.children || (a.model < b.model ? -1 : 1));
}

/** The top base, then the top base of each other company — the next two of them. */
export function baseFacts(ds: LineageDataset): { top: { model: string; hero: string; children: number }; next: Array<{ model: string; hero: string; children: number }> } | null {
  const all = topBases(ds);
  const top = all[0];
  if (!top) return null;
  const next: typeof all = [];
  for (const b of all) if (b.hero !== top.hero && !next.some((n) => n.hero === b.hero)) next.push(b);
  return { top, next: next.slice(0, 2) };
}

// facts.ts — CHANGED (S3-cp): this entry's rankings for the country profile (scripts/gen-facts.ts → country-facts.json).
import type { FactFormat, FactId, FactTable, ReadData } from '../../catalog/facts';
import { rowsOf, yearsOf } from '../../catalog/factKit';
import type { Localized } from '../../catalog/types';
import { FILES, parseAccess, parseCountries, rankAccess, rankCarbon, rankMix, rankProducers } from './data';
import meta from './meta';
import { PAGE_SIZE } from './state';

type Row = { code: string; rank: number; value: number; year: number; dated: boolean };
type Spec = { id: FactId; label: Localized; first: Localized; format: FactFormat; link: Record<string, string> };

function table(spec: Spec, list: readonly Row[], year: number): FactTable {
  const t: FactTable = { ...spec, entry: meta.id, group: 'energy', year, pageSize: PAGE_SIZE, rows: rowsOf(list) };
  // Ukraine and a few others: the last year the source has (the page marks them "*").
  const years = yearsOf(list.filter((r) => r.dated).map((r) => [r.code, r.year] as const));
  if (years) t.years = years;
  return t;
}

export function facts(read: ReadData): FactTable[] {
  const ds = parseCountries(read(meta.id, FILES.countries));
  const access = parseAccess(read(meta.id, FILES.access));
  const most = { en: '#1 = most', uk: '№1 = найбільше' };
  return [
    table(
      { id: 'electricity-generation', label: { en: 'Electricity generation', uk: 'Виробництво електроенергії' }, first: most, format: 'twh', link: {} },
      rankProducers(ds, 'total'),
      ds.rankYear,
    ),
    table(
      { id: 'electricity-per-capita', label: { en: 'Electricity per person', uk: 'Електроенергія на людину' }, first: most, format: 'mwh', link: { metric: 'per-capita' } },
      rankProducers(ds, 'per-capita'),
      ds.rankYear,
    ),
    table(
      {
        id: 'electricity-low-carbon',
        label: { en: 'Low-carbon share of electricity', uk: 'Частка низьковуглецевих джерел' },
        first: { en: '#1 = highest share', uk: '№1 = найбільша частка' },
        format: 'share',
        link: { show: 'mix', order: 'clean' },
      },
      rankMix(ds, 'clean'),
      ds.rankYear,
    ),
    table(
      {
        id: 'carbon-intensity',
        label: { en: 'Carbon intensity of electricity', uk: 'Вуглецева інтенсивність електроенергії' },
        first: { en: '#1 = cleanest (fewest g CO₂ per kWh)', uk: '№1 = найчистіша (найменше г CO₂ на кВт·год)' },
        format: 'g-kwh',
        link: { show: 'carbon' },
      },
      rankCarbon(ds, 'cleanest'),
      ds.rankYear,
    ),
    table(
      {
        id: 'electricity-access',
        label: { en: 'Access to electricity', uk: 'Доступ до електрики' },
        first: { en: '#1 = lowest access', uk: '№1 = найнижчий доступ' },
        format: 'percent',
        link: { show: 'access' },
      },
      rankAccess(access, 'share'),
      access.year,
    ),
  ];
}

// facts.ts — CHANGED (S3-cp): this entry's rankings for the country profile (scripts/gen-facts.ts → country-facts.json).
import type { FactTable, ReadData } from '../../catalog/facts';
import { rowsOf, yearsOf } from '../../catalog/factKit';
import { HOMICIDE_FILE, NUMBEO_FILE, parseHomicideDataset, parseNumbeoDataset, rankHomicide, rankNumbeo } from './data';
import meta from './meta';
import { PAGE_SIZE } from './state';

export function facts(read: ReadData): FactTable[] {
  const homicide = parseHomicideDataset(read(meta.id, HOMICIDE_FILE));
  const numbeo = parseNumbeoDataset(read(meta.id, NUMBEO_FILE));
  const hRows = rankHomicide(homicide);
  const h: FactTable = {
    id: 'homicide-rate',
    entry: meta.id,
    group: 'security',
    label: { en: 'Homicides per 100,000 people', uk: 'Умисні вбивства на 100 тис. людей' },
    first: { en: '#1 = highest rate', uk: '№1 = найвищий рівень' },
    format: 'rate2',
    year: homicide.latestYear,
    link: {},
    pageSize: PAGE_SIZE,
    rows: rowsOf(hRows),
  };
  const years = yearsOf(hRows.filter((r) => r.olderYear !== undefined).map((r) => [r.code, r.olderYear!] as const));
  if (years) h.years = years;
  const year = Number(/^\d{4}/.exec(numbeo.edition)?.[0]);
  return [
    h,
    {
      id: 'numbeo-crime',
      entry: meta.id,
      group: 'security',
      label: { en: 'Crime index (Numbeo)', uk: 'Індекс злочинності (Numbeo)' },
      first: { en: '#1 = highest, as residents perceive it', uk: '№1 = найвищий, за відчуттями мешканців' },
      format: 'index1',
      year: Number.isFinite(year) ? year : null,
      link: { show: 'numbeo' },
      pageSize: PAGE_SIZE,
      rows: rowsOf(rankNumbeo(numbeo)),
    },
  ];
}

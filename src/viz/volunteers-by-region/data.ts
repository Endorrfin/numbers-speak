// data.ts — volunteers-by-region dataset contract: types, parser (prep, check:data, browser). CHANGED (S3-cd): new.
import { array, fail, finite, record, string } from '../../lib/dataset';

export const DATA_FILE = 'volunteers-by-region-2024.json';

export const REGION_IDS = [
  'odeska', 'khersonska', 'kyivska', 'zhytomyrska', 'sumska', 'donetska', 'dnipropetrovska', 'kharkivska',
  'luhanska', 'poltavska', 'zaporizka', 'chernihivska', 'rivnenska', 'chernivetska', 'ivano-frankivska',
  'khmelnytska', 'lvivska', 'ternopilska', 'zakarpatska', 'volynska', 'cherkaska', 'kirovohradska',
  'mykolaivska', 'vinnytska', 'crimea',
] as const;
export type RegionId = (typeof REGION_IDS)[number];

export type RegionRow = { id: RegionId; count: number };

export type RegionDataset = {
  unit: 'people';
  /** Month the register was read, 'YYYY-MM'. */
  asOf: string;
  /** All 25 regions, each exactly once. */
  rows: RegionRow[];
};

export function parseRegions(json: unknown, where = DATA_FILE): RegionDataset {
  const o = record(json, where);
  if (o.unit !== 'people') fail(`${where}.unit`, "'people' expected");
  const asOf = string(o.asOf, `${where}.asOf`, /^\d{4}-\d{2}$/);
  const seen = new Set<string>();
  const rows = array(o.rows, `${where}.rows`, REGION_IDS.length).map((raw, i): RegionRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const id = string(r.id, `${at}.id`);
    if (!(REGION_IDS as readonly string[]).includes(id)) fail(`${at}.id`, `unknown region '${id}'`);
    if (seen.has(id)) fail(`${at}.id`, `duplicate region '${id}'`);
    seen.add(id);
    const count = finite(r.count, `${at}.count`, 0, 20_000);
    if (!Number.isInteger(count)) fail(`${at}.count`, 'integer expected');
    return { id: id as RegionId, count };
  });
  for (const id of REGION_IDS) if (!seen.has(id)) fail(where, `missing region '${id}'`);
  return { unit: 'people', asOf, rows };
}

/** Display names — kept out of the JSON (CLAUDE.md §4: numbers as numbers). */
export const REGION_NAME: Record<RegionId, { en: string; uk: string }> = {
  odeska: { en: 'Odesa Oblast', uk: 'Одеська область' },
  khersonska: { en: 'Kherson Oblast', uk: 'Херсонська область' },
  kyivska: { en: 'Kyiv city & Kyiv Oblast', uk: 'Київ і Київська область' },
  zhytomyrska: { en: 'Zhytomyr Oblast', uk: 'Житомирська область' },
  sumska: { en: 'Sumy Oblast', uk: 'Сумська область' },
  donetska: { en: 'Donetsk Oblast', uk: 'Донецька область' },
  dnipropetrovska: { en: 'Dnipropetrovsk Oblast', uk: 'Дніпропетровська область' },
  kharkivska: { en: 'Kharkiv Oblast', uk: 'Харківська область' },
  luhanska: { en: 'Luhansk Oblast', uk: 'Луганська область' },
  poltavska: { en: 'Poltava Oblast', uk: 'Полтавська область' },
  zaporizka: { en: 'Zaporizhzhia Oblast', uk: 'Запорізька область' },
  chernihivska: { en: 'Chernihiv Oblast', uk: 'Чернігівська область' },
  rivnenska: { en: 'Rivne Oblast', uk: 'Рівненська область' },
  chernivetska: { en: 'Chernivtsi Oblast', uk: 'Чернівецька область' },
  'ivano-frankivska': { en: 'Ivano-Frankivsk Oblast', uk: 'Івано-Франківська область' },
  khmelnytska: { en: 'Khmelnytskyi Oblast', uk: 'Хмельницька область' },
  lvivska: { en: 'Lviv Oblast', uk: 'Львівська область' },
  ternopilska: { en: 'Ternopil Oblast', uk: 'Тернопільська область' },
  zakarpatska: { en: 'Zakarpattia Oblast', uk: 'Закарпатська область' },
  volynska: { en: 'Volyn Oblast', uk: 'Волинська область' },
  cherkaska: { en: 'Cherkasy Oblast', uk: 'Черкаська область' },
  kirovohradska: { en: 'Kirovohrad Oblast', uk: 'Кіровоградська область' },
  mykolaivska: { en: 'Mykolaiv Oblast', uk: 'Миколаївська область' },
  vinnytska: { en: 'Vinnytsia Oblast', uk: 'Вінницька область' },
  crimea: { en: 'AR of Crimea (occupied)', uk: 'АР Крим (окупована)' },
};

/** check:data hook (scripts/check-data.ts). */
export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parseRegions(json, file);
}

/*
 * m49.ts — ISO 3166-1 alpha-2 → continent, after the UN M49 standard ("Standard country or area codes
 * for statistical use", https://unstats.un.org/unsd/methodology/m49/). Build-time only: prep scripts
 * write the region into each dataset, so a region is derived from the code and never hand-typed.
 * Resolves CATALOG §E Q1 (Haiti is in the Americas, like every Caribbean country).
 * XK (Kosovo) is not an M49 area; it is placed in Europe, as the World Bank does.
 */
import type { Region } from '../../src/lib/regions';

const BY_REGION: Record<Region, string> = {
  africa:
    'DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU YT MA MZ NA NE NG RE RW SH ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW IO TF',
  americas:
    'AI AG AR AW BS BB BZ BM BO BQ BV BR CA KY CL CO CR CU CW DM DO EC SV FK GF GL GD GP GT GY HT HN JM MQ MX MS NI PA PY PE PR BL KN LC MF PM VC SX GS SR TT TC US VG VI UY VE',
  asia: 'AF AM AZ BH BD BT BN KH CN CY GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE',
  europe:
    'AX AL AD AT BY BE BA BG HR CZ DK EE FO FI FR DE GI GR GG VA HU IS IE IM IT JE XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SJ SE CH UA GB',
  oceania: 'AS AU CX CC CK FJ PF GU HM KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV UM VU WF',
};

export const M49_REGION: ReadonlyMap<string, Region> = new Map(
  (Object.entries(BY_REGION) as [Region, string][]).flatMap(([region, codes]) =>
    codes.split(' ').map((code) => [code, region] as const),
  ),
);

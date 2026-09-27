/*
 * numbeo.ts — CHANGED (S3-re): Numbeo country names → ISO 3166-1 alpha-2, shared by the prep scripts that read the
 * owner's hand copies of Numbeo tables (crime-index since S3-rb, real-estate-world since S3-re). Moved here from
 * data-raw/crime-index/prep.ts unchanged. A name equal to the CLDR English name (Intl.DisplayNames) resolves without
 * an entry; the map lists only Numbeo's own spellings. Build-time only, like m49.ts.
 */
import { M49_REGION } from './m49';

export const NUMBEO_ALIASES: Readonly<Record<string, string>> = {
  'Bosnia And Herzegovina': 'BA',
  'Trinidad And Tobago': 'TT',
  'Congo (Kinshasa)': 'CD',
  'Congo (Brazzaville)': 'CG',
  'Ivory Coast': 'CI',
  Kosovo: 'XK',
  'Kosovo (Disputed Territory)': 'XK',
  'Hong Kong (China)': 'HK',
  'Macao (China)': 'MO',
  Palestine: 'PS',
  Myanmar: 'MM',
  Turkey: 'TR',
  Czech: 'CZ',
  'Czech Republic': 'CZ',
  'North Macedonia': 'MK',
  'United States': 'US',
  'United Kingdom': 'GB',
  'Isle Of Man': 'IM',
  'Antigua And Barbuda': 'AG',
  'Saint Kitts And Nevis': 'KN',
  'Saint Vincent And The Grenadines': 'VC',
  'Sao Tome And Principe': 'ST',
  'Cabo Verde': 'CV',
  'Cape Verde': 'CV',
  Curacao: 'CW',
  Taiwan: 'TW',
  'South Korea': 'KR',
  'North Korea': 'KP',
  'Us Virgin Islands': 'VI', // S3-rb: Numbeo's capitalisation of "US"
};

const display = new Intl.DisplayNames(['en'], { type: 'region' });
const BY_NAME = new Map<string, string>();
for (const code of M49_REGION.keys()) {
  const name = display.of(code);
  if (name) BY_NAME.set(name, code);
}

/** Numbeo's country name → ISO2, or '' when unknown (the caller reports it and names the alias to add). */
export function numbeoCountryCode(name: string): string {
  return NUMBEO_ALIASES[name] ?? BY_NAME.get(name) ?? '';
}

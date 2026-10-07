// text.ts — CHANGED (S3-oil): the oil page's shared words (angle tabs, intros, units). Each angle keeps its own
// strings next to its markup; only what two or more angles use lives here.
import type { Localized } from '../../catalog/types';
import type { Show } from './state';

export const txt = {
  angle: { en: 'Angle', uk: 'Погляд' },
  angles: { en: 'Angles on the data', uk: 'Погляди на дані' },
  kbdAxis: { en: 'Barrels a day', uk: 'Барелів на добу' },
  kbdCol: { en: 'kb/d', uk: 'тис. б/д' },
  approx: { en: '≈', uk: '≈' },
  year: { en: 'Year', uk: 'Рік' },
  share: { en: 'Share', uk: 'Частка' },
  change: { en: 'Change', uk: 'Зміна' },
  tipRank: { en: 'Rank: {rank} of {total}', uk: 'Місце: {rank} з {total}' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },
  historic: {
    en: 'USSR: the EI reports the Soviet Union as one area until 1984 and its successor states from 1985.',
    uk: 'СРСР: EI подає Радянський Союз як одну територію до 1984 року, а держави-наступниці — з 1985-го.',
  },
} as const satisfies Record<string, Localized>;

export const SHOW_TEXT: Record<Show, { key: string; tab: Localized; intro: Localized }> = {
  consumption: {
    key: 'A',
    tab: { en: 'Who uses oil', uk: 'Хто споживає' },
    intro: {
      en: 'Oil consumption in 2025, in barrels a day, for every country the Energy Institute lists — or per person, in barrels a year.',
      uk: 'Споживання нафти у 2025 році, барелів на добу, для кожної країни, яку наводить Energy Institute, — або на одну людину, барелів на рік.',
    },
  },
  race: {
    key: 'B',
    tab: { en: '60 years', uk: '60 років' },
    intro: {
      en: 'Sixty years of oil demand: the twelve largest consumers in each year from 1965 to 2025.',
      uk: 'Шістдесят років попиту на нафту: дванадцять найбільших споживачів у кожному році з 1965 по 2025.',
    },
  },
  us: {
    key: 'C',
    tab: { en: 'US imports', uk: 'Імпорт США' },
    intro: {
      en: 'Where the crude oil the United States imports comes from, country by country (EIA, by country of origin).',
      uk: 'Звідки походить сира нафта, яку імпортують США, — країна за країною (EIA, за країною походження).',
    },
  },
  china: {
    key: 'D',
    tab: { en: 'China imports', uk: 'Імпорт Китаю' },
    intro: {
      en: 'Where China’s imported crude comes from — as China’s customs record it, partner by partner.',
      uk: 'Звідки походить сира нафта, яку імпортує Китай, — так, як її записує митниця Китаю, партнер за партнером.',
    },
  },
  flows: {
    key: 'E',
    tab: { en: 'Who buys from whom', uk: 'Хто в кого купує' },
    intro: {
      en: 'The world’s crude trade in 2025 between areas: each buyer split by where its oil comes from — or each seller by where its oil goes.',
      uk: 'Світова торгівля сирою нафтою у 2025 році між регіонами: кожен покупець — за тим, звідки його нафта, або кожен продавець — за тим, куди вона йде.',
    },
  },
};

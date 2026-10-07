// text.ts — CHANGED (S3-el): the electricity page's shared words (angle tabs, intros, fuel groups, the Ukraine note).
// Each angle keeps its own strings next to its markup; only what two or more angles use lives here.
import type { Localized } from '../../catalog/types';
import type { Group } from './data';
import type { Show } from './state';

export const txt = {
  angle: { en: 'Angle', uk: 'Погляд' },
  angles: { en: 'Angles on the data', uk: 'Погляди на дані' },
  order: { en: 'Order', uk: 'Порядок' },
  metric: { en: 'Measure', uk: 'Показник' },
  twhAxis: { en: 'Terawatt-hours a year', uk: 'Тераватт-годин на рік' },
  colTwh: { en: 'Generation, TWh', uk: 'Виробництво, ТВт·год' },
  colYear: { en: 'Year', uk: 'Рік' },
  tipRank: { en: 'Rank: {rank} of {total}', uk: 'Місце: {rank} з {total}' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },
  tipDated: { en: '* Latest year Ember publishes: {year}', uk: '* Останній рік, який публікує Ember: {year}' },
  dated: {
    en: '* Latest year Ember publishes for this country ({years}); the others are {rankYear}.',
    uk: '* Останній рік, який Ember публікує для цієї країни ({years}); решта — {rankYear}.',
  },
  ukraineGapTitle: { en: 'Why Ukraine’s figures stop in 2022', uk: 'Чому дані України закінчуються 2022 роком' },
  ukraineGap: {
    en: 'Since 24 February 2022 Ukraine has not published how much electricity it generates and from which sources: Ukrenergo stopped updating its grid data, and the State Statistics Service postponed the energy balance under the martial-law law on reporting (official statistics whose quality cannot be ensured may not be published until three months after martial law ends). Grid data are also treated as sensitive while power plants are under attack. 2022 is the last year Ember can break down — so wherever Ukraine is ranked here, its figure is from 2022 and marked “*”.',
    uk: 'З 24 лютого 2022 року Україна не публікує, скільки електроенергії виробляє і з яких джерел: Укренерго припинило оновлювати дані енергосистеми, а Держстат переніс публікацію енергетичного балансу за законом про звітність під час воєнного стану (офіційна статистика, якість якої неможливо забезпечити, може не поширюватися до трьох місяців після завершення воєнного стану). Дані енергосистеми також вважають чутливими, поки електростанції під обстрілами. 2022 рік — останній, для якого Ember має повну розбивку, тож усюди, де Україна є в рейтингу, її значення — за 2022 рік і позначене «*».',
  },
  credit: {
    en: 'Data: Ember, Yearly Electricity Data (CC BY 4.0), downloaded {date}.',
    uk: 'Дані: Ember, Yearly Electricity Data (CC BY 4.0), завантажено {date}.',
  },
} as const satisfies Record<string, Localized>;

export const GROUP_TEXT: Record<Group, { name: Localized; short: Localized }> = {
  coal: { name: { en: 'Coal', uk: 'Вугілля' }, short: { en: 'Coal', uk: 'Вугілля' } },
  gas: { name: { en: 'Gas, oil & other fossil', uk: 'Газ, нафта й інше викопне' }, short: { en: 'Gas & oil', uk: 'Газ і нафта' } },
  nuclear: { name: { en: 'Nuclear', uk: 'Атом' }, short: { en: 'Nuclear', uk: 'Атом' } },
  hydro: { name: { en: 'Hydro, bioenergy & other renewables', uk: 'ГЕС, біоенергія й інші відновлювані' }, short: { en: 'Hydro & bio', uk: 'ГЕС і біо' } },
  wind: { name: { en: 'Wind', uk: 'Вітер' }, short: { en: 'Wind', uk: 'Вітер' } },
  solar: { name: { en: 'Solar', uk: 'Сонце' }, short: { en: 'Solar', uk: 'Сонце' } },
};

export const SHOW_TEXT: Record<Show, { key: string; tab: Localized; intro: Localized }> = {
  producers: {
    key: 'A',
    tab: { en: 'Who generates', uk: 'Хто виробляє' },
    intro: {
      en: 'Electricity generated in 2024, country by country — or how much each person uses (demand per person, which counts imports too).',
      uk: 'Скільки електроенергії виробила кожна країна у 2024 році — або скільки споживає одна людина (попит на людину, разом з імпортом).',
    },
  },
  mix: {
    key: 'B',
    tab: { en: 'From what', uk: 'З чого' },
    intro: {
      en: 'Each country’s electricity split by source, 2024: coal, gas and oil, nuclear, hydro and bioenergy, wind, solar.',
      uk: 'Електроенергія кожної країни за джерелами, 2024: вугілля, газ і нафта, атом, ГЕС і біоенергія, вітер, сонце.',
    },
  },
  world: {
    key: 'C',
    tab: { en: 'The world, 2000–2025', uk: 'Світ, 2000–2025' },
    intro: {
      en: 'Where the world’s electricity has come from since 2000: each source’s share of generation, year by year.',
      uk: 'Звідки бралася електроенергія світу з 2000 року: частка кожного джерела у виробництві, рік за роком.',
    },
  },
  race: {
    key: 'D',
    tab: { en: 'Solar & wind race', uk: 'Перегони сонця й вітру' },
    intro: {
      en: 'Twenty-five years of solar and wind power: the twelve largest generators in each year from 2000 to 2025.',
      uk: 'Двадцять п’ять років сонячної й вітрової енергетики: дванадцять найбільших виробників у кожному році з 2000 по 2025.',
    },
  },
  carbon: {
    key: 'E',
    tab: { en: 'Carbon footprint', uk: 'Вуглецевий слід' },
    intro: {
      en: 'Grams of CO2 emitted for each kilowatt-hour a country generates, 2024 — from hydro- and nuclear-powered grids to coal- and gas-fired ones.',
      uk: 'Скільки грамів CO2 викидає країна на кожну вироблену кіловат-годину, 2024 — від мереж на ГЕС і атомі до вугільних і газових.',
    },
  },
  access: {
    key: 'F',
    tab: { en: 'Without electricity', uk: 'Без електрики' },
    intro: {
      en: 'Who still lives without electricity: the share of people with access, or how many people have none (World Bank, 2024).',
      uk: 'Хто досі живе без електрики: частка людей з доступом або скільки людей його не мають (Світовий банк, 2024).',
    },
  },
  ukraine: {
    key: 'G',
    tab: { en: 'Ukraine, 1990–2022', uk: 'Україна, 1990–2022' },
    intro: {
      en: 'How Ukraine’s electricity changed from 1990 to 2022, source by source — and what the Zaporizhzhia nuclear plant, occupied since March 2022, used to give.',
      uk: 'Як змінювалася електроенергетика України з 1990 по 2022 рік, джерело за джерелом, — і що давала Запорізька АЕС, окупована з березня 2022 року.',
    },
  },
};

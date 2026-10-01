// text.ts — CHANGED (S3-re): the page's EN/UK copy (pure data; the angles and the shell read it).
import type { Show, Sort } from './state';

export type L = { en: string; uk: string };

export const txt = {
  angle: { en: 'Angle', uk: 'Ракурс' },
  shows: {
    ranking: { en: 'Ranking', uk: 'Рейтинг' },
    scatter: { en: 'Price vs affordability', uk: 'Ціна vs доступність' },
    income: { en: 'A year of income & mortgage', uk: 'Рік доходу та іпотека' },
    centre: { en: 'Centre vs outskirts', uk: 'Центр vs околиці' },
    map: { en: 'World map', uk: 'Карта світу' },
    compare: { en: 'Compare', uk: 'Порівняння' },
  } satisfies Record<Show, L>,

  // ── City picker ──────────────────────────────────────────────────────────────────────────────────
  picker: { en: 'Highlight cities', uk: 'Виділити міста' },
  pickerHint: { en: 'up to {n}, shown on every angle', uk: 'до {n}, видно в кожному ракурсі' },
  pickerPlaceholder: { en: 'Type a city…', uk: 'Почніть вводити місто…' },
  remove: { en: 'Remove {name}', uk: 'Прибрати {name}' },
  presets: { en: 'Sets', uk: 'Набори' },
  presetUa: { en: 'Ukraine', uk: 'Україна' },
  presetNeighbours: { en: 'Ukraine & neighbours', uk: 'Україна й сусіди' },
  notFound: { en: 'No city “{q}” in the list — pick one of the suggestions.', uk: 'Міста «{q}» немає в списку — виберіть із підказок.' },
  full: { en: 'Up to {n} cities — remove one first.', uk: 'До {n} міст — спершу приберіть одне.' },
  already: { en: '{name} is already highlighted.', uk: '{name} вже виділено.' },
  noneSelected: { en: 'No highlighted cities.', uk: 'Немає виділених міст.' },
  highlightLegend: { en: 'Highlighted cities', uk: 'Виділені міста' },

  // ── Shared ───────────────────────────────────────────────────────────────────────────────────────
  measure: { en: 'Measure', uk: 'Показник' },
  groups: {
    prices: { en: 'Prices', uk: 'Ціни' },
    affordability: { en: 'Affordability', uk: 'Доступність' },
    rent: { en: 'Buy or rent', uk: 'Купівля чи оренда' },
  },
  context: { en: 'Numbeo, {date}', uk: 'Numbeo, {date}' },
  regionCount: { en: '{region}: {count}', uk: '{region}: {count}' },
  rankOf: { en: 'rank {rank} of {total}', uk: 'місце {rank} з {total}' },
  kpiMedian: { en: 'Median of {count} cities', uk: 'Медіана {count} міст' },
  kpiSpread: { en: 'The first city vs the last of {count}', uk: 'Перше місто проти останнього з {count}' },
  kpiOver100: { en: '{count} of {total} cities: the payment exceeds the whole income', uk: '{count} з {total} міст: платіж більший за весь дохід' },
  kpiBelow1: { en: '{count} of {total} cities: the outskirts cost more than the centre', uk: '{count} з {total} міст: околиці дорожчі за центр' },
  kpiHighlight: { en: '{city}: rank {rank} of {total}, the highest of your cities', uk: '{city}: місце {rank} з {total}, найвище з виділених міст' },
  find: { en: 'Your cities in this ranking', uk: 'Виділені міста в цьому рейтингу' },

  // ── Tooltips ─────────────────────────────────────────────────────────────────────────────────────
  tipRank: { en: '{measure}: {value} (rank {rank} of {total})', uk: '{measure}: {value} (місце {rank} з {total})' },
  tipLine: { en: '{measure}: {value}', uk: '{measure}: {value}' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },

  // ── Ranking ──────────────────────────────────────────────────────────────────────────────────────
  rankingLabel: {
    en: 'Horizontal bar chart: {measure}, {region}, ranks {from} to {to} of {total}. Highest: {top}. Highlighted cities have a tinted row. The table view lists every value.',
    uk: 'Горизонтальна стовпчикова діаграма: {measure} ({region}), місця {from}–{to} з {total}. Найвище: {top}. Рядки виділених міст підсвічено. Таблиця містить усі значення.',
  },
  rankNote: {
    en: 'Rank is the global rank among the cities with this measure, also when a region is selected.',
    uk: 'Місце — глобальне серед міст із цим показником, навіть коли вибрано регіон.',
  },

  // ── Price vs affordability ───────────────────────────────────────────────────────────────────────
  scatterLabel: {
    en: 'Scatter plot of {count} cities: price per square metre in the centre (across, logarithmic) against years of income for a 90 m² home (up, logarithmic). Rank correlation {rho}. The table view lists every value.',
    uk: 'Діаграма розсіювання {count} міст: ціна квадратного метра в центрі (горизонтально, логарифмічна шкала) проти років доходу за житло 90 м² (вертикально, логарифмічна шкала). Рангова кореляція {rho}. Таблиця містить усі значення.',
  },
  scatterX: { en: 'Price per m² in the centre, US$ · log scale', uk: 'Ціна м² у центрі, $ · логарифмічна шкала' },
  scatterY: { en: 'Years of income for 90 m² · log scale', uk: 'Років доходу за 90 м² · логарифмічна шкала' },
  quadrants: [
    { en: 'Cheap m², out of reach', uk: 'Дешевий м², недосяжне житло' },
    { en: 'Dear and out of reach', uk: 'Дорого й недосяжно' },
    { en: 'Cheap and within reach', uk: 'Дешево й доступно' },
    { en: 'Dear m², high incomes', uk: 'Дорогий м², високі доходи' },
  ] as const,
  quadrantCount: { en: '{name} · {count}', uk: '{name} · {count}' },
  scatterWeak: {
    en: 'A dear square metre does not by itself make a home unaffordable: across {count} cities the rank correlation between the price per m² and the years of income is only {rho} — incomes differ as much as prices.',
    uk: 'Дорогий квадратний метр сам по собі не робить житло недоступним: на {count} містах рангова кореляція ціни м² і років доходу — лише {rho}, бо доходи різняться так само, як ціни.',
  },
  scatterStrong: {
    en: 'Across {count} cities the price per m² and the years of income move together: rank correlation {rho}.',
    uk: 'На {count} містах ціна м² і роки доходу рухаються разом: рангова кореляція {rho}.',
  },
  scatterGuides: {
    en: 'Dashed lines: medians of all {count} cities — {price} per m², {years} of income.',
    uk: 'Пунктир — медіани всіх {count} міст: {price} за м², {years} доходу.',
  },
  quadrantExamples: { en: 'For example', uk: 'Наприклад' },

  // ── A year of income & mortgage ──────────────────────────────────────────────────────────────────
  waffleTitle: { en: 'What a year of income buys', uk: 'Що купує рік доходу' },
  waffleLede: {
    en: 'Each square is 1 m² of a 90 m² home; filled is the floor space a family’s yearly net income buys at the city’s average price.',
    uk: 'Кожен квадрат — 1 м² житла площею 90 м²; зафарбовано площу, яку купує річний чистий дохід сім’ї за середньою ціною міста.',
  },
  waffleCaption: { en: '{m2} a year · {years} for 90 m²', uk: '{m2} за рік · {years} за 90 м²' },
  waffleMost: { en: 'Most for a year: {city}', uk: 'Найбільше за рік: {city}' },
  waffleMedian: { en: 'Median of {count} cities', uk: 'Медіана {count} міст' },
  waffleLeast: { en: 'Least for a year: {city}', uk: 'Найменше за рік: {city}' },
  waffleLabel: {
    en: '{name}: a year of income buys {m2} of a 90 m² home, so the home costs {years} of income.',
    uk: '{name}: рік доходу купує {m2} житла площею 90 м², тож житло коштує {years} доходу.',
  },
  noIndex: { en: '{cities}: not in Numbeo’s property index, so no income data.', uk: '{cities}: немає в індексі нерухомості Numbeo, тож немає даних про дохід.' },
  mortgageTitle: { en: 'A mortgage for the whole price, as a share of income', uk: 'Іпотека на всю ціну як частка доходу' },
  mortgageLabel: {
    en: 'Beeswarm of {count} cities: the monthly payment of a 20-year mortgage for the full price as a share of net family income, logarithmic axis. {over} cities are above 100%. The table view lists every value.',
    uk: 'Рій точок {count} міст: щомісячний платіж за 20-річною іпотекою на всю ціну як частка чистого доходу сім’ї, логарифмічна шкала. Понад 100% — {over} міст. Таблиця містить усі значення.',
  },
  mortgageAxis: { en: 'Mortgage payment, % of net family income · log scale', uk: 'Платіж за іпотекою, % чистого доходу сім’ї · логарифмічна шкала' },
  ref100: { en: '100%: the payment = the income', uk: '100%: платіж = дохід' },
  refMedian: { en: 'median {value}', uk: 'медіана {value}' },

  // ── Centre vs outskirts ──────────────────────────────────────────────────────────────────────────
  sort: { en: 'Order', uk: 'Порядок' },
  sorts: {
    premium: { en: 'Widest gap', uk: 'Найбільший розрив' },
    centre: { en: 'Dearest centre', uk: 'Найдорожчий центр' },
    inverse: { en: 'Outskirts dearer', uk: 'Околиці дорожчі' },
  } satisfies Record<Sort, L>,
  legendOutside: { en: 'outside the centre', uk: 'поза центром' },
  legendCentre: { en: 'city centre', uk: 'центр міста' },
  dumbbellLabel: {
    en: 'Dumbbell chart: price per square metre outside the centre (ring) and in the centre (dot), logarithmic axis, {region}, rows {from} to {to} of {total}, {order}. The table view lists every value.',
    uk: 'Гантельна діаграма: ціна квадратного метра поза центром (кільце) і в центрі (точка), логарифмічна шкала ({region}), рядки {from}–{to} з {total}, порядок: {order}. Таблиця містить усі значення.',
  },
  kpiPremiumMedian: { en: 'Median centre premium, {count} cities', uk: 'Медіанна націнка центру, {count} міст' },
  rentTitle: { en: 'Buy or rent? Years of rent that equal the price', uk: 'Купити чи орендувати? Скільки років оренди дорівнюють ціні' },
  rentLede: {
    en: 'In the centre, a median flat costs {years} of its rent — a gross rental yield of about {yield} a year.',
    uk: 'У центрі медіанна квартира коштує {years} її оренди — валова дохідність оренди близько {yield} на рік.',
  },
  rentLabel: {
    en: 'Beeswarm of {count} cities: price ÷ yearly rent in the city centre, logarithmic axis. Median {median}. The table view lists every value.',
    uk: 'Рій точок {count} міст: ціна ÷ річна оренда в центрі міста, логарифмічна шкала. Медіана {median}. Таблиця містить усі значення.',
  },
  rentAxis: { en: 'Price ÷ yearly rent in the centre, years · log scale', uk: 'Ціна ÷ річна оренда в центрі, роки · логарифмічна шкала' },

  // ── Map ──────────────────────────────────────────────────────────────────────────────────────────
  mapLabel: {
    en: 'World map of {count} cities coloured by {measure} in four quartiles, from {min} to {max}. The table view lists every value.',
    uk: 'Карта світу: {count} міст, колір — {measure} у чотирьох квартилях, від {min} до {max}. Таблиця містить усі значення.',
  },
  mapLegend: { en: 'Quartiles of {count} cities', uk: 'Квартилі {count} міст' },
  mapZoom: { en: 'zoomed to {region}', uk: 'наближено: {region}' },
  mapMissing: { en: '{count} cities have no value for this measure and are not shown.', uk: '{count} міст не мають цього показника й не показані.' },
  mapLoading: { en: 'Loading the map…', uk: 'Завантаження карти…' },

  // ── Compare ──────────────────────────────────────────────────────────────────────────────────────
  compareEmpty: { en: 'Pick up to {n} cities above to compare them side by side.', uk: 'Виберіть угорі до {n} міст, щоб порівняти їх поруч.' },
  compareRank: { en: '#{rank} of {total}', uk: '№{rank} з {total}' },
  compareNote: {
    en: 'The bar under each value shows where the city stands among all cities with that measure (right = rank 1, the highest value).',
    uk: 'Смуга під кожним значенням показує місце міста серед усіх міст із цим показником (праворуч — місце 1, найбільше значення).',
  },

  // ── Table and notes ──────────────────────────────────────────────────────────────────────────────
  colCity: { en: 'City', uk: 'Місто' },
  tableCaption: { en: '{title} — {region}, {date}: every city, ordered by {measure}', uk: '{title} — {region}, {date}: усі міста за показником «{measure}»' },
  numbeoNote: {
    en: 'Numbeo’s figures are asking prices, rents and salaries reported by its users, not registered sales; a city with few contributors is less reliable. Data © Numbeo, used under its terms for personal websites.',
    uk: 'Цифри Numbeo — ціни пропозиції, оренда й зарплати, які повідомляють користувачі, а не зареєстровані угоди; місто з кількома дописувачами менш надійне. Дані © Numbeo, використано за їхніми умовами для особистих сайтів.',
  },
  linkPrices: { en: 'Numbeo — prices by city', uk: 'Numbeo — ціни за містами' },
  linkIndex: { en: 'Numbeo — Property Prices Index', uk: 'Numbeo — індекс цін на нерухомість' },
  linkMethod: { en: 'formulas', uk: 'формули' },
} as const;

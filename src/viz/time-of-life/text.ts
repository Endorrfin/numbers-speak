// text.ts — bilingual labels and number formats of the time-of-life page (S3-tl).
// Units use Intl unit formatting, so Ukrainian plurals are right ("17,6 року", "5 років", "8 год 26 хв").
import type { Lang, Localized } from '../../catalog/types';
import { localeOf } from '../../i18n/lang';
import type { DisplayId, GroupId, MeasureId, Sex } from './data';
import type { Show, Unit } from './state';

export const ACTIVITY_TEXT: Readonly<Record<DisplayId, Localized>> = {
  sleep: { en: 'Sleep', uk: 'Сон' },
  eating: { en: 'Eating and drinking', uk: 'Їжа й напої' },
  'personal-care': { en: 'Personal care and health', uk: 'Особистий догляд і здоров’я' },
  'paid-work': { en: 'Paid work', uk: 'Оплачувана робота' },
  study: { en: 'Study and homework', uk: 'Навчання й домашні завдання' },
  travel: { en: 'On the road (commute, errands)', uk: 'У дорозі (на роботу, у справах)' },
  housework: { en: 'Housework and cooking', uk: 'Хатні справи й готування' },
  shopping: { en: 'Shopping', uk: 'Покупки' },
  care: { en: 'Care for others, volunteering', uk: 'Догляд за іншими, волонтерство' },
  tv: { en: 'TV and radio', uk: 'Телебачення й радіо' },
  social: { en: 'Friends, family and events', uk: 'Друзі, родина й події' },
  sports: { en: 'Sport', uk: 'Спорт' },
  'other-leisure': { en: 'Other leisure (hobbies, games, internet, reading)', uk: 'Інше дозвілля (хобі, ігри, інтернет, читання)' },
  other: { en: 'Other (religion, civic duties, not recorded)', uk: 'Інше (релігія, громадські обов’язки, не записано)' },
};

/** Short names for chart labels. */
export const ACTIVITY_SHORT: Readonly<Record<DisplayId, Localized>> = {
  sleep: { en: 'Sleep', uk: 'Сон' },
  eating: { en: 'Eating', uk: 'Їжа' },
  'personal-care': { en: 'Personal care', uk: 'Догляд за собою' },
  'paid-work': { en: 'Paid work', uk: 'Робота' },
  study: { en: 'Study', uk: 'Навчання' },
  travel: { en: 'On the road', uk: 'У дорозі' },
  housework: { en: 'Housework', uk: 'Хатні справи' },
  shopping: { en: 'Shopping', uk: 'Покупки' },
  care: { en: 'Care', uk: 'Догляд' },
  tv: { en: 'TV & radio', uk: 'ТБ і радіо' },
  social: { en: 'Friends & family', uk: 'Друзі й родина' },
  sports: { en: 'Sport', uk: 'Спорт' },
  'other-leisure': { en: 'Other leisure', uk: 'Інше дозвілля' },
  other: { en: 'Other', uk: 'Інше' },
};

export const GROUP_TEXT: Readonly<Record<GroupId, Localized>> = {
  needs: { en: 'Body’s needs', uk: 'Потреби тіла' },
  duties: { en: 'Duties', uk: 'Обов’язки' },
  free: { en: 'Free time', uk: 'Вільний час' },
  other: { en: 'Other', uk: 'Інше' },
};

export const GROUP_HINT: Readonly<Record<GroupId, Localized>> = {
  needs: { en: 'sleep, eating, personal care', uk: 'сон, їжа, догляд за собою' },
  duties: { en: 'paid and unpaid work, study, travel', uk: 'оплачувана й неоплачувана робота, навчання, дорога' },
  free: { en: 'leisure of every kind', uk: 'дозвілля будь-якого виду' },
  other: { en: 'religion, civic duties, not recorded', uk: 'релігія, громадські обов’язки, не записано' },
};

export const MEASURE_TEXT: Readonly<Record<MeasureId, Localized>> = {
  free: { en: 'Free time', uk: 'Вільний час' },
  needs: { en: 'Body’s needs', uk: 'Потреби тіла' },
  duties: { en: 'All duties', uk: 'Усі обов’язки' },
  paid: { en: 'Paid work or study (OECD category)', uk: 'Оплачувана робота або навчання (категорія OECD)' },
  unpaid: { en: 'Unpaid work (OECD category)', uk: 'Неоплачувана робота (категорія OECD)' },
  ...ACTIVITY_SHORT,
};

export const SEX_TEXT: Readonly<Record<Sex, Localized>> = {
  total: { en: 'Everyone', uk: 'Усі' },
  women: { en: 'Women', uk: 'Жінки' },
  men: { en: 'Men', uk: 'Чоловіки' },
};

export const UNIT_TEXT: Readonly<Record<Unit, Localized>> = {
  years: { en: 'Years', uk: 'Роки' },
  days: { en: 'Days', uk: 'Дні' },
  hours: { en: 'Hours', uk: 'Години' },
  share: { en: '%', uk: '%' },
};

export type ShowText = { key: string; tab: Localized; intro: Localized; see: Localized; mind: Localized };

export const SHOW_TEXT: Readonly<Record<Show, ShowText>> = {
  weeks: {
    key: 'A',
    tab: { en: 'Life in weeks', uk: 'Життя в тижнях' },
    intro: {
      en: 'One square is one week, one row is one year, from the 15th birthday (top) to the 65th (bottom) — 2,600 weeks. Each activity gets as many squares as its share of an average day, laid end to end.',
      uk: 'Один квадрат — один тиждень, один рядок — один рік, від 15-го дня народження (вгорі) до 65-го (внизу) — 2 600 тижнів. Кожне заняття отримує стільки квадратів, яка його частка в середньому дні, і вони йдуть поспіль.',
    },
    see: {
      en: 'Done in one go, sleep would fill the years from 15 to about {sleepUntil}. Free time is the green band of {free}.',
      uk: 'Якби спати все поспіль, сон заповнив би роки від 15 приблизно до {sleepUntil}. Вільний час — зелена смуга з {free}.',
    },
    mind: {
      en: 'Nobody lives in blocks: this is an arithmetic picture of shares, not a timeline. The real mix changes with age.',
      uk: 'Ніхто не живе блоками: це арифметична картинка часток, а не хронологія. Справжнє поєднання змінюється з віком.',
    },
  },
  day: {
    key: 'B',
    tab: { en: 'One average day', uk: 'Один середній день' },
    intro: {
      en: 'The same shares in the unit the surveys use: the 24 hours of an average day, weekdays and weekends together.',
      uk: 'Ті самі частки в одиницях самих опитувань: 24 години середнього дня, будні й вихідні разом.',
    },
    see: {
      en: 'Sleep takes {sleepDay}, paid work {workDay} — an average over the whole group, including people without a job.',
      uk: 'Сон забирає {sleepDay}, оплачувана робота — {workDay}: це середнє по всій групі, зокрема тих, хто не працює.',
    },
    mind: {
      en: 'An average day is not a typical day: a 7-day average mixes working days, weekends and holidays.',
      uk: 'Середній день — не типовий: середнє за 7 днів змішує робочі дні, вихідні й відпустки.',
    },
  },
  ranking: {
    key: 'C',
    tab: { en: 'Ranking', uk: 'Рейтинг' },
    intro: {
      en: 'Activities from the largest to the smallest over the 50 years, in years, days, hours or % of the time.',
      uk: 'Заняття від найбільшого до найменшого за 50 років — у роках, днях, годинах чи % часу.',
    },
    see: {
      en: 'After sleep and paid work ({work}) comes housework ({housework}) — and TV and radio ({tv}) take almost as much.',
      uk: 'Після сну й оплачуваної роботи ({work}) ідуть хатні справи ({housework}), а телебачення й радіо ({tv}) забирають майже стільки ж.',
    },
    mind: {
      en: 'Bars share one scale, so small activities (sport, shopping) look tiny — the value labels keep them readable.',
      uk: 'Стовпці мають одну шкалу, тож малі заняття (спорт, покупки) виглядають крихітними — підписи значень лишаються читабельними.',
    },
  },
  groups: {
    key: 'D',
    tab: { en: 'Needs · duties · free', uk: 'Потреби · обов’язки · вільне' },
    intro: {
      en: 'Three questions: how much of life the body takes, how much goes to obligations, and how much is truly yours.',
      uk: 'Три питання: скільки життя забирає тіло, скільки — обов’язки і скільки справді належить вам.',
    },
    see: {
      en: 'Only {free} of the 50 years are free time; the body takes {needs}, duties {duties}.',
      uk: 'Лише {free} з 50 років — вільний час; тіло забирає {needs}, обов’язки — {duties}.',
    },
    mind: {
      en: 'The split is ours, not the OECD’s: travel counts as a duty, eating as a need, although a dinner with friends may feel like leisure.',
      uk: 'Поділ наш, а не OECD: дорога рахується обов’язком, їжа — потребою, хоча вечеря з друзями може бути дозвіллям.',
    },
  },
  countries: {
    key: 'E',
    tab: { en: 'Countries', uk: 'Країни' },
    intro: {
      en: 'One measure across 35 countries, in time per average day. The chosen country and the OECD average are highlighted.',
      uk: 'Один показник у 35 країнах — час за середній день. Вибрану країну і середнє по OECD виділено.',
    },
    see: {
      en: 'Most: {top} ({topValue}). Least: {bottom} ({bottomValue}).',
      uk: 'Найбільше: {top} ({topValue}). Найменше: {bottom} ({bottomValue}).',
    },
    mind: {
      en: 'Surveys are from 1998 to 2024 and countries code some activities differently — compare large gaps, not single minutes.',
      uk: 'Опитування — з 1998 по 2024 рік, і країни по-різному кодують деякі заняття: порівнюйте великі розриви, а не окремі хвилини.',
    },
  },
  gender: {
    key: 'F',
    tab: { en: 'Women vs men', uk: 'Жінки й чоловіки' },
    intro: {
      en: 'Women ← | → men, on one scale, for the chosen measure in every country. Rows where women spend more time are tinted.',
      uk: 'Жінки ← | → чоловіки на одній шкалі для вибраного показника в кожній країні. Рядки, де жінки витрачають більше часу, тоновано.',
    },
    see: {
      en: 'OECD average: women {women}, men {men} per day — over 50 years a difference of {gapYears}.',
      uk: 'Середнє по OECD: жінки {women}, чоловіки {men} на день — за 50 років різниця {gapYears}.',
    },
    mind: {
      en: 'Unpaid work is where the gap is largest; paid work runs the other way. Try “Unpaid work” and “Paid work or study”.',
      uk: 'Найбільший розрив — у неоплачуваній роботі; в оплачуваній він зворотний. Спробуйте «Неоплачувана робота» і «Оплачувана робота або навчання».',
    },
  },
};

export const txt = {
  headline: { en: 'Key numbers', uk: 'Головні числа' },
  legend: { en: 'Legend', uk: 'Легенда' },
  angle: { en: 'Angle', uk: 'Погляд' },
  country: { en: 'Country', uk: 'Країна' },
  sex: { en: 'Who', uk: 'Хто' },
  unit: { en: 'Unit', uk: 'Одиниця' },
  measure: { en: 'Measure', uk: 'Показник' },
  oecdAverage: { en: 'OECD average ({n} countries)', uk: 'Середнє по OECD ({n} країн)' },
  oecdShort: { en: 'OECD average', uk: 'Середнє по OECD' },
  allCountries: { en: '{n} countries and the OECD average', uk: '{n} країн і середнє по OECD' },
  oecdGroup: { en: 'OECD countries', uk: 'Країни OECD' },
  partnerGroup: { en: 'Partner economies', uk: 'Країни-партнери' },
  groupsGroup: { en: 'Groups', uk: 'Групи' },
  activitiesGroup: { en: 'Activities', uk: 'Заняття' },
  see: { en: 'What you see', uk: 'Що видно' },
  mind: { en: 'Keep in mind', uk: 'Зверніть увагу' },
  status: { en: '{key} · {name} · {place} · {who}', uk: '{key} · {name} · {place} · {who}' },
  kpiSleep: { en: 'asleep — {share} of the 50 years', uk: 'сну — {share} з 50 років' },
  kpiWork: { en: 'of paid work', uk: 'оплачуваної роботи' },
  kpiUnpaid: { en: 'of unpaid work (housework, care, shopping)', uk: 'неоплачуваної роботи (хатні справи, догляд, покупки)' },
  kpiFree: { en: 'of free time', uk: 'вільного часу' },
  weeksLabel: {
    en: 'Life in weeks, ages 15–64, {place}, {who}: {items}',
    uk: 'Життя в тижнях, вік 15–64, {place}, {who}: {items}',
  },
  dayLabel: { en: 'One average day, {place}, {who}: {items}', uk: 'Один середній день, {place}, {who}: {items}' },
  rankingLabel: { en: 'Activities ranked, {unit}, {place}, {who}', uk: 'Рейтинг занять, {unit}, {place}, {who}' },
  groupsLabel: { en: 'Needs, duties and free time, {place}, {who}: {items}', uk: 'Потреби, обов’язки й вільний час, {place}, {who}: {items}' },
  countriesLabel: { en: '{measure} per average day by country, {who}', uk: '{measure} за середній день у країнах, {who}' },
  genderLabel: { en: '{measure} per average day, women vs men, by country', uk: '{measure} за середній день, жінки й чоловіки, за країнами' },
  weeksUnit: { en: '{n} weeks', uk: '{n} тиж.' },
  perDay: { en: '{value} a day', uk: '{value} на день' },
  ofSpan: { en: '{value} of 50 years', uk: '{value} з 50 років' },
  shareOf: { en: '{share} of the time', uk: '{share} часу' },
  women: { en: 'Women', uk: 'Жінки' },
  men: { en: 'Men', uk: 'Чоловіки' },
  everyone: { en: 'Everyone', uk: 'Усі' },
  gap: { en: 'Women − men', uk: 'Жінки − чоловіки' },
  highlightKey: { en: 'Chosen country and OECD average', uk: 'Вибрана країна й середнє по OECD' },
  moreWomen: { en: 'Women spend more time', uk: 'Жінки витрачають більше часу' },
  tableActivities: { en: 'Time over the 50 years from 15 to 64 — {place}, {who}', uk: 'Час за 50 років від 15 до 64 — {place}, {who}' },
  tableCountries: { en: '{measure}, time per average day', uk: '{measure}, час за середній день' },
  group: { en: 'Group', uk: 'Група' },
  activity: { en: 'Activity', uk: 'Заняття' },
  colPerDay: { en: 'Per day', uk: 'На день' },
  colShare: { en: 'Share', uk: 'Частка' },
  colYears: { en: 'Years', uk: 'Роки' },
  colDays: { en: 'Days', uk: 'Дні' },
  colHours: { en: 'Hours', uk: 'Години' },
  colWeeks: { en: 'Squares (weeks)', uk: 'Квадрати (тижні)' },
  colSurvey: { en: 'Survey year', uk: 'Рік опитування' },
  colAges: { en: 'Ages', uk: 'Вік' },
  total: { en: 'Total', uk: 'Разом' },
  method: {
    en: 'How the numbers are made. OECD time-use diaries give the minutes of an average day (weekdays and weekends) for people aged 15–64. The page multiplies that day by the 50 years from the 15th to the 65th birthday (18,262 days). The OECD average is the unweighted mean of {n} member countries (author’s calculation). Sub-activities a survey does not report separately stay in “care”, “personal care” or “other leisure” of the same OECD category.',
    uk: 'Як отримано числа. Щоденники використання часу OECD дають хвилини середнього дня (будні й вихідні) для людей віком 15–64 роки. Сторінка множить цей день на 50 років від 15-го до 65-го дня народження (18 262 дні). Середнє по OECD — незважене середнє {n} країн-членів (власний розрахунок). Підзаняття, які опитування не виділяє окремо, лишаються в «догляді», «догляді за собою» чи «іншому дозвіллі» тієї ж категорії OECD.',
  },
  ageNote: {
    en: '† The survey covers a different age group: {list}. Survey years: 1998/99 (India) to 2024 (Mexico, United States).',
    uk: '† Опитування охоплює іншу вікову групу: {list}. Роки опитувань: від 1998/99 (Індія) до 2024 (Мексика, США).',
  },
  noUkraine: {
    en: 'Ukraine has no national time-use survey in the OECD database, so it cannot be shown here.',
    uk: 'України немає в базі OECD — національного опитування використання часу там немає, тож її тут не показано.',
  },
} as const;

// ── Number formats ─────────────────────────────────────────────────────────────────────────────
const cache = new Map<string, Intl.NumberFormat>();
function nf(lang: Lang, key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const id = `${lang}:${key}`;
  let f = cache.get(id);
  if (!f) {
    f = new Intl.NumberFormat(localeOf(lang), options);
    cache.set(id, f);
  }
  return f;
}

/** 17.56 → '17.6 years' / '17,6 року'. */
export function fmtYears(v: number, lang: Lang, digits = 1): string {
  return nf(lang, `y${digits}`, { style: 'unit', unit: 'year', unitDisplay: 'long', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
}
/** 6414.2 → '6,414 days' / '6414 днів'. */
export function fmtDays(v: number, lang: Lang): string {
  return nf(lang, 'd', { style: 'unit', unit: 'day', unitDisplay: 'long', maximumFractionDigits: 0 }).format(v);
}
export function fmtHours(v: number, lang: Lang): string {
  return nf(lang, 'h', { style: 'unit', unit: 'hour', unitDisplay: 'long', maximumFractionDigits: 0 }).format(v);
}
/** 0.2041 → '20.4%' / '20,4%'. */
export function fmtShare(v: number, lang: Lang): string {
  return nf(lang, 'pct', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
}
/** EN narrow ('8h 26m') is compact and clear; UK narrow ('8г 26х') is not — Ukrainian uses short ('8 год 26 хв'). */
const compact = (lang: Lang): 'narrow' | 'short' => (lang === 'en' ? 'narrow' : 'short');

/** 505.8 → '8h 26m' / '8 год 26 хв' (rounded to the minute). */
export function fmtDuration(minutes: number, lang: Lang): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  const hs = nf(lang, 'hs', { style: 'unit', unit: 'hour', unitDisplay: compact(lang) }).format(h);
  const ms = nf(lang, 'ms', { style: 'unit', unit: 'minute', unitDisplay: compact(lang) }).format(rest);
  if (h === 0) return ms;
  return rest === 0 ? hs : `${hs} ${ms}`;
}
/** Signed duration for differences: '+1 h 32 min' / '−12 min'. */
export function fmtDurationSigned(minutes: number, lang: Lang): string {
  const r = Math.round(minutes);
  if (r === 0) return fmtDuration(0, lang);
  return `${r > 0 ? '+' : '−'}${fmtDuration(Math.abs(r), lang)}`;
}
/** Axis ticks: minutes → '4 h' / '4 год'. */
export function fmtHourTick(minutes: number, lang: Lang): string {
  return nf(lang, 'ht', { style: 'unit', unit: 'hour', unitDisplay: compact(lang), maximumFractionDigits: 1 }).format(minutes / 60);
}
export function fmtNumber(v: number, lang: Lang, digits = 0): string {
  return nf(lang, `n${digits}`, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
}

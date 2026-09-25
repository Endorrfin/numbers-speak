// text.ts — the page copy of air-attacks-on-ukraine (bilingual; {placeholders} filled by the page). CHANGED (S3-aa): new.
// CHANGED (S3-aa fix): UA «подавлено» → «придушено» throughout the page (owner).
import type { Localized } from '../../catalog/types';
import type { Step } from './data';
import type { Show } from './state';

export type ShowText = { key: string; tab: Localized; intro: Localized; see: Localized; mind: Localized };

export const SHOW_TEXT: Readonly<Record<Show, ShowText>> = {
  timeline: {
    key: 'A',
    tab: { en: 'Launched and stopped', uk: 'Запущено й зупинено' },
    intro: {
      en: 'Each bar is one {step}: missiles (top) and drones (bottom) launched at Ukraine — shot down or suppressed, locationally lost, or not intercepted.',
      uk: 'Кожен стовпець — {step}: ракети (вгорі) і дрони (внизу), запущені по Україні, — збиті чи придушені, локаційно втрачені або не перехоплені.',
    },
    see: {
      en: '{scope}: {drones} drones and {missiles} missiles. Stopped: {dRate} of drones, {mRate} of missiles. The peak {step}: {peakDrones} drones ({peakWhen}).',
      uk: '{scope}: {drones} дронів і {missiles} ракет. Зупинено {dRate} дронів і {mRate} ракет. Пік — {peakDrones} дронів ({peakWhen}).',
    },
    mind: {
      en: '“Not intercepted” is not “hit a target”: it also covers weapons that fell without effect. Locationally lost drones (electronic warfare, hatched) were reported as a separate number only from July 2024 to July 2025; from August 2025 they are part of “shot down or suppressed”.',
      uk: '«Не перехоплено» — не те саме, що «влучило»: сюди входить і зброя, що впала без наслідків. Локаційно втрачені дрони (РЕБ, штрихування) подавали окремим числом лише з липня 2024 до липня 2025 року; з серпня 2025-го вони входять у «збито або придушено».',
    },
  },
  types: {
    key: 'B',
    tab: { en: 'Missiles by class', uk: 'Ракети за класами' },
    intro: {
      en: 'Missiles launched per {step}, by how they fly; below — every model named in the reports.',
      uk: 'Ракети, запущені за {step}, за способом польоту; нижче — кожна модель, названа у звітах.',
    },
    see: {
      en: '{scope}: cruise missiles are {cruiseShare} of all missiles, ballistic {ballShare}. Stopped: {cruiseRate} of cruise missiles, only {ballRate} of ballistic ones.',
      uk: '{scope}: крилаті ракети — {cruiseShare} усіх ракет, балістичні — {ballShare}. Зупинено {cruiseRate} крилатих і лише {ballRate} балістичних.',
    },
    mind: {
      en: 'The Air Force often gives one number for several models (e.g. Kh-101 and Kalibr together); the model list keeps such groups as reported. A report that mixes classes is shown in grey.',
      uk: 'Повітряні сили часто дають одне число на кілька моделей (наприклад, Х-101 і «Калібр» разом); список моделей зберігає такі групи як є. Звіт, що змішує класи, показано сірим.',
    },
  },
  interception: {
    key: 'C',
    tab: { en: 'Interception rate', uk: 'Частка перехоплених' },
    intro: {
      en: 'Share of launched weapons shot down or suppressed, per month and class. A month with fewer than {min} weapons of a class has no point.',
      uk: 'Частка запущеної зброї, яку збито або придушено, за місяць і клас. Місяць, коли зброї класу було менше {min}, точки не має.',
    },
    see: {
      en: '{scope}: drones {dRate}, cruise missiles {cRate}, ballistic {bRate}, anti-ship {aRate}.',
      uk: '{scope}: дрони — {dRate}, крилаті ракети — {cRate}, балістичні — {bRate}, протикорабельні — {aRate}.',
    },
    mind: {
      en: 'One measure on purpose — shot down, suppressed and locationally lost together — because the Air Force changed how it splits them. Counts without a number launched (from 10 August 2026) or without a number destroyed are left out.',
      uk: 'Один показник свідомо — збито, придушено й локаційно втрачено разом, — бо Повітряні сили змінювали, як їх розділяють. Звіти без кількості запущених (з 10 серпня 2026) або без кількості знищених не враховано.',
    },
  },
  largest: {
    key: 'D',
    tab: { en: 'Largest attacks', uk: 'Наймасованіші атаки' },
    intro: {
      en: 'The {n} largest single reports {scope}, by {rank}. One report is one Air Force post, usually one night.',
      uk: '{n} наймасованіших атак за окремими звітами {scope}, за показником «{rank}». Один звіт — одне повідомлення Повітряних сил, зазвичай одна ніч.',
    },
    see: {
      en: 'The largest: {date} — {total} ({drones} drones, {missiles} missiles); {down} shot down or suppressed.',
      uk: 'Наймасованіша: {date} — {total} ({drones} дронів, {missiles} ракет); збито або придушено {down}.',
    },
    mind: {
      en: 'Numbers are per report, not per calendar day: a long night can be split over two posts, and a daytime attack gets its own report.',
      uk: 'Числа — за звітами, а не за календарними добами: довгу ніч іноді розбито на два повідомлення, а денна атака має окремий звіт.',
    },
  },
  civilians: {
    key: 'E',
    tab: { en: 'Civilians', uk: 'Цивільні' },
    intro: {
      en: 'Civilians killed and injured in Ukraine per year, as verified by the UN Human Rights Monitoring Mission (HRMMU), and the part caused by long-range missiles and drones where HRMMU publishes it.',
      uk: 'Цивільні, загиблі й поранені в Україні за рік, за верифікованими даними Моніторингової місії ООН з прав людини (HRMMU), і частка далекобійних ракет і дронів — там, де HRMMU її публікує.',
    },
    see: {
      en: 'Long-range strikes caused {lr25} of civilian casualties in 2025 and {lr26} in January–August 2026 — about {ph25} and {ph26} people killed or injured per 100 long-range weapons launched.',
      uk: 'Далекобійні удари спричинили {lr25} цивільних жертв у 2025 році і {lr26} у січні–серпні 2026-го — приблизно {ph25} і {ph26} загиблих чи поранених на 100 запущених ракет і дронів.',
    },
    mind: {
      en: 'HRMMU counts only verified cases, so these are lower bounds. For 2023 no breakdown by weapon is published as annual numbers, for 2024 only short-range drones; 2026 (*) is January–August, its breakdown the sum of the monthly updates. Casualties per 100 weapons set two sources side by side — a scale, not a measured rate.',
      uk: 'HRMMU рахує лише верифіковані випадки, тож це нижня межа. Для 2023 року розбивку за зброєю річними числами не опубліковано, для 2024-го — лише дрони малої дальності; 2026 (*) — січень–серпень, розбивка — сума щомісячних оновлень. «Жертв на 100 запущених» ставить поруч два джерела — це масштаб, а не виміряна ймовірність.',
    },
  },
  calendar: { // CHANGED (S3-aa3): new
    key: 'F',
    tab: { en: 'Calendar', uk: 'Календар' },
    intro: {
      en: 'Every day since the invasion, one square per day, shaded by how many {rank} were launched that day — a quantile scale, so an ordinary day and a record night stay visually apart.',
      uk: 'Кожна доба з початку вторгнення, один квадрат на добу, за інтенсивністю запусків ({rank}) того дня — квантильна шкала, тож звичайний день і рекордна ніч виразно відрізняються.',
    },
    see: {
      en: '{scope}: the darkest squares mark the heaviest days by {rank} in this view; hover a square or use the table for the exact count.',
      uk: '{scope}: найтемніші клітинки — найважчі дні за показником «{rank}» у цьому вікні; точні числа — під курсором або в таблиці.',
    },
    mind: {
      en: 'Colour bands are quantiles of the period shown, not fixed counts — the same shade means “one of the busiest days in this view,” not the same absolute number across different years or periods.',
      uk: 'Кольорові смуги — квантилі показаного періоду, а не фіксовані числа: однаковий відтінок означає «один із найактивніших днів у цьому вікні», а не однакове число в різних періодах.',
    },
  },
};

export const STEP_WORD: Readonly<Record<Step, Localized>> = {
  month: { en: 'month', uk: 'місяць' },
  week: { en: 'week', uk: 'тиждень' },
  day: { en: 'day', uk: 'добу' },
};

export const txt = {
  headline: { en: 'Key numbers', uk: 'Головні числа' },
  angle: { en: 'Angle', uk: 'Погляд' },
  see: { en: 'What you see', uk: 'Що видно' },
  mind: { en: 'Keep in mind', uk: 'Зверніть увагу' },
  period: { en: 'Period', uk: 'Період' },
  allYears: { en: 'All', uk: 'Усі роки' },
  step: { en: 'Step', uk: 'Крок' },
  stepLabel: { month: { en: 'Month', uk: 'Місяць' }, week: { en: 'Week', uk: 'Тиждень' }, day: { en: 'Day', uk: 'Доба' } },
  mode: { en: 'Show', uk: 'Показати' },
  modeLabel: { count: { en: 'Count', uk: 'Кількість' }, share: { en: 'Share', uk: 'Частка' } },
  rank: { en: 'Rank by', uk: 'Упорядкувати' },
  rankLabel: { total: { en: 'All weapons', uk: 'Уся зброя' }, missiles: { en: 'Missiles', uk: 'Ракети' }, drones: { en: 'Drones', uk: 'Дрони' } },
  who: { en: 'People', uk: 'Люди' },
  whoLabel: { all: { en: 'Killed and injured', uk: 'Загиблі й поранені' }, killed: { en: 'Killed', uk: 'Загиблі' }, injured: { en: 'Injured', uk: 'Поранені' } },
  scopeAll: { en: '{from} – {to}', uk: '{from} – {to}' },
  scopeYear: { en: 'In {year}', uk: 'У {year} році' },
  scopeYearLc: { en: 'in {year}', uk: 'у {year} році' },
  scopeAllLc: { en: 'since {from}', uk: 'з {from}' },
  kpiDrones: { en: 'Shahed-type and decoy drones launched', uk: 'дронів типу Shahed та імітаторів запущено' },
  kpiMissiles: { en: 'missiles launched', uk: 'ракет запущено' },
  kpiDronesRate: { en: 'of drones shot down or suppressed', uk: 'дронів збито або придушено' },
  kpiMissilesRate: { en: 'of missiles shot down or suppressed', uk: 'ракет збито або придушено' },
  kpiLargest: { en: 'weapons in the largest attack, {date}', uk: 'одиниць зброї в наймасованішій атаці, {date}' },
  status: { en: '{key} · {name} · {scope}', uk: '{key} · {name} · {scope}' },
  byStep: { en: ' · per {step}', uk: ' · за {step}' },
  models: { en: 'Missiles by model {scope}', uk: 'Ракети за моделями {scope}' },
  modelsMore: { en: 'Top {n} of {all}; the table lists every model.', uk: 'Перші {n} з {all}; таблиця містить усі моделі.' },
  noData: { en: 'No reports in this period.', uk: 'За цей період звітів немає.' },
  methodTitle: { en: 'How the numbers are counted', uk: 'Як пораховано числа' },
  method1: {
    en: 'Source: the Air Force’s reports as compiled by Petro Ivaniuk (Kaggle, CC BY‑NC‑SA 4.0). Only national reports are counted — the regional commands’ reports overlap them — and only long-range weapons: missiles and Shahed-type drones with decoys. Tactical and reconnaissance drones and guided bombs are not included.',
    uk: 'Джерело: звіти Повітряних сил у зведенні Петра Іванюка (Kaggle, CC BY‑NC‑SA 4.0). Враховано лише загальнонаціональні звіти — звіти регіональних командувань їх дублюють — і лише далекобійну зброю: ракети й дрони типу Shahed з імітаторами. Тактичні й розвідувальні дрони та керовані авіабомби не враховано.',
  },
  method2: {
    en: 'A report belongs to the day the attack ended (the morning report). From {hidden} the number launched is withheld for some missile types (shaded band, *): those counts are lower bounds and stay out of interception rates. Data: {first} – {last}; a bar that covers only part of its period is lighter.',
    uk: 'Звіт належить до дня, коли атака закінчилася (ранковий звіт). З {hidden} кількість запущених ракет деяких типів не повідомляють (тонована смуга, *): ці числа — нижня межа і не входять у частку перехоплених. Дані: {first} – {last}; стовпець, що охоплює лише частину свого періоду, світліший.',
  },
  tPeriod: { en: 'Period', uk: 'Період' },
  tMissiles: { en: 'Missiles', uk: 'Ракети' },
  tDrones: { en: 'Drones', uk: 'Дрони' },
  tStopped: { en: 'stopped', uk: 'зупинено' },
  tThrough: { en: 'not intercepted', uk: 'не перехоплено' },
  tModel: { en: 'Model', uk: 'Модель' },
  tClass: { en: 'Class', uk: 'Клас' },
  tLaunched: { en: 'Launched', uk: 'Запущено' },
  tShare: { en: 'Share of missiles', uk: 'Частка ракет' },
  tRank: { en: '#', uk: '№' },
  tDate: { en: 'Date', uk: 'Дата' },
  tWindow: { en: 'Time (Kyiv)', uk: 'Час (Київ)' },
  tTotal: { en: 'Total', uk: 'Разом' },
  tStoppedPct: { en: 'Shot down or suppressed', uk: 'Збито або придушено' },
  tYear: { en: 'Year', uk: 'Рік' },
  tAll: { en: 'All years', uk: 'Усі роки' },
  tKilled: { en: 'Killed', uk: 'Загиблі' },
  tInjured: { en: 'Injured', uk: 'Поранені' },
  tLongRange: { en: 'Long-range weapons', uk: 'Далекобійна зброя' },
  tShort: { en: 'Short-range drones', uk: 'Дрони малої дальності' },
  tLaunchedAf: { en: 'Long-range weapons launched (Air Force)', uk: 'Запущено ракет і дронів (ПС)' },
  tPerHundred: { en: 'Casualties per 100 launched', uk: 'Жертв на 100 запущених' },
  notPublished: { en: 'not published', uk: 'не опубліковано' },
  capTimeline: { en: 'Missiles and drones launched per {step} {scope}', uk: 'Ракети й дрони, запущені за {step}, {scope}' },
  capModels: { en: 'Missiles by model {scope}', uk: 'Ракети за моделями {scope}' },
  capRates: {
    en: 'Share shot down or suppressed, by class and year (weapons counted in brackets)',
    uk: 'Частка збитих або придушених за класом і роком (у дужках — скільки зброї враховано)',
  },
  capLargest: { en: 'The {n} largest attacks {scope}', uk: '{n} наймасованіших атак {scope}' },
  capCivilians: { en: 'Civilian casualties in Ukraine (HRMMU) and long-range weapons launched', uk: 'Цивільні жертви в Україні (HRMMU) і запущені ракети й дрони' },
  labelTimeline: {
    en: 'Stacked bars in two panels: missiles and drones launched per {step} {scope}, split into shot down or suppressed, locationally lost and not intercepted.',
    uk: 'Складені стовпці у двох панелях: ракети й дрони, запущені за {step} {scope}, поділені на збиті чи придушені, локаційно втрачені й неперехоплені.',
  },
  labelTypes: { en: 'Stacked bars: missiles launched per {step} by class {scope}.', uk: 'Складені стовпці: ракети, запущені за {step}, за класами {scope}.' },
  labelModels: { en: 'Bars: missiles launched by model {scope}.', uk: 'Стовпці: запущені ракети за моделями {scope}.' },
  labelRates: { en: 'Lines: share of launched weapons shot down or suppressed per month, by class, {scope}.', uk: 'Лінії: частка збитих або придушених за місяць за класами {scope}.' },
  labelLargest: { en: 'Bars: the {n} largest attacks {scope}, by {rank}.', uk: 'Стовпці: {n} наймасованіших атак {scope}, за показником «{rank}».' },
  labelCivilians: {
    en: 'Stacked bars: civilians {who} per year, 2023–2026, by weapon where published.',
    uk: 'Складені стовпці: цивільні ({who}) за рік, 2023–2026, за зброєю, де опубліковано.',
  },
  capCalendar: { en: 'Weapons launched per day, by {rank} {scope}', uk: 'Зброя, запущена за добу, за показником «{rank}» {scope}' }, // CHANGED (S3-aa3): new
  labelCalendar: {
    en: 'Calendar heatmap: one square per day, shaded by {rank} launched, {scope}.',
    uk: 'Теплова карта: один квадрат на добу, колір — запущено ({rank}), {scope}.',
  },
} as const;

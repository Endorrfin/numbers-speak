// text.ts — CHANGED (S3-ai1): the AI-models page's shared words (angle tabs, intros, the rule, credits, legends).
// Each angle keeps its own strings next to its markup; only what two or more angles use lives here.
// Wording rule (docs/AI-MODELS-PLAN.md §2, conflict of interest): sentences state counts and dates from the data, never
// a judgement of a company or a model.
import type { Localized } from '../../catalog/types';
import type { Access, Origin } from './data';
import type { Show } from './state';

export const txt = {
  angle: { en: 'Angle', uk: 'Погляд' },
  angles: { en: 'Angles on the data', uk: 'Погляди на дані' },
  company: { en: 'Highlight', uk: 'Виділити' },
  none: { en: 'None', uk: 'Нікого' },
  keyFigures: { en: 'Key figures', uk: 'Головні числа' },
  legend: { en: 'Legend', uk: 'Легенда' },
  colModel: { en: 'Model', uk: 'Модель' },
  colCompany: { en: 'Company', uk: 'Компанія' },
  colDate: { en: 'Published', uk: 'Опубліковано' },
  colWeights: { en: 'Weights', uk: 'Ваги' },
  // CHANGED (S3-ai2)
  colFrom: { en: 'From', uk: 'Від' },
  colTo: { en: 'To', uk: 'До' },
  colDays: { en: 'Days', uk: 'Днів' },
  colSource: { en: 'Source', uk: 'Джерело' },
  // CHANGED (S3-ai3)
  factsTitle: { en: 'Did you know', uk: 'Цікаво' },
  creditArena: {
    en: 'Data: LMArena leaderboard-dataset (CC BY 4.0), text leaderboard, overall; read {retrieved}.',
    uk: 'Дані: LMArena leaderboard-dataset (CC BY 4.0), текстовий рейтинг, overall; прочитано {retrieved}.',
  },
  creditEpoch: {
    en: 'Data: Epoch AI, “Data on AI models” (CC BY 4.0), updated {updated}, downloaded {retrieved}.',
    uk: 'Дані: Epoch AI, «Data on AI models» (CC BY 4.0), оновлено {updated}, завантажено {retrieved}.',
  },
  ruleTitle: { en: 'Why these eight companies', uk: 'Чому саме ці вісім компаній' },
  rule: {
    en: 'Not chosen by hand. A company is here if one of its models spent at least {days} days in the top 3 of the LMArena text leaderboard ({from} – {to}), or if at least {derived} models in Epoch AI’s database descend from its models. Exactly eight pass. The closest outside: {t3name} (days in the top 3: {t3days}) and {dname} (models built on its models: {dmodels}).',
    uk: 'Не вибрані вручну. Компанія тут, якщо її модель була в першій трійці текстового рейтингу LMArena щонайменше {days} днів ({from} – {to}) або якщо від її моделей у базі Epoch AI походить щонайменше {derived} моделей. Проходять рівно вісім. Найближчі поза списком: {t3name} (днів у трійці: {t3days}) і {dname} (моделей на основі її моделей: {dmodels}).',
  },
  ruleRow: {
    en: '{name}: days in the top 3 — {days} · models built on its models — {derived} (by other organizations — {orgs})',
    uk: '{name}: днів у трійці — {days} · моделей на основі її моделей — {derived} (інших організацій-розробників — {orgs})',
  },
} as const satisfies Record<string, Localized>;

/** A sentence that ends in an abbreviated date ("30 вер. 2026 р.") gets no second full stop. CHANGED (S3-ai4): moved here
 * from common.tsx so that angle G can use it (a .tsx file exports components only — React Fast Refresh). */
export const oneStop = (text: string): string => text.replace(/\.\.$/, '.');

export const ACCESS_TEXT: Record<Access, Localized> = {
  open: { en: 'Open weights', uk: 'Відкриті ваги' },
  closed: { en: 'Closed (API, product or unreleased)', uk: 'Закриті (API, продукт або не випущено)' },
  unknown: { en: 'Not recorded', uk: 'Не зазначено' },
};

export const ORIGIN_TEXT: Record<Origin, Localized> = {
  us: { en: 'United States', uk: 'США' },
  cn: { en: 'China', uk: 'Китай' },
  other: { en: 'Other countries', uk: 'Інші країни' },
};

export const SHOW_TEXT: Record<Show, { key: string; tab: Localized; intro: Localized }> = {
  timeline: {
    key: 'A',
    tab: { en: 'Timeline', uk: 'Хронологія' },
    intro: {
      en: 'Every language and multimodal model of eight companies in Epoch AI’s database since 2017: one lane per company, in the order of its first model. Drag on the strip under the chart to pick a period.',
      uk: 'Кожна мовна й мультимодальна модель восьми компаній у базі Epoch AI з 2017 року: одна доріжка — одна компанія, за датою її першої моделі. Протягніть на смузі під графіком, щоб вибрати період.',
    },
  },
  scale: {
    key: 'B',
    tab: { en: 'Scale', uk: 'Масштаб' },
    intro: {
      en: 'How much computing went into training each model, in floating-point operations (FLOP) on a logarithmic scale — every model since 2017 for which Epoch AI has a figure.',
      uk: 'Скільки обчислень пішло на навчання кожної моделі, в операціях з рухомою комою (FLOP) на логарифмічній шкалі, — кожна модель з 2017 року, для якої Epoch AI має число.',
    },
  },
  // CHANGED (S3-ai2): angles C · D · E.
  arena: {
    key: 'C',
    tab: { en: 'No. 1 on LMArena', uk: '№1 на LMArena' },
    intro: {
      en: 'Which company had the top model on the LMArena text leaderboard, day by day since December 2023 — the board where people compare two anonymous answers and vote for the better one.',
      uk: 'Чия модель була першою в текстовому рейтингу LMArena, день за днем з грудня 2023 року, — на дошці, де люди порівнюють дві анонімні відповіді й голосують за кращу.',
    },
  },
  users: {
    key: 'D',
    tab: { en: 'Users', uk: 'Користувачі' },
    intro: {
      en: 'User counts the companies published themselves — on their own pages, in earnings calls and in filings. Each company counts differently, so the shape of a point says what was counted, and lines join only the same product and the same measure.',
      uk: 'Кількість користувачів, яку компанії опублікували самі, — на своїх сторінках, у звітах інвесторам і в документах для регулятора. Кожна компанія рахує по-своєму, тож форма точки каже, що саме пораховано, а лінія з’єднує лише той самий продукт і ту саму міру.',
    },
  },
  lineage: {
    key: 'E',
    tab: { en: 'Built on', uk: 'Родовід' },
    intro: {
      en: 'How many models in Epoch AI’s database were built on each company’s models — fine-tuned, distilled or extended — and by how many other organizations. Open a row to see the family tree.',
      uk: 'Скільки моделей у базі Epoch AI побудовано на моделях кожної компанії — донавчених, дистильованих чи розширених, — і скільки інших організацій їх створили. Розгорніть рядок, щоб побачити родовід.',
    },
  },
  origins: {
    key: 'F',
    tab: { en: 'Who and where', uk: 'Хто й звідки' },
    intro: {
      en: 'Language and multimodal models Epoch AI recorded each year, by the developer’s country or by whether the weights are published.',
      uk: 'Мовні й мультимодальні моделі, які Epoch AI записав за кожен рік, — за країною розробника або за тим, чи опубліковано ваги.',
    },
  },
  // CHANGED (S3-ai4)
  day: {
    key: 'G',
    tab: { en: 'Then and now', uk: 'Тоді й тепер' },
    intro: {
      en: 'Pick a day: what the data showed then, next to the latest figure of each file — No. 1 on LMArena, the eight companies’ models, the largest training run and the companies’ own user counts.',
      uk: 'Оберіть день: що показували дані тоді, поруч з останнім числом кожного файлу, — №1 на LMArena, моделі восьми компаній, найбільше навчання і числа користувачів від самих компаній.',
    },
  },
};

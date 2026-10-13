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
  origins: {
    key: 'F',
    tab: { en: 'Who and where', uk: 'Хто й звідки' },
    intro: {
      en: 'Language and multimodal models Epoch AI recorded each year, by the developer’s country or by whether the weights are published.',
      uk: 'Мовні й мультимодальні моделі, які Epoch AI записав за кожен рік, — за країною розробника або за тим, чи опубліковано ваги.',
    },
  },
};

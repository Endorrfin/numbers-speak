// src/catalog/rubrics.ts — tab and facet labels (bilingual). Technical terms stay English.
import type { ChartKind, Geo, Localized, RubricId } from './types';

export type RubricDef = { id: RubricId; icon: string; title: Localized; lede: Localized };

// Icons avoid flag emoji: Windows renders them as two letters.
export const RUBRICS: readonly RubricDef[] = [
  {
    id: 'ukraine',
    icon: '🌻',
    title: { en: 'Ukraine', uk: 'Україна' },
    // CHANGED (S3-bd): demography joins the tab (births-deaths-ua).
    lede: {
      en: 'War, demography, volunteering, cities and companies — Ukraine in numbers.',
      uk: 'Війна, демографія, волонтерство, міста й компанії — Україна в цифрах.',
    },
  },
  {
    id: 'world',
    icon: '🌍',
    title: { en: 'World & people', uk: 'Світ і люди' },
    lede: {
      en: 'Population, births and land — how the world is arranged.',
      uk: 'Населення, народжуваність і територія — як улаштований світ.',
    },
  },
  {
    id: 'economy',
    icon: '💰',
    title: { en: 'Economy & business', uk: 'Економіка й бізнес' },
    lede: {
      en: 'GDP, automation, property and brands.',
      uk: 'ВВП, автоматизація, нерухомість і бренди.',
    },
  },
  {
    id: 'security',
    icon: '🛡️',
    title: { en: 'Security & peace', uk: 'Безпека й мир' },
    lede: {
      en: 'Crime, peace and violence — measured, not guessed.',
      uk: 'Злочинність, мир і насильство — виміряні, а не вгадані.',
    },
  },
  {
    id: 'knowledge',
    icon: '📚',
    title: { en: 'Knowledge & life', uk: 'Знання й життя' },
    lede: {
      en: 'Books, time, alphabets and hierarchies.',
      uk: 'Книги, час, абетки та ієрархії.',
    },
  },
];

export const CHART_LABELS: Readonly<Record<ChartKind, Localized>> = {
  'ranked-bar': { en: 'Ranking bars', uk: 'Рейтингові стовпці' },
  'bar-race': { en: 'Bar chart race', uk: 'Перегони стовпців' },
  tree: { en: 'Tree', uk: 'Дерево' },
  line: { en: 'Line chart', uk: 'Лінійний графік' },
  combo: { en: 'Bars + lines', uk: 'Стовпці + лінії' },
  bar: { en: 'Bar chart', uk: 'Стовпчикова діаграма' },
  'grouped-bar': { en: 'Grouped bars', uk: 'Згруповані стовпці' },
  pyramid: { en: 'Population pyramid', uk: 'Вікова піраміда' },
  donut: { en: 'Donut chart', uk: 'Кільцева діаграма' },
  lollipop: { en: 'Lollipop chart', uk: 'Lollipop‑діаграма' },
  map: { en: 'Animated map', uk: 'Анімована мапа' },
  waffle: { en: 'Unit grid', uk: 'Сітка одиниць' }, // CHANGED (S3-tl)
};

export const GEO_LABELS: Readonly<Record<Geo, Localized>> = {
  ukraine: { en: 'Ukraine', uk: 'Україна' },
  world: { en: 'World', uk: 'Світ' },
  usa: { en: 'USA', uk: 'США' },
  iceland: { en: 'Iceland', uk: 'Ісландія' },
  none: { en: 'Not geographic', uk: 'Без географії' },
};

export function getRubric(id: RubricId): RubricDef {
  const found = RUBRICS.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown rubric: ${id}`);
  return found;
}

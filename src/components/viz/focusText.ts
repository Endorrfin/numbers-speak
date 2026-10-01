// focusText.ts — CHANGED (S3-uf): words of the Finder, the focus picker and the country focus. Kept out of
// i18n/ui.ts (part of the initial chunk) — only pages with a Finder load them.
import type { Localized } from '../../catalog/types';

export const focusText = {
  findButton: { en: '{name} · #{rank}', uk: '{name} · №{rank}' },
  findTitle: { en: 'Go to the row of {name}', uk: 'Перейти до рядка «{name}»' },
  notListed: { en: '{name}: not in this list', uk: '{name}: немає в цьому списку' },
  add: { en: 'Add', uk: 'Додати' },
  clear: { en: 'Clear', uk: 'Очистити' },
  focusLabel: { en: 'Highlight countries', uk: 'Виділити країни' },
  focusHint: { en: 'up to {n}', uk: 'до {n}' },
  focusPlaceholder: { en: 'Country name…', uk: 'Назва країни…' }, // fits a 360 px phone
  focusRemove: { en: 'Remove {name}', uk: 'Прибрати: {name}' },
  focusNotFound: {
    en: 'No country “{q}” in this list — pick one of the suggestions.',
    uk: 'Країни «{q}» немає в цьому списку — виберіть із підказок.',
  },
  focusFull: { en: 'Up to {n} countries — remove one first.', uk: 'До {n} країн — спершу приберіть одну.' },
  focusAlready: { en: '{name} is already highlighted.', uk: '{name}: уже виділено.' },
  focusNone: { en: 'No highlighted countries.', uk: 'Немає виділених країн.' },
  focusChips: { en: 'Highlighted countries', uk: 'Виділені країни' },
  focusPresets: { en: 'Sets', uk: 'Набори' },
  focusPresetUa: { en: 'Ukraine', uk: 'Україна' },
  focusFinder: { en: 'In this ranking of {total}:', uk: 'У цьому рейтингу з {total}:' },
  focusKpi: { en: '{name}: rank {rank} of {total}', uk: '{name}: місце {rank} з {total}' },
} satisfies Record<string, Localized>;

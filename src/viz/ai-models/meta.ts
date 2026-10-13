import { defineViz } from '../../catalog/types';

// CHANGED (S3-ai1): new entry (CATALOG #34, plan docs/AI-MODELS-PLAN.md). Draft until S3-ai2 adds angles C · D · E, the
// card preview and the CHANGELOG line. Eight companies by a rule computed from the data (≥ 30 days in the LMArena top 3,
// or ≥ 100 Epoch models built on theirs), never chosen by hand. See data-raw/ai-models/README.md.
export default defineViz({
  id: 'ai-models',
  title: { en: 'AI models, 2017–2026', uk: 'AI-моделі, 2017–2026' },
  subtitle: {
    en: 'Who released what and when, how much computing went into training, and where the models come from — eight companies chosen by a rule, not by taste',
    uk: 'Хто що випустив і коли, скільки обчислень пішло на навчання і звідки моделі — вісім компаній за правилом, а не на смак',
  },
  description: {
    en: 'Three angles on AI models since 2017. A — every language and multimodal model of eight companies on a timeline, one lane per company; drag on the overview strip to pick a period. B — the computing used to train each of 1,242 models, in floating-point operations on a logarithmic scale, with the trend; zoom into the crowded corner of recent years. F — how many models were recorded each year by the developer’s country, and how many published their weights.\n\nThe eight companies are not picked by hand: a company is here if one of its models spent at least 30 days in the top 3 of the LMArena text leaderboard (December 2023 – October 2026) or if at least 100 models in Epoch AI’s database descend from its models. Model data come from Epoch AI’s “Data on AI models”, which records models from papers, announcements and model cards; recent months are still being added, so the last year is partial and marked.',
    uk: 'Три погляди на AI-моделі з 2017 року. A — кожна мовна й мультимодальна модель восьми компаній на часовій шкалі, по доріжці на компанію; протягніть на смузі огляду, щоб вибрати період. B — обчислення на навчання кожної з 1 242 моделей, в операціях з рухомою комою на логарифмічній шкалі, з трендом; наблизьте тісний кут останніх років. F — скільки моделей записано за кожен рік за країною розробника і скільки з них мають відкриті ваги.\n\nВісім компаній не вибрані вручну: компанія тут, якщо її модель була в першій трійці текстового рейтингу LMArena щонайменше 30 днів (грудень 2023 – жовтень 2026) або якщо від її моделей у базі Epoch AI походить щонайменше 100 моделей. Дані про моделі — «Data on AI models» від Epoch AI, яка збирає моделі зі статей, анонсів і карток моделей; останні місяці ще доповнюються, тож останній рік неповний і позначений.',
  },
  rubrics: ['knowledge', 'world'],
  chart: 'timeline',
  geo: 'world',
  period: { from: 2017, to: 2026 },
  tags: [
    'ai',
    'artificial intelligence',
    'llm',
    'language models',
    'chatbots',
    'machine learning',
    'compute',
    'flop',
    'open weights',
    'openai',
    'google',
    'anthropic',
    'meta',
    'deepseek',
    'alibaba',
    'mistral',
    'xai',
    'ші',
    'штучний інтелект',
    'мовні моделі',
  ],
  sources: [
    {
      title: 'Epoch AI — Data on AI models, all_ai_models.csv (CC BY 4.0; updated 8 Oct 2026): models, organizations, dates, domains, countries, access, training compute, base models',
      url: 'https://epoch.ai/data/ai-models',
      retrieved: '2026-10-13',
    },
    {
      title: 'LMArena — leaderboard-dataset (CC BY 4.0): text leaderboard, category overall, snapshots 6 Dec 2023 – 8 Oct 2026 (raw board to 15 May 2025, style control after)',
      url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
      retrieved: '2026-10-13',
    },
  ],
  origin: { kind: 'original' },
  data: ['releases.json', 'compute.json', 'origins.json', 'arena.json'],
  // "See also" — the author's picks, in this order.
  related: ['robotization', 'global-brands-race', 'electricity'],
  status: 'draft',
  added: '2026-10-13',
  updated: '2026-10-13',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-time', 'd3-array', 'd3-brush', 'd3-zoom', 'd3-drag', 'd3-transition', 'd3-interpolate'],
});

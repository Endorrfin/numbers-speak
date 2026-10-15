import { defineViz } from '../../catalog/types';

// CHANGED (S3-ai1): new entry (CATALOG #34, plan docs/AI-MODELS-PLAN.md). CHANGED (S3-ai2): angles C · D · E, the card
// preview and the CHANGELOG line; published. Eight companies by a rule computed from the data (≥ 30 days in the LMArena top 3,
// or ≥ 100 Epoch models built on theirs), never chosen by hand. See data-raw/ai-models/README.md.
// CHANGED (S3-ai3): a headline sentence and "Did you know" facts on every angle, events on the timeline; two sources more.
export default defineViz({
  id: 'ai-models',
  title: { en: 'AI models, 2017–2026', uk: 'AI-моделі, 2017–2026' },
  subtitle: {
    en: 'Who released what and when, how much computing went into training, who led the leaderboard, how many people use them and who builds on whose models — eight companies chosen by a rule, not by taste',
    uk: 'Хто що випустив і коли, скільки обчислень пішло на навчання, хто очолював рейтинг, скільки людей ними користується і хто будує на чиїх моделях — вісім компаній за правилом, а не на смак',
  },
  description: {
    en: 'Six angles on AI models since 2017. A — every language and multimodal model of eight companies on a timeline, one lane per company; drag on the overview strip to pick a period. B — the computing used to train each of 1,242 models, in floating-point operations on a logarithmic scale, with the trend (×4.7 a year); zoom into the crowded corner of recent years. C — which company had the No. 1 model on the LMArena text leaderboard, day by day from December 2023: 32 runs, five companies. D — user counts the companies published themselves, each with its source and its own measure (weekly, monthly, inside other apps), never joined across measures. E — how many models were built on each company’s models and by how many other organizations, with a family tree. F — how many models were recorded each year by the developer’s country, and how many published their weights.\n\nThe eight companies are not picked by hand: a company is here if one of its models spent at least 30 days in the top 3 of the LMArena text leaderboard (December 2023 – October 2026) or if at least 100 models in Epoch AI’s database descend from its models. Model data come from Epoch AI’s “Data on AI models”, which records models from papers, announcements and model cards; recent months are still being added, so the last year is partial and marked. User counts come only from the companies’ own posts, earnings remarks and filings; Anthropic, DeepSeek and Alibaba publish none, and none was found for Mistral.\n\nEach angle opens with one sentence that says what the current view shows and closes with a few facts — every number computed from the same files, so they change with the data. The timeline marks ChatGPT’s launch (OpenAI’s announcement) and the first day each company’s model was No. 1 on LMArena. The comparison with the world’s population uses the UN figure from the gallery’s “Population by country” entry.',
    uk: 'Шість поглядів на AI-моделі з 2017 року. A — кожна мовна й мультимодальна модель восьми компаній на часовій шкалі, по доріжці на компанію; протягніть на смузі огляду, щоб вибрати період. B — обчислення на навчання кожної з 1 242 моделей, в операціях з рухомою комою на логарифмічній шкалі, з трендом (×4,7 на рік); наблизьте тісний кут останніх років. C — чия модель була №1 у текстовому рейтингу LMArena, день за днем з грудня 2023: 32 серії, п’ять компаній. D — кількість користувачів, яку опублікували самі компанії, кожна з джерелом і своєю мірою (за тиждень, за місяць, усередині інших застосунків), без поєднання різних мір. E — скільки моделей побудовано на моделях кожної компанії і скільки інших організацій їх створили, з деревом родоводу. F — скільки моделей записано за кожен рік за країною розробника і скільки з них мають відкриті ваги.\n\nВісім компаній не вибрані вручну: компанія тут, якщо її модель була в першій трійці текстового рейтингу LMArena щонайменше 30 днів (грудень 2023 – жовтень 2026) або якщо від її моделей у базі Epoch AI походить щонайменше 100 моделей. Дані про моделі — «Data on AI models» від Epoch AI, яка збирає моделі зі статей, анонсів і карток моделей; останні місяці ще доповнюються, тож останній рік неповний і позначений. Кількість користувачів — лише з дописів, звітів інвесторам і документів самих компаній; Anthropic, DeepSeek і Alibaba таких чисел не публікують, для Mistral їх не знайдено.\n\nКожен погляд починається одним реченням про те, що показує поточний вигляд, і закінчується кількома фактами — усі числа пораховано з тих самих файлів, тож вони змінюються разом із даними. На хронології позначено запуск ChatGPT (оголошення OpenAI) і перший день, коли модель кожної компанії була №1 у LMArena. Порівняння з населенням світу — за числом ООН із запису галереї «Населення країн».',
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
    'lmarena',
    'chatgpt',
    'gemini',
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
    // CHANGED (S3-ai2): angle D — first-party user counts (one link per figure in the page's table).
    {
      title: 'OpenAI — posts on openai.com with ChatGPT weekly users (2 Oct 2024 – 7 Oct 2026)',
      url: 'https://openai.com/index/gpt-6-for-everyone/',
      retrieved: '2026-10-13',
    },
    {
      title: 'Google — I/O 2025 keynote and Alphabet earnings remarks: Gemini app monthly active users (May 2025 – Jul 2026)',
      url: 'https://blog.google/company-news/inside-google/message-ceo/alphabet-earnings-q2-2026/',
      retrieved: '2026-10-13',
    },
    {
      title: 'Meta — earnings call transcripts: Meta AI monthly actives across Meta’s apps (Q3 2024 – Q3 2025)',
      url: 'https://s21.q4cdn.com/399680738/files/doc_financials/2025/q3/META-Q3-2025-Earnings-Call-Transcript.pdf',
      retrieved: '2026-10-13',
    },
    {
      title: 'Microsoft — FY2026 Q1 earnings: monthly active users of the Copilot family',
      url: 'https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q1',
      retrieved: '2026-10-13',
    },
    {
      title: 'SpaceX — Form S-1 (SEC EDGAR): monthly users of Grok’s AI features as of 31 Mar 2026',
      url: 'https://www.sec.gov/Archives/edgar/data/1181412/000162828026036936/spaceexplorationtechnologi.htm',
      retrieved: '2026-10-13',
    },
    // CHANGED (S3-ai3): the timeline's one hand-entered event and the population behind "1 in N people".
    {
      title: 'OpenAI — “Introducing ChatGPT” (30 Nov 2022): the launch marked on the timeline',
      url: 'https://openai.com/index/chatgpt/',
      retrieved: '2026-10-15',
    },
    {
      title: 'UN DESA — World Population Prospects 2024, world population on 1 July 2025 (via the gallery’s “Population by country”)',
      url: 'https://population.un.org/wpp/',
      retrieved: '2026-09-24',
    },
  ],
  origin: { kind: 'original' },
  data: ['releases.json', 'compute.json', 'origins.json', 'arena.json', 'claims.json', 'lineage.json'],
  // "See also" — the author's picks, in this order.
  related: ['robotization', 'global-brands-race', 'electricity'],
  status: 'published',
  added: '2026-10-13',
  updated: '2026-10-15',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-time', 'd3-array', 'd3-brush', 'd3-zoom', 'd3-drag', 'd3-hierarchy', 'd3-transition', 'd3-interpolate'],
});

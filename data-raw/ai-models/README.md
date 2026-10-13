data-raw / ai-models

CHANGED (S3-ai0, 2026-10-13). Entry #34 `ai-models` — data audit in S3-ai0; `prep.ts` + `raw.ts` in S3-ai1
(`npm run prep -- ai-models` → `public/data/ai-models/`: releases, compute, origins, arena).
Plan, angles and decisions: `docs/AI-MODELS-PLAN.md`.

| File | What |
|---|---|
| `epoch-models.csv` | Epoch AI, *Data on AI models*, `all_ai_models.csv`: models published since 2017-01-01 (3,131 of 3,626), 11 columns — model, organization, date, domain, country, access, parameters, training FLOP, confidence, base model, link. Values verbatim. By `extract-epoch.py` (standard library). |
| `lmarena-text-overall.csv` | LMArena `lmarena-ai/leaderboard-dataset`, text arena, category `overall`, the board the site showed: `text` for snapshots 2023-12-06 … 2025-05-15, `text_style_control` from 2025-05-16 (column `config`). Per snapshot: ranks 1–20 + the best row of each hero organization. 239 snapshots, 5,307 rows; ratings to 0.01. By `extract-lmarena.py` (needs `pandas` + `pyarrow`), which fails unless every snapshot has exactly one rank 1. |
| `heroes.csv` | The eight companies: id, name, product lines, LMArena `organization` key, regex for the product lines at the start of an Epoch `Model` (case-insensitive), and `epoch_orgs` — the Epoch organization names that are the company. Used by `extract-lmarena.py` and `prep.ts`. |
| `user-claims.csv` | 19 user counts (16 from S3-ai0 + 3 in S3-ai2) published by the companies themselves: date the figure refers to (`as_of`), publication date, product, company, value, `qualifier` (`exact` · `more_than` · `almost` · `about`), `metric`, first-party URL, verbatim quote, retrieval date. |

## Sources (not committed; sha256)

```
d845f68989881cb922ee6fd131d2bce6fb9c88dce5978eb0719a4c053476eff9  all_ai_models.csv                                 (Epoch AI, updated 2026-10-08, curl 2026-10-13)
6d61a54a801d1ef9a53149cb7f9ecb6722f1c2b3d65e84cd9354a89051507788  text/full-00000-of-00001.parquet                  (LMArena, last snapshot 2026-10-08, curl 2026-10-13)
51142aff7bb56da54a7d79ce27ada2e61657592bd4d5bbd2d66a496fd4f61fc1  text_style_control/full-00000-of-00001.parquet    (same)
```

- **Epoch AI**, “Data on AI models”, https://epoch.ai/data/ai-models — CSV at `https://epoch.ai/data/all_ai_models.csv`.
  CC BY 4.0; cite as «Epoch AI, ‘Data on AI models’. Published online at epoch.ai». `notable_ai_models.csv` (1,078) and
  `frontier_ai_models.csv` (138) were audited and are **not used** — see decisions 1 and 2.
- **LMArena** (arena.ai), https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset — CC BY 4.0. Methodology
  changes (dataset README): Elo → Bradley–Terry on 2024-01-09; style control default and rescaled on 2025-05-16;
  frequency re-weighting on 2025-07-23.
- **User counts** — company pages, earnings remarks and SEC filings, one URL per row in `user-claims.csv`.
  openai.com answers 403 to the agent's fetch and curl; the OpenAI posts were read in the owner's Chrome (same-origin
  fetch from an openai.com tab). sec.gov needs a declared User-Agent. Meta transcripts: Meta's IR CDN (s21.q4cdn.com).

## Decisions (owner, 2026-10-13, AskUserQuestion)

1. **`all_ai_models`, not `notable_ai_models`.** `notable` misses whole lines (Mistral 5 entries, Llama ends 04.2025,
   no Muse Spark); `all` has Mistral 36, Llama to 10.2025, Muse Spark 4. The planned `releases-extra.csv` is not needed.
2. **Heroes by rule:** ≥ 30 days in the LMArena top 3 (splice below, 2023-12-06 → 2026-10-13) **or** ≥ 100 Epoch models
   whose base-model chain leads to the company's model. Top-3 days: OpenAI 669 · Anthropic 499 · Google 462 · xAI 209 ·
   DeepSeek 86 · Mistral 44 (Meta's Muse Spark and AllenAI's Tulu together 16, Yi 5 — out). Derived models: Meta
   (Llama) 158 from 94 organizations · Alibaba (Qwen) 104 from 48 (next: OpenAI 47). Epoch's `frontier` list was
   dropped from the rule: since 2017 it names 68 models from ≈ 30 organizations (AlphaGo Zero, Wu Dao, Falcon…).
3. **Lanes are companies**, labelled with their lines; Meta = Llama → Muse Spark on one lane.
4. **LMArena splice “what readers saw”, from 2023-12-06.** Snapshots before that lack GPT-4 (the dataset's first GPT-4
   is 2023-12-06; GPT-4 Turbo first appears 2024-02-02). Models later removed from the board are missing everywhere
   (Claude 1 / 2.0 / 2.1, Claude Instant, Bard Gemini Pro, Gemini 1.5 Pro 0409, Yi-Large) — said on the page; rank 1 is
   the main measure, the top 3 secondary. Days at No. 1: OpenAI 501 · Anthropic 256 · Google 222 · DeepSeek 38 · xAI 25.
   The raw `text` series alone gives 487 / 252 / 240 / 38 / 25.
5. **User counts: first-party only.** Third-party estimates (Sensor Tower, Similarweb, statistics blogs) are not used.
   Anthropic, DeepSeek and Alibaba publish no user counts — the page says so. Metrics differ and are never joined:
   ChatGPT weekly active · Gemini app monthly active · Meta AI monthly, inside Meta's apps · Copilot = Microsoft's whole
   family · Grok = users of Grok features incl. inside X (SpaceX S-1, as of 2026-03-31).
   To add (S3-ai1): ChatGPT 100 M (Nov 2023) … 500 M (Mar 2025) weekly — said in keynotes and on X, not on openai.com;
   Gemini 400 M (May 2025, I/O) — so far confirmed by the press only.

## Facts found in the audit (for the page and the tests)

- Epoch since 2017: 3,131 models, training FLOP for 1,242, base model for 679. Trend of training FLOP ≈ ×4.7 a year
  (all 1,242), ×4.2 (top 10 of each year). Closed models rarely disclose: FLOP for 3 of 30 Claude, 16 of 73 Google,
  35 of 109 OpenAI, 5 of 23 Grok.
- Lineage is shallow: 569 derived models one step from their base, 89 two, 21 three or more. Derived models per year:
  2023 157 · 2024 231 · 2025 194 · 2026 12 (still being added). Counts include a company's own later versions
  (Anthropic's single entry is Claude 2.1 on Claude 2).
- Language + multimodal models by developer country (first listed): 2024 China 188, U.S. 186; 2025 U.S. 160,
  China 148. Open weights: 2024 273 of 485, 2026 (to 30 Sep) 60 of 144.
- LMArena now (2026-10-08, style control): 1 `gemini-4-argon-high`, 2 `claude-opus-5.5-high`, 3 `claude-opus-4-6-high`.

## S3-ai1 changes (2026-10-13)

6. **A lane model = line name AND the company's own organization** (`heroes.csv` `epoch_orgs`, `heroOfModel` in
   `src/viz/ai-models/data.ts`). The S3-ai0 mockup matched the name only and put other organizations' models on the
   lanes: GPT-Neo / GPT-J / GPT-NeoX (EleutherAI), GPT-2 variants of universities and Microsoft on OpenAI's; Llama
   Nemotron (Nvidia), SEA-LION, Typhoon on Meta's; SEA-LION Gemma on Google's. The pattern is also case-insensitive
   (OpenAI's `gpt-oss-120b` / `-20b`, DeepSeek's `Deepseek OCR`) and Meta's includes `Code Llama`. Lanes: 416 → **382**
   models (OpenAI 74 · Google 62 · Meta 33 · Anthropic 30 · Alibaba 86 · Mistral 40 · DeepSeek 37 · xAI 20); the first
   model of each lane is unchanged. Two rows with no organization (`Qwen 3.6-27B`, a duplicate of Alibaba's
   `Qwen3.6 27B`; `Llama-3-70B-Synthia-v3.5`) stay off the lanes.
7. **"Derived models" are counted by organization**: a model counts for a company if any ancestor in its base-model chain
   was made by one of the company's organizations; other organizations stand for themselves. Recomputed over every
   organization in the file, only Meta AI (197 models, by 157 other organizations) and Alibaba (112 / 73) reach 100; next
   OpenAI 59, Google 122 (passes on the Arena anyway), outside the eight Tsinghua University 25. S3-ai0's 158 / 104 came
   from a name-based count; the eight companies are the same. Top-3 days are unchanged (669 · 499 · 462 · 209 · 86 · 44;
   outside: AllenAI/UW 9). `prep.ts` aborts if the rule names anything but the eight.
8. **Compute disclosure** (models with a FLOP figure, all domains, same company rule): OpenAI 21 of 86 · Google 15 of 71
   · Meta 25 of 33 · Anthropic 3 of 30 · Alibaba 46 of 90 · Mistral 3 of 40 · DeepSeek 25 of 38 · xAI 5 of 23 (S3-ai0
   said 35 of 109 for OpenAI and 16 of 73 for Google — third-party GPT-named models included). Trend: ×4.7 a year on
   all 1,242 figures (doubling ≈ 5.4 months).
9. **F**: language + multimodal models by first-listed developer country (U.S. / China / other; none recorded → other)
   and by access (open weights / closed / not recorded) — 2024 China 188 · U.S. 186; open weights 273 of 485 (2024),
   60 of 144 (2026, to 30 Sep). `claims.json` (angle D) is left for S3-ai2 with the early first-party milestones.

## S3-ai2 changes (2026-10-13)

10. **Three first-party points added to `user-claims.csv`** (read 2026-10-13): ChatGPT “over 250 million” weekly —
    openai.com/index/scale-the-benefits-of-ai/ (2 Oct 2024); “500 million people who use ChatGPT every week” —
    openai.com/index/march-funding-updates/ (31 Mar 2025), both read in the owner's Chrome (same-origin fetch); Gemini app
    “over 400 million monthly active users” — blog.google/technology/ai/io-2025-keynote/ (Sundar Pichai, 20 May 2025).
    ChatGPT 100 M (Nov 2023), 200 M (Aug 2024), 300 M (Dec 2024) and 400 M (Feb 2025) were found only in press reports
    and posts on X that the agent cannot open — **not added** (rule: no first-party link, no point); the page says so.
    No first-party count was found for Mistral either (press: downloads only).
11. **`claims.json`** (`readClaims` in raw.ts): the CSV in the page's types, sorted by product then date; a claim
    belongs to one of the eight when its company has the hero's name (Microsoft → none). Lines join one product AND one
    measure only (`claimSeries`).
12. **`lineage.json`** (`lineageTree` in data.ts): per company, every model whose base-model chain leads to its models,
    hung under the first base that leads there; roots are the company's own models (prep aborts otherwise). Counts equal
    the rule exactly: Meta 197 / 157 · Google 122 / 81 · Alibaba 112 / 73 · OpenAI 59 / 47 · Mistral 32 / 25 ·
    DeepSeek 22 / 10 · Anthropic 1 / 0 · xAI 0. Largest family: LLaMA-7B (29 descendants). 63 kB, 11 kB gzip, loaded by
    angle E only. The page draws at most 6 families × 5 children × 3 grandchildren; the table lists every model.
13. **Arena runs** (angle C) are computed on the page from `arena.json` (`arenaRuns`): 32 runs, 31 changes of the No. 1
    model; the longest is claude-fable-5, 107 days from 10 Jun 2026.

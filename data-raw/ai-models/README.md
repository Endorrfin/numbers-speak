data-raw / ai-models

CHANGED (S3-ai0, 2026-10-13). Entry #34 `ai-models` (planned) — data audit only; `prep.ts` comes in S3-ai1.
Plan, angles and decisions: `docs/AI-MODELS-PLAN.md`.

| File | What |
|---|---|
| `epoch-models.csv` | Epoch AI, *Data on AI models*, `all_ai_models.csv`: models published since 2017-01-01 (3,131 of 3,626), 11 columns — model, organization, date, domain, country, access, parameters, training FLOP, confidence, base model, link. Values verbatim. By `extract-epoch.py` (standard library). |
| `lmarena-text-overall.csv` | LMArena `lmarena-ai/leaderboard-dataset`, text arena, category `overall`, the board the site showed: `text` for snapshots 2023-12-06 … 2025-05-15, `text_style_control` from 2025-05-16 (column `config`). Per snapshot: ranks 1–20 + the best row of each hero organization. 239 snapshots, 5,307 rows; ratings to 0.01. By `extract-lmarena.py` (needs `pandas` + `pyarrow`), which fails unless every snapshot has exactly one rank 1. |
| `heroes.csv` | The eight companies: id, name, product lines, LMArena `organization` key, regex that assigns an Epoch `Model` to the company. Used by `extract-lmarena.py` and (S3-ai1) `prep.ts`. |
| `user-claims.csv` | 16 user counts published by the companies themselves: date the figure refers to (`as_of`), publication date, product, company, value, `qualifier` (`exact` · `more_than` · `almost` · `about`), `metric`, first-party URL, verbatim quote, retrieval date. |

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

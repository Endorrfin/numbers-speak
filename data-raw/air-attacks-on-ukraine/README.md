# data-raw / air-attacks-on-ukraine

| File | What |
|---|---|
| `missile_attacks_daily.csv` | Petro Ivaniuk, [“Massive Missile Attacks on Ukraine”](https://www.kaggle.com/datasets/piterfm/massive-missile-attacks-on-ukraine) (Kaggle, version 211 of 19 Sep 2026, **CC BY‑NC‑SA 4.0**), downloaded by the owner on 2026‑09‑21 and copied unchanged. One row per model (or group of models) per Air Force report; compiled from the reports of the Air Force Command and the General Staff of the Armed Forces of Ukraine. sha256 `8278a8d28145b9c1507fd62dba4780d4eee1f3b309493d62404114183f744d28`. |
| `hrmmu-civilians.csv` | Civilian casualties per year transcribed from the UN Human Rights Monitoring Mission in Ukraine (HRMMU) — one source URL per row. |
| `prep.ts` | `npm run prep -- air-attacks-on-ukraine` → `public/data/air-attacks-on-ukraine/attacks-2022-2026.json` + `civilians-hrmmu-2023-2026.json` |

**Licence.** The derived `attacks-2022-2026.json` is an adaptation of the Kaggle dataset and is shared under the same
licence, **CC BY‑NC‑SA 4.0**, with attribution (the page names the author, the dataset and the licence). The code
stays MIT. HRMMU figures are quoted with their source pages.

## Rules (prep prints the counts)
1. **National reports only.** Rows from the regional air commands (`PvKPivden`, `pvkshid`, `PvkZahid`, `PvkCenter`)
   and oblast administrations are dropped: they overlap the national Air Force reports (e.g. 11,834 “unknown UAVs”
   from the southern command in 2026 alone). 1,742 rows, 16,242 launched.
2. **Long-range strike weapons only.** Tactical and reconnaissance drones (Orlan, ZALA, Supercam, Merlin-VR, Orion,
   Forpost, Mohajer-6, Lancet, Molniya, …) and guided bombs (GBU, “aerial bomb”) are out of scope — reported
   irregularly and mostly by one regional command. 119 national rows, 278 launched (incl. one 2023 row
   “Shahed-136/131 and Lancet”, 16, that cannot be split).
3. **Classes** (`MODEL_CLASS` in `prep.ts`): cruise · ballistic & aeroballistic (incl. S‑300/S‑400 against ground
   targets and Kh‑47M2 Kinzhal) · anti-ship (Kh‑22/32, Oniks, Zircon) · other (Kh‑31P, type not given) · drones
   (Shahed‑136/131 with decoys, type not given). A row that combines several classes becomes `mixed` (14 rows,
   210 launched). An unknown model aborts prep.
4. **Notes.** `status_data = hidden` (from 10 Aug 2026 the Air Force no longer gives the number launched for some
   missile types) → `launched-hidden` (14 rows); no number destroyed → `destroyed-missing` (6 rows). Both count in
   totals, not in interception rates.
5. **Fixes.** 2024‑12‑28 Shahed: destroyed 15 + lost 11 > launched 16 → lost capped to 1. Three Feb 2024 rows
   (S‑300, Iskander‑M) give no number launched and add nothing.
6. **Date** of a report = the date of `time_end` (the morning report). Rows of the same Air Force post (`source`)
   with the same date form one report — its window is the union of the rows' windows (drones and missiles of one
   night often carry different times). Used for “largest attacks”.

## HRMMU civilians (`hrmmu-civilians.csv`)
- 2023–2025 totals and the 2025 breakdown: [“2025 deadliest year for civilians…”](https://ukraine.ohchr.org/en/2025-deadliest-year-for-civilians-in-Ukraine-since-2022-UN-human-rights-monitors-find)
  (short-range drones 2024 = 226 killed, 1,528 injured, quoted there). Long-range casualties for 2023–2024 are
  not published as annual numbers — left empty.
- 2026 (Jan–Aug): total from the [August 2026 update](https://ukraine.ohchr.org/en/Protection-of-Civilians-in-Armed-Conflict-August-2026)
  (2,222 killed, 13,058 injured); long-range and short-range drones = the sum of the eight monthly updates
  (Jan 54/305 · 54/207, Feb 60/276 · 52/222, Mar 61/448 · 66/369, Apr 84/628 · 80/481, May 115/803 · 64/539,
  Jun 126/907 · 89/588, Jul 183/967 · 111/710, Aug 194/1,077 · 91/727 — long-range · short-range, killed/injured),
  hence `monthly-sum`: monthly figures are later revised upwards.

## Refresh (monthly)
Download the new `missile_attacks_daily.csv` from Kaggle over this one, run prep (a new model stops it — add it to
`MODEL_CLASS` or `OUT_OF_SCOPE`), update the sha256 above, `retrieved` / `updated` / `period` in `meta.ts`, append the
new HRMMU month to the 2026 row, add a CHANGELOG line. File names stay until the year changes.

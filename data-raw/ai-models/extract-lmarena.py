#!/usr/bin/env python3
"""LMArena leaderboard-dataset (text + text_style_control, split full) -> lmarena-text-overall.csv.

Usage: python3 -I extract-lmarena.py <text_full.parquet> <text_style_control_full.parquet>
Needs pandas + pyarrow (parquet). Category `overall` only.

Splice = the board the site showed (owner decision S3-ai0, 2026-10-13):
  raw `text` for snapshots 2023-12-06 .. 2025-05-15, `text_style_control` from 2025-05-16
  (style control became the default on 16 May 2025). Earlier snapshots lack GPT-4 (first: 2023-12-06).
Rows kept per snapshot: rank <= 20, plus the best-ranked row of every hero organization (heroes.csv).
"""
import csv, sys
from pathlib import Path
import pandas as pd

RAW, SC = sys.argv[1], sys.argv[2]
HERE = Path(__file__).parent
OUT = HERE / 'lmarena-text-overall.csv'
START, SWITCH, TOP = '2023-12-06', '2025-05-16', 20
with (HERE / 'heroes.csv').open(newline='', encoding='utf-8') as f:
    ORGS = {r['arena_org'] for r in csv.DictReader(f) if r['arena_org']}

def load(path, config):
    t = pd.read_parquet(path)
    t = t[t.category == 'overall'].copy()
    t['config'] = config
    return t

raw, sc = load(RAW, 'text'), load(SC, 'text_style_control')
d = pd.concat([raw[(raw.leaderboard_publish_date >= START) & (raw.leaderboard_publish_date < SWITCH)],
               sc[sc.leaderboard_publish_date >= SWITCH]])
d['rank'] = d['rank'].astype(int)
for date, g in d.groupby('leaderboard_publish_date'):
    ranks = sorted(g['rank'])
    if ranks[0] != 1 or (g['rank'] == 1).sum() != 1:
        sys.exit(f'{date}: expected exactly one rank 1')
best = d[d.organization.isin(ORGS)].sort_values('rank').groupby(['leaderboard_publish_date', 'organization']).head(1)
keep = pd.concat([d[d['rank'] <= TOP], best]).drop_duplicates(['leaderboard_publish_date', 'model_name'])
keep = keep.sort_values(['leaderboard_publish_date', 'rank', 'model_name'])
cols = ['leaderboard_publish_date', 'config', 'rank', 'model_name', 'organization', 'license', 'rating', 'rating_lower',
        'rating_upper', 'vote_count']
keep = keep[cols].rename(columns={'leaderboard_publish_date': 'date'})
for c in ['rating', 'rating_lower', 'rating_upper']:
    keep[c] = keep[c].round(2)
keep['vote_count'] = keep['vote_count'].astype('Int64')
keep.to_csv(OUT, index=False, lineterminator='\n')
print(f'{d.leaderboard_publish_date.nunique()} snapshots {d.leaderboard_publish_date.min()}..{d.leaderboard_publish_date.max()}'
      f' -> {OUT.name}: {len(keep)} rows')

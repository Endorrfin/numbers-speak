#!/usr/bin/env python3
"""Epoch AI all_ai_models.csv -> epoch-models.csv (models since 2017, the columns prep uses).

Usage: python3 -I extract-epoch.py <path/to/all_ai_models.csv>
Stdlib only. Rows keep Epoch's order; values are copied verbatim (no rounding, no renaming).
"""
import csv, sys
from pathlib import Path

SRC = Path(sys.argv[1])
OUT = Path(__file__).with_name('epoch-models.csv')
KEEP = ['Model', 'Organization', 'Publication date', 'Domain', 'Country (of organization)', 'Model accessibility',
        'Parameters', 'Training compute (FLOP)', 'Confidence', 'Base model', 'Link']
FROM = '2017-01-01'

with SRC.open(newline='', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))
missing = [k for k in KEEP if k not in rows[0]]
if missing:
    sys.exit(f'columns missing in {SRC.name}: {missing}')
kept = [{k: r[k] for k in KEEP} for r in rows if r['Publication date'][:10] >= FROM]
with OUT.open('w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=KEEP, lineterminator='\n')
    w.writeheader()
    w.writerows(kept)
print(f'{SRC.name}: {len(rows)} rows -> {OUT.name}: {len(kept)} rows since {FROM}')

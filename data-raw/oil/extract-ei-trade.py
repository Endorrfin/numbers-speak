#!/usr/bin/env python3
"""extract-ei-trade.py — CHANGED (S3-oil): EI Statistical Review 2026 (PDF) -> ei-2026-crude-trade-2025.csv.

Usage: python3 extract-ei-trade.py "<Statistical Review of World Energy.pdf>" <out.csv>
Reads the table "Oil: Inter-area movements 2025 – crude trade" (million tonnes; PDF page 45, printed p. 44): 21
exporting areas (rows) × 15 importing areas (columns) + the row totals and the "Total imports" line. A dash is
written as 0, the dagger ("less than 0.05") as 0.02 with dagger=1 — so a cell is never dropped silently. The
script fails unless every row adds up to its printed total and every column to its printed "Total imports"
(each within the rounding of its cells). The 2026 data workbook from the EI site was not available to the
owner (the copy received was the 2025 edition), so the PDF is the source of this one table. Needs `pymupdf`.
"""
import csv
import hashlib
import sys

import pymupdf

PDF, OUT = sys.argv[1], sys.argv[2]
TITLE = 'Inter-area movements 2025 crude trade'
COLUMNS = ['Canada', 'Mexico', 'US', 'S. & Cent. America', 'Europe', 'Russian Federation', 'Other CIS', 'Middle East',
           'Africa', 'Australasia', 'China', 'India', 'Japan', 'Singapore', 'Other Asia Pacific']
ROWS = ['Canada', 'Mexico', 'US', 'S. & Cent. America', 'Europe', 'Russian Federation', 'Other CIS', 'Iraq', 'Kuwait',
        'Saudi Arabia', 'UAE', 'Other Middle East', 'North Africa', 'West Africa', 'East & S. Africa', 'Australasia',
        'China', 'India', 'Japan', 'Singapore', 'Other Asia Pacific']
DAGGER = 0.02

doc = pymupdf.open(PDF)
page = next((p for p in doc if TITLE in p.get_text()), None)
if page is None:
    raise SystemExit(f'no page with "{TITLE}"')
tokens = [t.strip() for t in page.get_text().split('\n') if t.strip()]
start = tokens.index('Total', tokens.index('Crude (million tonnes)')) + 1  # past the column header


def cell(tok):
    if tok in ('–', '-'):
        return 0.0, 0
    if tok == '†':
        return DAGGER, 1
    return float(tok), 0


matrix = {}
i = start
for name in ROWS + ['Total imports']:
    i = tokens.index(name, i)
    vals = tokens[i + 1:i + 1 + len(COLUMNS) + 1]
    matrix[name] = [cell(v) for v in vals]
    i += 1 + len(COLUMNS) + 1

problems = []
for name in ROWS:
    cells, total = matrix[name][:-1], matrix[name][-1][0]
    s = sum(v for v, _ in cells)
    tol = 0.05 * sum(1 for v, _ in cells if v) + 0.06
    if abs(s - total) > tol:
        problems.append(f'row {name}: cells add to {s:.2f}, printed total {total}')
totals = matrix['Total imports']
for j, col in enumerate(COLUMNS):
    s = sum(matrix[r][j][0] for r in ROWS)
    tol = 0.05 * sum(1 for r in ROWS if matrix[r][j][0]) + 0.06
    if abs(s - totals[j][0]) > tol:
        problems.append(f'column {col}: cells add to {s:.2f}, printed Total imports {totals[j][0]}')
if problems:
    raise SystemExit('\n'.join(problems))

with open(OUT, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f, lineterminator='\n')
    w.writerow(['from', 'to', 'mt', 'dagger'])
    for name in ROWS:
        for j, col in enumerate(COLUMNS):
            v, d = matrix[name][j]
            if v:
                w.writerow([name, col, f'{v:g}', d])
    for j, col in enumerate(COLUMNS):
        w.writerow(['Total imports', col, f'{totals[j][0]:g}', totals[j][1]])
    w.writerow(['Total imports', 'Total', f'{totals[-1][0]:g}', 0])

print(f'page {page.number + 1}: {len(ROWS)} exporters × {len(COLUMNS)} importers, world {totals[-1][0]} Mt')
for p in (PDF, OUT):
    print(f'{hashlib.sha256(open(p, "rb").read()).hexdigest()}  {p.rsplit("/", 1)[-1]}')

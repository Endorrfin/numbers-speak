#!/usr/bin/env python3
"""extract-eia.py — CHANGED (S3-oil): EIA "U.S. Imports by Country of Origin", crude oil, thousand barrels per day ->
eia-crude-imports-annual.csv + eia-crude-imports-monthly.csv.

Usage: python3 extract-eia.py <PET_MOVE_IMPCUS_A2_NUS_EPC0_IM0_MBBLPD_A.xls> <…_M.xls> <out-dir>
Reads sheet "Data 1" of both workbooks (EIA, public domain): one column per series ("U.S. Imports from Canada of
Crude Oil (Thousand Barrels per Day)"), one row per period. Writes long CSVs — series name (the text between
"from" and "of Crude Oil"; the total is "U.S. Imports"), period (year, or YYYY-MM), value — for every non-empty
cell; the monthly file keeps the last two calendar years only (the page needs the latest partial year). The
release date of each workbook is printed with the sha256 of inputs and outputs. Needs `xlrd` (.xls is BIFF8).
"""
import csv
import hashlib
import os
import re
import sys

import xlrd

ANNUAL, MONTHLY, OUT_DIR = sys.argv[1], sys.argv[2], sys.argv[3]
NAME = re.compile(r'^U\.S\. Imports(?: from (.+?))? of Crude Oil \(Thousand Barrels per Day\)$')


def read(path, monthly):
    book = xlrd.open_workbook(path)
    release = book.sheet_by_name('Contents').row_values(8)[2]
    sheet = book.sheet_by_name('Data 1')
    header = sheet.row_values(2)
    out = []
    for r in range(3, sheet.nrows):
        row = sheet.row_values(r)
        y, m, *_ = xlrd.xldate_as_tuple(row[0], book.datemode)
        period = f'{y}-{m:02d}' if monthly else str(y)
        for title, value in zip(header[1:], row[1:]):
            if value in ('', None):
                continue
            match = NAME.match(title)
            if not match:
                raise SystemExit(f'unexpected series title: {title!r}')
            out.append((match.group(1) or 'U.S. Imports', period, value))
    return release, out


def write(path, rows):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['series', 'period', 'kbd'])
        for s, p, v in rows:
            w.writerow([s, p, f'{v:g}'])


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


rel_a, annual = read(ANNUAL, False)
rel_m, monthly = read(MONTHLY, True)
last = max(int(p[:4]) for _, p, _ in monthly)
monthly = [r for r in monthly if int(r[1][:4]) >= last - 1]
a_out = os.path.join(OUT_DIR, 'eia-crude-imports-annual.csv')
m_out = os.path.join(OUT_DIR, 'eia-crude-imports-monthly.csv')
write(a_out, annual)
write(m_out, monthly)
print(f'annual release {rel_a}: {len(annual)} values · monthly release {rel_m}: {len(monthly)} values ({last - 1}–{last})')
for p in (ANNUAL, MONTHLY, a_out, m_out):
    print(f'{sha(p)}  {os.path.basename(p)}')

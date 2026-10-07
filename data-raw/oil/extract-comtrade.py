#!/usr/bin/env python3
"""extract-comtrade.py — CHANGED (S3-oil): UN Comtrade (public preview API) responses -> comtrade-china-crude.csv.

Usage: python3 extract-comtrade.py <out.csv> <response-2024.json> <response-2025.json> …
Each response is the JSON of
  https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=156&period=<year>&cmdCode=2709&flowCode=M
— China's imports of HS 2709 (crude petroleum oils), annual, all partners, as China's customs (GACC) reported them
to the UN. Keeps the partner rows (not the World row): year, partner M49 code, ISO3, name, net weight (kg), value
(US$, CIF). A partner without a weight is written with an empty weight. Standard library only.
"""
import csv
import hashlib
import json
import sys

OUT, inputs = sys.argv[1], sys.argv[2:]
rows = []
for path in inputs:
    data = json.load(open(path, encoding='utf-8'))
    if data.get('error'):
        raise SystemExit(f'{path}: {data["error"]}')
    for r in data['data']:
        if r['reporterCode'] != 156 or r['cmdCode'] != '2709' or r['flowCode'] != 'M':
            raise SystemExit(f'{path}: unexpected row {r["reporterCode"]} {r["cmdCode"]} {r["flowCode"]}')
        if r['partnerCode'] == 0:
            continue
        weight = r['netWgt']
        rows.append([r['refYear'], r['partnerCode'], r['partnerISO'], r['partnerDesc'],
                     '' if not weight else f'{weight:.0f}', f'{r["primaryValue"]:.0f}'])
rows.sort(key=lambda r: (r[0], r[2]))
with open(OUT, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f, lineterminator='\n')
    w.writerow(['year', 'partner_m49', 'partner_iso3', 'partner_name', 'net_weight_kg', 'value_usd'])
    w.writerows(rows)
for p in inputs + [OUT]:
    print(f'{hashlib.sha256(open(p, "rb").read()).hexdigest()}  {p.rsplit("/", 1)[-1]}')

#!/usr/bin/env python3
"""extract-gpi.py — GPI 2026 report (PDF) → gpi-2026-ranking.csv (S3-rb).

Reads two independent tables of the same report with `pdftotext -layout` (poppler):
  1. the ranking table on the map spread (PDF pages 12–13, printed pp. 10–11): rank ("=" for ties), country,
     overall score, change in rank vs the prior year (arrow glyph + number);
  2. the nine regional tables (PDF pages 17–27): country, overall score, score change, overall rank.
Every country must appear in both with the same score and rank — except the one known conflict in
REGIONAL_RANK_CONFLICTS (kept as printed in (1), the regional rank written alongside); the score change comes from (2).
Usage: python3 extract-gpi.py <Global-Peace-Index-2026-Report.pdf> <out.csv>
"""
import csv
import re
import subprocess
import sys

PDF, OUT = sys.argv[1], sys.argv[2]

# Country → (rank in the ranking table, rank in its regional table and the report's text). Honduras and Cambodia
# both score 2.075: the ranking table prints 96 Cambodia · 97 Honduras (no "="), the Latin America table (p. 22)
# and the text say Honduras is 96th.
REGIONAL_RANK_CONFLICTS = {'Honduras': ('97', '96')}


def page_text(first: int, last: int) -> list[str]:
    out = subprocess.run(['pdftotext', '-f', str(first), '-l', str(last), '-layout', PDF, '-'],
                         check=True, capture_output=True, text=True).stdout
    return out.split('\n')


CHANGE = r'(↔|UP-LONG\s+\d+|DOWN-LONG\s+\d+)'
FULL = re.compile(r'^\s*(=?\d+)\s+(\S.*?)\s+(\d\.\d+)\s+' + CHANGE + r'\s*$')
BARE = re.compile(r'^\s*(=?\d+)\s+(\d\.\d+)\s+' + CHANGE + r'\s*$')  # name wrapped above/below
FRAG = re.compile(r'^\s*([^\d\s][^\d]*?)\s*$')


def change_of(s: str) -> int:
    if s == '↔':
        return 0
    word, n = s.split()
    return int(n) if word == 'UP-LONG' else -int(n)


def ranking() -> list[dict]:
    rows: list[dict] = []
    lines = page_text(12, 13)
    heads = [i for i, l in enumerate(lines) if re.search(r'RANK\s+COUNTRY', l)]
    assert len(heads) == 2, heads
    for h, end in ((heads[0], heads[1]), (heads[1], len(lines))):
        starts = [m.start() for m in re.finditer('RANK', lines[h])]
        assert len(starts) == 3, starts
        bounds = [max(0, s - 2) for s in starts] + [10_000]
        for g in range(3):
            pending_frag: list[str] = []
            bare: dict | None = None
            for line in lines[h + 1:end]:
                cell = line[bounds[g]:bounds[g + 1]].rstrip()
                if not cell.strip():
                    continue
                if m := FULL.match(cell):
                    rank, name, score, ch = m.groups()
                    assert not pending_frag and bare is None, (cell, pending_frag, bare)
                    rows.append({'rank': rank, 'country': name.strip(), 'score': score, 'change': change_of(ch)})
                elif m := BARE.match(cell):
                    rank, score, ch = m.groups()
                    bare = {'rank': rank, 'country': ' '.join(pending_frag), 'score': score, 'change': change_of(ch)}
                    pending_frag = []
                elif m := FRAG.match(cell):
                    if bare is not None:
                        bare['country'] = (bare['country'] + ' ' + m.group(1)).strip()
                        rows.append(bare)
                        bare = None
                    else:
                        pending_frag.append(m.group(1))
                elif re.fullmatch(r'\s*\d+(\s+\d+)?\s*', cell):
                    continue  # page numbers
                else:
                    raise SystemExit(f'unparsed cell in group {g}: {cell!r}')
            assert bare is None and not pending_frag, (g, bare, pending_frag)
    return rows


REG = re.compile(r'(?<!\S)(\d{1,2})\s{2,}(\S(?:.*?\S)?)?\s{2,}([1-4]\.\d{1,3})\s{2,}(-?\d\.\d{3})\s{2,}(\d{1,3})(?!\S)')


def regional() -> list[dict]:
    rows = []
    for p in range(17, 28):
        for line in page_text(p, p):
            for m in REG.finditer(line):
                rows.append({'page': p, 'country': (m.group(2) or '').strip(), 'score': m.group(3),
                             'scoreChange': m.group(4), 'rank': m.group(5)})
    return rows


def main() -> None:
    main_rows = ranking()
    n = len(main_rows)
    assert n == 163, f'{n} rows in the ranking table'
    # Rank consistency: sorted by score; "=k" rows share rank k and the next rank skips.
    main_rows.sort(key=lambda r: (int(r['rank'].lstrip('=')), r['country']))
    prev = 0.0
    for i, r in enumerate(main_rows):
        k = int(r['rank'].lstrip('='))
        s = float(r['score'])
        assert s >= prev, (r, prev)
        prev = s
        tied = r['rank'].startswith('=')
        expected = i + 1 if not tied else None
        if expected is not None:
            assert k == expected, (r, expected)
        r['tied'] = tied
    names = [r['country'] for r in main_rows]
    assert len(set(names)) == n, 'duplicate names'
    # Cross-check with the regional tables.
    reg = regional()
    by_name = {r['country']: r for r in main_rows}
    unmatched = []
    for g in reg:
        conflict = REGIONAL_RANK_CONFLICTS.get(g['country'])
        if conflict and conflict[1] == g['rank']:
            c = by_name[g['country']]
            assert c['rank'].lstrip('=') == conflict[0] and float(c['score']) == float(g['score']), (c, g)
            c['scoreChange'], c['regionalRank'] = g['scoreChange'], g['rank']
            continue
        cands = [r for r in main_rows if int(r['rank'].lstrip('=')) == int(g['rank']) and float(r['score']) == float(g['score'])]
        if g['country'] in by_name:
            cands = [by_name[g['country']]] if by_name[g['country']] in cands else []
        if len(cands) != 1:
            unmatched.append(g)
            continue
        c = cands[0]
        assert 'scoreChange' not in c, ('twice', g, c)
        c['scoreChange'] = g['scoreChange']
    missing = [r['country'] for r in main_rows if 'scoreChange' not in r]
    if unmatched or missing:
        print('regional rows not matched:', unmatched, file=sys.stderr)
        print('countries without a regional row:', missing, file=sys.stderr)
        raise SystemExit(1)
    with open(OUT, 'w', newline='', encoding='utf8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['rank', 'tied', 'country', 'score', 'rank_change', 'score_change', 'regional_rank'])
        for r in main_rows:
            w.writerow([r['rank'].lstrip('='), 'yes' if r['tied'] else '', r['country'], r['score'], r['change'], r['scoreChange'], r.get('regionalRank', '')])
    print(f'✓ {OUT}: {n} countries; {len(reg)} regional rows matched; ties: {sum(r["tied"] for r in main_rows)}')


main()

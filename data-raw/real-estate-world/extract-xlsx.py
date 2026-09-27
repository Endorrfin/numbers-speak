#!/usr/bin/env python3
"""extract-xlsx.py — CHANGED (S3-re): the owner's Numbeo copies saved as .xlsx -> the tab-separated text prep.ts reads.

Usage: python3 extract-xlsx.py "<xlsx>" <sheet number, 1-based> <out.txt>
Reads one sheet with the standard library only (zipfile + ElementTree), keeps the header row and every row whose
first cell is a rank, and prints numbers the way Numbeo shows them: a cell formatted as US dollars ("$"#,##0.00 —
the currency survives the paste as the cell format) is written "$30964.45"; other numbers are rounded to 1 decimal,
trailing zeros dropped (the spreadsheet stores 8.2 as 8.1999999999999993). Title, filter and footer lines ("Select
Region…", "Showing 1 to 402 of 402 entries", "Reference …") are left out. Prints the sha256 of the input and the output.
"""
import hashlib
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def sheet_rows(path, number):
    z = zipfile.ZipFile(path)
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    styles = ET.fromstring(z.read('xl/styles.xml'))
    formats = {n.get('numFmtId'): n.get('formatCode') for n in styles.iter('{%s}numFmt' % NS['m'])}
    xf_format = [x.get('numFmtId') for x in styles.find('m:cellXfs', NS).findall('m:xf', NS)]
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    sheet = wb.find('m:sheets', NS)[number - 1]
    target = rels[sheet.get('{%s}id' % NS['r'])].lstrip('/')
    target = target if target.startswith('xl/') else 'xl/' + target
    for row in ET.fromstring(z.read(target)).find('m:sheetData', NS).findall('m:row', NS):
        cells = []
        for c in row.findall('m:c', NS):
            v = c.find('m:v', NS)
            kind = c.get('t')
            if kind == 's' and v is not None:
                cells.append(shared[int(v.text)])
            elif kind == 'inlineStr':
                cells.append(''.join(t.text or '' for t in c.iter('{%s}t' % NS['m'])))
            else:
                text = v.text if v is not None else ''
                style = c.get('s')
                code = formats.get(xf_format[int(style)], '') if style is not None else ''
                cells.append(('$' + '%.2f' % float(text)) if text and '"$"' in code else text)
        yield cells


def shown(value):
    """Numbeo prints at most one decimal: 8.1999999999999993 -> '8.2', 9 -> '9'."""
    if re.fullmatch(r'-?\d+(\.\d+)?', value):
        return ('%.1f' % float(value)).rstrip('0').rstrip('.')
    return value


def main():
    src, number, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    lines = []
    for cells in sheet_rows(src, number):
        if cells and cells[0].strip() == 'Rank':
            lines.append('\t'.join(c.strip() for c in cells))
        elif cells and re.fullmatch(r'\d+', cells[0].strip()):
            rest = [c.strip() if c.strip().startswith('$') else shown(c.strip()) for c in cells[2:]]
            lines.append('\t'.join([cells[0].strip(), cells[1].strip()] + rest))
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    for p in (src, out):
        print(hashlib.sha256(open(p, 'rb').read()).hexdigest(), ' ', p)
    print(sum(1 for l in lines if l.split('\t', 1)[0].isdigit()), 'rows')


if __name__ == '__main__':
    main()

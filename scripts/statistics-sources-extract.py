"""Recreate normalized official workbook rows; requires openpyxl and xlrd 2.0.2."""
import json
from pathlib import Path
import openpyxl
import xlrd

root = Path(__file__).resolve().parent / 'statistics-sources' / 'costa-rica-panama'
wb = openpyxl.load_workbook(root / 'cr-population.xlsx', data_only=True)
rows = []
for row in wb['11'].rows:
    cell = row[0]
    if not isinstance(cell.value, str) or not isinstance(row[1].value, (int, float)):
        continue
    # The retained workbook formats province totals with style 56 and canton totals in bold.
    level = 0 if cell.value == 'Costa Rica' else 1 if cell.style_id == 56 else 2 if cell.font.b else 3
    rows.append(dict(name=cell.value, level=level, population=row[1].value, row=cell.row))
(root / 'cr-population-normalized.json').write_text(json.dumps(rows, ensure_ascii=False), encoding='utf8')
pa = xlrd.open_workbook(root / 'pa-population.xls')
tables = {sheet.name: [sheet.row_values(i) for i in range(sheet.nrows)] for sheet in pa.sheets()}
(root / 'pa-population-rows.json').write_text(json.dumps(tables, ensure_ascii=False), encoding='utf8')
gdp = openpyxl.load_workbook(root / 'pa-gdp.xlsx', data_only=True, read_only=True)
tables = {sheet.title: [list(row) for row in sheet.values] for sheet in gdp}
(root / 'pa-gdp-rows.json').write_text(json.dumps(tables, ensure_ascii=False, default=str), encoding='utf8')

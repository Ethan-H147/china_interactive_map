"""Compare all planning-area totals with an independent SingStat workbook."""
import hashlib
import json
import sys
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
import openpyxl

folder = Path('scripts/additional-sources/singapore')
source = Path(sys.argv[1]) if len(sys.argv) > 1 else folder / 'population-tables-2026.zip'
tables = {}
subzones = {}
with ZipFile(source) as archive:
    for name in archive.namelist():
        if not name.endswith('.xlsx') or 'Floor Area' in name:
            continue  # Floor-area tables exclude some dwelling types.
        workbook = openpyxl.load_workbook(BytesIO(archive.read(name)), read_only=True, data_only=True)
        sheet = workbook['2026(Total)' if '2026(Total)' in workbook.sheetnames else '2026']
        totals = {}
        for pa, subzone, age, category, value in sheet.values:
            if subzone == age == category == 'Total':
                assert pa not in totals, (name, pa)
                totals[pa.upper()] = value
            if 'Type of Dwelling' in name and pa == 'Jurong West' and age == category == 'Total':
                subzones[subzone] = value
        workbook.close()
        assert len(totals) == 56, (name, len(totals))
        tables[name] = totals
assert len(tables) == 2
totals, independent = tables.values()
assert totals == independent, 'Independent overall population totals must match'
assert totals == json.loads((folder / 'population-totals-2026.json').read_text())['values']
assert totals['PIONEER'] == 50 and totals['BOON LAY'] == 30
assert totals['JURONG WEST'] == 250890 and subzones['Boon Lay Place'] == 29360
statistics = json.loads(Path('dist/data/southeast-asia/singapore-statistics.json').read_text())
for record in statistics['regions'].values():
    if record['level'] != 2:
        continue
    value = totals[record['name'].upper()]
    assert record['population']['value'] == (0 if value == '-' else value)
    assert record['population']['date'] == '2026-06'
report = {
    'reviewed': '2026-10-08',
    'source': 'https://www.singstat.gov.sg/files/1f0956c0-7c89-4684-bde3-b45b792636af.zip',
    'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'independentTables': list(tables), 'planningAreasChecked': 55,
    'populationDefinition': 'Citizens and permanent residents at end-June 2026; non-residents excluded; rounded to nearest 10.',
    'nationalResidentTotal': totals['TOTAL'],
    'planningAreaSum': sum(v for k, v in totals.items() if k != 'TOTAL' and isinstance(v, (int, float))),
    'roundingNote': 'Independently rounded planning-area totals need not sum exactly to the national total.',
    'focus': {'Pioneer planning area': totals['PIONEER'], 'Boon Lay planning area': totals['BOON LAY'],
              'Jurong West planning area': totals['JURONG WEST'], 'Boon Lay Place subzone within Jurong West': subzones['Boon Lay Place']}
}
(folder / 'population-review-2026.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print('Singapore population: all 55 planning-area totals agree across two official workbooks; Pioneer 50, Boon Lay 30, Jurong West 250,890, Boon Lay Place 29,360.')

import json
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
import openpyxl

folder = Path('scripts/additional-sources/singapore')
with ZipFile(folder / 'population-tables-2026.zip') as archive:
    source = next(name for name in archive.namelist() if 'Type of Dwelling' in name and name.endswith('.xlsx'))
    data = archive.read(source)
workbook = openpyxl.load_workbook(BytesIO(data), read_only=True, data_only=True)
values = {}
for pa, subzone, age, dwelling, population in workbook['2026(Total)'].values:
    if subzone == age == dwelling == 'Total':
        assert pa not in values, pa
        assert isinstance(population, (int, float)) or population == '-', (pa, population)
        values[pa.upper()] = int(population) if population != '-' else '-'
workbook.close()
print('Published totals:', len(values), 'Tampines:', values['TAMPINES'], 'National:', values['TOTAL'])
assert values['TAMPINES'] == 296060
(folder / 'population-totals-2026.json').write_text(json.dumps({
    'source': 'https://www.singstat.gov.sg/files/1f0956c0-7c89-4684-bde3-b45b792636af.zip',
    'sheet': '2026(Total)', 'selection': 'Subzone, Age Group and Type of Dwelling are all Total; 2026 resident counts',
    'values': values
}, indent=2), encoding='utf-8')

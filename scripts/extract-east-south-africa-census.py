"""Recreate the pinned census tables from retained official reports/workbook.

Requires pypdf and openpyxl. Normal map builds use the retained JSON directly.
"""
import gzip
import hashlib
import io
import json
import re
from pathlib import Path
import openpyxl
from pypdf import PdfReader

root = Path(__file__).resolve().parent / 'boundary-sources' / 'east-south-africa'
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf8'))

def original(name):
    data = gzip.decompress((root / (name + '.gz')).read_bytes())
    assert hashlib.sha256(data).hexdigest() == manifest['files'][name]['sha256'], name
    return data

def pdf_text(name):
    return '\n'.join(page.extract_text(extraction_mode='layout') for page in PdfReader(io.BytesIO(original(name))).pages)

def retain(name, value):
    data = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf8')
    # Preserve the pinned normalizer's line endings on Windows and other hosts.
    if hashlib.sha256(data).hexdigest() != manifest['files'][name]['sha256']:
        data = data.replace(b'\n', b'\r\n')
    assert hashlib.sha256(data).hexdigest() == manifest['files'][name]['sha256'], name + ': normalized bytes changed; review before repinning'
    (root / (name + '.gz')).write_bytes(gzip.compress(data, compresslevel=9, mtime=0))

out = {}
text = pdf_text('zwe-census2022.pdf')
text = text[text.rfind('Table 2.2:'):]
text = text[:text.index('Table 2.3:')]
rows = []
for line in text.splitlines():
    match = re.match(r'^\s*([A-Za-z ]+?)\s{2,}([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+[\d.]+\s+\d+\s*$', line)
    if match and match[1].strip() != 'Total':
        rows.append(dict(name=match[1].strip(), population=int(match[4].replace(',', ''))))
assert len(rows) == 10 and sum(r['population'] for r in rows) == 15178957
out['zimbabwe'] = dict(year=2022, method='census', national=15178957, rows=rows, sourceFile='zwe-census2022.pdf', url=manifest['files']['zwe-census2022.pdf']['url'], table='Table 2.2, printed page 109')

text = pdf_text('zmb-census2022.pdf')
text = text[text.index('Figure 3.3a: Population Size by Province, Zambia 2022', text.index('3.2 Population Size by Province')):]
text = text[:text.index('Figure 3.3b')]
rows = []
for line in text.splitlines():
    match = re.match(r'^\s*([A-Za-z ]+?)\s{2,}([\d,]+)\s*$', line)
    if match:
        rows.append(dict(name=match[1].strip(), population=int(match[2].replace(',', ''))))
assert len(rows) == 10 and sum(r['population'] for r in rows) == 19610769
out['zambia'] = dict(year=2022, method='census', status='preliminary', national=19610769, rows=rows, sourceFile='zmb-census2022.pdf', url=manifest['files']['zmb-census2022.pdf']['url'], table='Figure 3.3a, printed page 8')

lines = pdf_text('tza-census2022.pdf').splitlines()
start = next(i for i, line in enumerate(lines) if '61,741,120' in line and '30,053' in line)
rows = []
for line in lines[start + 1:start + 45]:
    match = re.match(r'^\s*([A-Za-z ]+?)\s{2,}([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+\d+\s+[\d,]+\s+[\d.]+\s*$', line)
    if match and not match[1].strip().startswith('Tanzania'):
        rows.append(dict(name=match[1].strip(), population=int(match[2].replace(',', ''))))
assert len(rows) == 31 and sum(r['population'] for r in rows) == 61741120
out['tanzania'] = dict(year=2022, method='census', national=61741120, rows=rows, sourceFile='tza-census2022.pdf', url=manifest['files']['tza-census2022.pdf']['url'], table='Table 3, printed page 15')

workbook = openpyxl.load_workbook(io.BytesIO(original('ken-census2019.xlsx')), data_only=True, read_only=True)
rows = [dict(name=r[0].strip(), population=r[1]) for r in workbook.active.values if isinstance(r[1], int) and isinstance(r[0], str) and r[0].strip() != 'KENYA']
assert len(rows) == 47 and sum(r['population'] for r in rows) == 47564296
out['kenya'] = dict(year=2019, method='census', national=47564296, rows=rows, sourceFile='ken-census2019.xlsx', url=manifest['files']['ken-census2019.xlsx']['url'], table='Pop by Sex and County; total includes intersex respondents')
retain('census-normalized.json', out)
print('Recreated all 98 first-level census records with identical pinned bytes.')

text = pdf_text('tza-national-accounts2025.pdf')
text = text[text.index('Table 26 Selected Indicators', text.index('4.0    Gross Domestic Product')):]
text = text[:text.index('5.0')]
def series(label):
    line = next(line for line in text.splitlines() if line.strip().startswith(label))
    values = [int(x.replace(',', '')) for x in re.findall(r'\b\d[\d,]*\b', line)]
    assert len(values) == 7, label
    return values
gdp = series('United Republic of Tanzania')[-1] * 1000000
mainland = series('Population Mainland Tanzania')[-1]
zanzibar = series('Zanzibar Population')[-1]
rate = series('Exchange rates TZS/USD')[-1]
assert (gdp, mainland, zanzibar, rate) == (243346944000000, 66054123, 2098881, 2550)
economy = dict(year=2025, currency='TZS', gdp=gdp, gdpPerCapita=gdp / (mainland + zanzibar), population=mainland + zanzibar, mainlandPopulation=mainland, zanzibarPopulation=zanzibar, exchangeRate=rate, sourceFile='tza-national-accounts2025.pdf', url=manifest['files']['tza-national-accounts2025.pdf']['url'], table='Table 26, Selected Indicators for URT, Mainland Tanzania and Zanzibar, printed page 48', perCapitaMethod='Calculated using the sum of the explicitly listed 2025 mainland and Zanzibar population components; the report’s aggregate URT population row repeats its 2024 total.')
retain('tza-national-economy.json', economy)
print('Recreated whole-country Tanzanian economic figures with identical pinned bytes.')

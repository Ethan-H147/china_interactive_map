"""Join final census figures to current boundaries by official administrative code."""
import gzip, hashlib, json
from pathlib import Path
import openpyxl
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'scripts/japan-sources/municipalities/census2025-final.xlsx'
if not SOURCE.exists():
    SOURCE.parent.mkdir(parents=True, exist_ok=True)
    url = 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040506423&fileKind=0'
    request = urllib.request.Request(url, headers={'User-Agent': 'BoundaryAtlas/1.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
        SOURCE.write_bytes(response.read())
catalogue = json.loads(gzip.decompress((ROOT / 'dist/data/japan-local/catalogue.bin').read_bytes()))
prefectures = json.loads(gzip.decompress((ROOT / 'dist/data/japan-boundaries.bin').read_bytes()))['first']['features']
flags = json.loads((ROOT / 'dist/data/japan-local-flags.json').read_text(encoding='utf-8'))
workbook = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
census = {}
for row in list(workbook.active.values)[14:]:
    # Table also contains former municipalities under 2000 boundaries. Never
    # overwrite a current municipality with one of these historical rows.
    if not isinstance(row[7], (int, float)) or not str(row[5]).isdigit() or '旧' in str(row[6]):
        continue
    code = str(row[5]).zfill(5)
    assert code not in census, f'Duplicate current census code: {code}'
    census[code] = {'population': int(row[7]), 'area': row[14] if isinstance(row[14], (int, float)) else None}

places = [dict(f['properties'], level=1) for f in prefectures] + catalogue['records']
records = {}
for place in places:
    code = place['id'][3:] + ('000' if place['level'] == 1 else '')
    record = census.get(code)
    assert record or place.get('disputed'), f'Missing census figure: {place["id"]}'
    records[place['id']] = dict(record or {'population': None, 'area': None})
    if place['id'] in flags['flags']:
        flag = flags['flags'][place['id']]
        records[place['id']]['flag'] = {'file': flag['file'], 'page': flag['page']}

for pref in prefectures:
    pid = pref['properties']['id']
    children = [p for p in catalogue['records'] if p['level'] == 2 and p['parent'] == pid and not p.get('disputed')]
    assert sum(records[p['id']]['population'] for p in children) == records[pid]['population'], f'Prefecture total mismatch: {pid}'
for city in [p for p in catalogue['records'] if p['kind'] == 'Designated city']:
    wards = [p for p in catalogue['records'] if p['parent'] == city['id']]
    assert sum(records[p['id']]['population'] for p in wards) == records[city['id']]['population'], f'Ward total mismatch: {city["id"]}'

source = {'title': 'Statistics Bureau of Japan · 2025 Census, final population results, table 1-1',
          'url': 'https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&lid=000001491012',
          'download': 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040506423&fileKind=0',
          'date': '2025-10-01', 'dateLabel': '1 October 2025 · Final census', 'released': '2026-09-29',
          'retrieved': '2026-10-06', 'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
          'note': 'Population counts refer to usual residents on census day. Current municipal rows only; city wards are parts of their designated city, not additional population. Reference area is reported in km². Census does not cover the six claimed villages administered by Russia.'}
payload = {'source': source, 'records': records}
(ROOT / 'dist/data/japan-local-facts.bin').write_bytes(gzip.compress(json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode(), compresslevel=9, mtime=0))
report = {'source': source, 'coverage': {'prefectures': 47, 'municipalities': 1741, 'cityWards': 171, 'notCovered': 6, 'localFlags': len(flags['flags']),
          'municipalFlags': sum(p['id'] in flags['flags'] for p in catalogue['records'] if p['level'] == 2 and not p.get('disputed')),
          'cityWardFlags': sum(p['id'] in flags['flags'] for p in catalogue['records'] if p['level'] == 3)},
          'checks': ['All 47 prefecture populations equal the sum of their municipalities.', 'All 20 designated-city populations equal the sum of their city wards.', 'No old 2000 municipal row is used.'],
          'flags': 'japan-local-flags.json'}
(ROOT / 'dist/data/japan-local-facts-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Final census: 47 prefectures, 1,741 municipalities, 171 wards; all hierarchy totals match.')

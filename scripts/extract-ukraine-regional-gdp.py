"""Re-extract the retained official workbook; requires xlrd 2.0.2."""
import hashlib
import io
import json
from pathlib import Path
import zipfile
import xlrd

root = Path(__file__).resolve().parent / 'statistics-sources' / 'cz-sk-ua'
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
archive = (root / 'ua-regional-gdp-2004-2021.zip').read_bytes()
assert hashlib.sha256(archive).hexdigest() == manifest['files']['ua-regional-gdp-2004-2021.zip']['sha256']
with zipfile.ZipFile(io.BytesIO(archive)) as source:
    name = next(n for n in source.namelist() if n.endswith('.xls') and '2021' in n.rsplit('/', 1)[-1])
    book = xlrd.open_workbook(file_contents=source.read(name))
    values = {sheet.name: [sheet.row_values(i) for i in range(sheet.nrows)] for sheet in book.sheets()}
output = json.dumps(values, ensure_ascii=False).encode('utf-8')
assert hashlib.sha256(output).hexdigest() == manifest['files']['ua-gdp-rows.json']['sha256']
(root / 'ua-gdp-rows.json').write_bytes(output)
print('Verified official 2004-2021 workbook extraction.')

import pathlib,json,sys
sys.stdout.reconfigure(encoding='utf-8')
from pypdf import PdfReader
root=pathlib.Path(__file__).resolve().parent/'statistics-sources'/'archipelago'
reader=PdfReader(root/'bps-yearbook-2026.pdf')
pages=[54,197,198,199,853,857]
texts={str(i):reader.pages[i-1].extract_text(extraction_mode='layout') for i in pages}
texts={i:'\n'.join(' '.join(line.split()) for line in t.splitlines()) for i,t in texts.items()}
(root/'bps-yearbook-2026.tables.json').write_text(json.dumps(texts,ensure_ascii=False,indent=2),encoding='utf-8')
print('Extracted BPS tables 1.1.1, 3.1.1, 15.2.1 and 15.2.5')
gdp=PdfReader(root/'bps-gdp-official-2026.pdf')
texts={str(i):'\n'.join(' '.join(line.split()) for line in gdp.pages[i-1].extract_text(extraction_mode='layout').splitlines()) for i in [65,195]}
(root/'bps-gdp-2026.tables.json').write_text(json.dumps(texts,ensure_ascii=False,indent=2),encoding='utf-8')
print('Extracted April 2026 BPS GDP appendices 1 and 121')

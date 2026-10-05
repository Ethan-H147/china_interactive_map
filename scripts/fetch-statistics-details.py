import concurrent.futures, gzip, json, pathlib, subprocess, sys, urllib.parse
from lxml import html
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'scripts/statistics-sources/details'; OUT.mkdir(exist_ok=True)
articles=json.loads((ROOT/'dist/data/region-articles.json').read_text(encoding='utf-8'))['regions']
def fetch(item):
 code,record=item
 if not record.get('en'): return None
 url=record['en']['url']; path=OUT/(code+'.html.gz')
 try:
  if path.exists(): raw=gzip.decompress(path.read_bytes())
  else:
   raw=subprocess.check_output(['curl.exe','--fail','--location','--silent','--show-error','--max-time','30',url],stderr=subprocess.DEVNULL)
   path.write_bytes(gzip.compress(raw))
  doc=html.fromstring(raw)
  rows=[]
  for tr in doc.xpath('//table[contains(@class,"infobox")]/tbody/tr | //table[contains(@class,"infobox")]/tr'):
   cells=tr.xpath('./th|./td')
   rows.append([' '.join(c.text_content().split()) for c in cells])
  return code,{'url':url,'rows':rows}
 except Exception as e: return code,{'url':url,'error':type(e).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
 result={}
 for i,pair in enumerate(pool.map(fetch,articles.items())):
  if pair: result[pair[0]]=pair[1]
  if i%50==0: print('Read',i,'of',len(articles),flush=True)
(OUT.parent/'china-details.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
print('Saved',len(result),'region records;',sum('error' in r for r in result.values()),'unavailable')

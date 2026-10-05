import gzip, hashlib, json, pathlib, subprocess, datetime, io, sys
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd

ROOT=pathlib.Path(__file__).resolve().parent
OUT=ROOT/'statistics-sources'
OUT.mkdir(exist_ok=True)
PAGES={
 'china-top-cities':'List_of_top_Chinese_cities_by_GDP',
 'china-top-per-capita':'List_of_top_Chinese_cities_by_GDP_per_capita',
 'china-provinces':'List_of_Chinese_provincial-level_divisions_by_GDP',
 'china-per-capita':'List_of_Chinese_provincial-level_divisions_by_GDP_per_capita',
 'china-prefectures':'List_of_prefecture-level_divisions_of_China_by_GDP',
 'korea':'List_of_South_Korean_regions_by_GDP',
 'mongolia-area':'Provinces_of_Mongolia',
 'china-area':'List_of_Chinese_administrative_divisions_by_area',
}
manifest={}
for key,title in PAGES.items():
 url='https://en.wikipedia.org/wiki/'+title
 path=OUT/(key+'.html.gz')
 if path.exists(): raw=gzip.decompress(path.read_bytes())
 else:
  raw=subprocess.check_output(['curl.exe','--fail','--location','--silent','--show-error',url])
  path.write_bytes(gzip.compress(raw))
 manifest[key]={'url':url,'title':'Wikipedia: '+title.replace('_',' '),'retrieved':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest(),'license':'CC BY-SA 4.0'}
 tables=pd.read_html(io.StringIO(raw.decode('utf8')),flavor='lxml')
 serial=[]
 for i,t in enumerate(tables):
  serial.append({'columns':[list(c) if isinstance(c,tuple) else str(c) for c in t.columns],'rows':t.fillna('').astype(str).values.tolist()})
  print(key,i,t.shape,str(t.columns.tolist())[:350],flush=True)
 (OUT/(key+'.tables.json')).write_text(json.dumps(serial,ensure_ascii=False),encoding='utf8')
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')

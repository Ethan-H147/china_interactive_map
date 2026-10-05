import json, pathlib, subprocess, urllib.parse, sys
sys.stdout.reconfigure(encoding='utf-8')
root=pathlib.Path(__file__).resolve().parent.parent
out=root/'scripts/statistics-sources'
articles=json.loads((root/'dist/data/region-articles.json').read_text(encoding='utf8'))['regions']
ids=sorted(set(r['wikidata'] for r in articles.values() if r.get('wikidata')))
entities={}
for i in range(0,len(ids),50):
 p=out/('entities-'+str(i//50)+'.json')
 if not p.exists():
  url='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode({'action':'wbgetentities','ids':'|'.join(ids[i:i+50]),'props':'claims','format':'json'})
  p.write_bytes(subprocess.check_output(['curl.exe','--fail','--silent','--show-error','--location',url]))
 entities.update(json.loads(p.read_text(encoding='utf8')).get('entities',{}))
 print('Entities',len(entities),flush=True)
(out/'china-entities.json').write_text(json.dumps(entities,ensure_ascii=False),encoding='utf8')

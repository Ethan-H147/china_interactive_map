import json,pathlib,subprocess,urllib.parse
root=pathlib.Path(__file__).resolve().parent
out=root/'statistics-sources'
mapping={}
for p in [root/'korea-sources/north-osm.json',*(root/'korea-sources/osm').glob('*.json')]:
 for e in json.loads(p.read_text(encoding='utf8')).get('elements',[]):
  if e.get('type')=='relation' and e.get('tags',{}).get('wikidata'):
   mapping['KP-'+str(e['id'])]=e['tags']['wikidata']
entities={};ids=sorted(set(mapping.values()))
for i in range(0,len(ids),50):
 url='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode({'action':'wbgetentities','ids':'|'.join(ids[i:i+50]),'props':'claims','format':'json'})
 raw=subprocess.check_output(['curl.exe','--fail','--silent','--show-error','--location',url])
 entities.update(json.loads(raw).get('entities',{}))
 print(len(entities),flush=True)
south={'KR-11':'Seoul','KR-26':'Busan','KR-27':'Daegu','KR-28':'Incheon','KR-30':'Daejeon','KR-31':'Ulsan','KR-36':'Sejong City','KR-41':'Gyeonggi Province','KR-51':'Gangwon Province, South Korea','KR-43':'North Chungcheong Province','KR-44':'South Chungcheong Province','KR-47':'North Gyeongsang Province','KR-48':'South Gyeongsang Province','KR-50':'Jeju Province','KR-52':'North Jeolla Province'}
url='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode({'action':'wbgetentities','sites':'enwiki','titles':'|'.join(south.values()),'props':'claims|sitelinks','format':'json','redirects':'yes'})
raw=subprocess.check_output(['curl.exe','--fail','--silent','--show-error','--location',url])
for q,e in json.loads(raw).get('entities',{}).items():
 title=e.get('sitelinks',{}).get('enwiki',{}).get('title')
 for key,t in south.items():
  if t==title:mapping[key]=q;entities[q]=e
(out/'korea-entities.json').write_text(json.dumps({'mapping':mapping,'entities':entities},ensure_ascii=False),encoding='utf8')

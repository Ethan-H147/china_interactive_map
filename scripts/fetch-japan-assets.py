import json,pathlib,subprocess,re,sys,urllib.parse
from lxml import html
sys.stdout.reconfigure(encoding='utf8')
root=pathlib.Path(__file__).resolve().parent.parent
source=root/'scripts/japan-sources'; flags=root/'dist/vendor/japan';flags.mkdir(exist_ok=True)
doc=html.fromstring((source/'flags.html').read_bytes())
table=next(t for t in doc.xpath('//table') if 'Geocode' in ''.join(t.xpath('.//th//text()')))
records={}
for row in table.xpath('.//tr'):
 cells=row.xpath('./td');text=' '.join(row.xpath('.//text()'));match=re.search(r'JP-\d\d',text)
 if not match or not row.xpath('.//img'):continue
 code=match[0]
 if code in records:continue
 image=row.xpath('.//img')[0];src=image.get('src');url='https://upload.wikimedia.org/wikipedia/'+src.split('/wikipedia/',1)[1]
 url=url.replace('/commons/thumb/','/commons/').rsplit('/',1)[0]
 page=image.get('resource').replace('en.wikipedia.org/wiki/','commons.wikimedia.org/wiki/')
 path=flags/(code+'.svg')
 if not path.exists():subprocess.run(['curl.exe','-fLsS','--retry','2',url,'-o',str(path)],check=True)
 assert '<svg' in path.read_text(encoding='utf8')
 records[code]={'url':url,'page':page,'file':'vendor/japan/'+code+'.svg'}
 print(code,flush=True)
assert len(records)==47
(source/'flags.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
for name,url in {
 'gdp-2023.xlsx':'https://www.esri.cao.go.jp/jp/sna/data/data_list/kenmin/files/contents/tables/2023/soukatu1.xlsx',
 'population-series.xlsx':'https://www.esri.cao.go.jp/jp/sna/data/data_list/kenmin/files/contents/tables/2023/soukatu9.xlsx',
 'fx.json':'https://api.worldbank.org/v2/country/JPN/indicator/PA.NUS.FCRF?format=json&per_page=100&date=2022:2023'
}.items():subprocess.run(['curl.exe','-fLsS',url,'-o',str(source/name)],check=True)

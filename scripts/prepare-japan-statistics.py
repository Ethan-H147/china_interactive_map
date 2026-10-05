import json,pathlib,re,sys,unicodedata,pandas as pd
from lxml import html
sys.stdout.reconfigure(encoding='utf8')
root=pathlib.Path(__file__).resolve().parent.parent;p=root/'scripts/japan-sources'
read=lambda n:json.loads((p/n).read_text(encoding='utf8'))
rows=read('prefectures.tables.json')[2]['rows'];flags=read('flags.json')
gdp=pd.read_excel(p/'gdp-2023.xlsx',header=None);pop=pd.read_excel(p/'population-series.xlsx',header=None)
fx={int(r['date']):r['value'] for r in read('fx.json')[1]}
norm=lambda s:''.join(c for c in unicodedata.normalize('NFD',s) if not unicodedata.combining(c)).lower()
old={norm(r[1]):r[3]*1e6 for r in read('gdp.tables.json')[0]['rows'][1:]}
sources={'japan-prefectures':{'title':'Wikipedia: Prefectures of Japan (2025 preliminary census and reported area)','url':'https://en.wikipedia.org/wiki/Prefectures_of_Japan','license':'CC BY-SA 4.0','retrieved':'2026-10-05'},'japan-gdp-2023':{'title':'Cabinet Office: FY2023 prefectural accounts, nominal gross prefectural product','url':'https://www.esri.cao.go.jp/jp/sna/data/data_list/kenmin/files/contents/main_2023.html','retrieved':'2026-10-05'},'japan-gdp-2022':{'title':'Wikipedia: FY2022 prefectural GDP, compiled from official statistics','url':'https://en.wikipedia.org/wiki/List_of_Japanese_prefectures_by_GDP','license':'CC BY-SA 4.0','retrieved':'2026-10-05'}}
doc=html.fromstring((p/'prefectures.html').read_bytes());table=doc.xpath('//table')[2]
articles={}
for tr in table.xpath('.//tr'):
 cells=tr.xpath('./td');links=tr.xpath('./td[1]//a[@href]')
 if links and cells:articles[''.join(cells[0].itertext()).strip()]=links[-1].get('href')
regions={};facts={}
for r in rows:
 code=r[13];num=int(code[-2:]);en=r[0];ja=r[1]
 gdprow=gdp.iloc[5+num];poprow=pop.iloc[5+num];assert str(gdprow[0]).zfill(2)==code[-2:]
 latest=gdprow[15];year=2023 if isinstance(latest,(int,float)) else 2022
 value=float(latest)*1e6 if year==2023 else old[norm(en)]
 population=float(poprow[15 if year==2023 else 14]);assert population>0
 source='japan-gdp-'+str(year);rate=fx[year]
 metric=lambda v:{'value':v,'currency':'JPY','year':year,'source':source,'usd':v/rate,'exchangeRate':rate,'exchangeSource':'worldbank-fx','note':'Japanese fiscal year '+str(year)+'. USD uses the calendar-year average exchange rate.'}
 record={'name':en,'country':'JP','level':1,'parent':None,'area':{'value':r[9],'unit':'km²','method':'reported','source':'japan-prefectures'},'gdp':metric(value),'gdpPerCapita':metric(value/population)}
 record['gdpPerCapita']['note']+=' Calculated as gross prefectural product divided by the same-year population in the Cabinet Office accounts (total population table); not prefectural income per person.'
 regions['japan:'+code]=record
 facts[code]={'population':r[6],'populationYear':2025,'flag':flags[code],'article':articles.get(en,'https://en.wikipedia.org/wiki/'+en.replace(' ','_')+'_Prefecture')}
assert len(regions)==47 and len(facts)==47
(p/'statistics.json').write_text(json.dumps({'sources':sources,'regions':regions},ensure_ascii=False),encoding='utf8')
(root/'dist/data/japan-facts.json').write_text(json.dumps(facts,ensure_ascii=False),encoding='utf8')
print('Japan records:',len(regions),'FY2023:',sum(r['gdp']['year']==2023 for r in regions.values()))

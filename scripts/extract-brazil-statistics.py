import sys,json,re,hashlib,zipfile,unicodedata
from pathlib import Path
import xlrd,openpyxl
from pypdf import PdfReader
root=Path('artifacts/brazil-statistics');out=Path('scripts/statistics-sources/brazil');out.mkdir(parents=True,exist_ok=True)
def norm(s):return unicodedata.normalize('NFKD',str(s).strip()).encode('ascii','ignore').decode().lower()
pop=json.loads((root/'population.txt').read_text(encoding='utf8'));gdp=json.loads((root/'gdp.json').read_text(encoding='utf8'))
assert len(pop)==len(gdp)==28
area=xlrd.open_workbook(root/'areaTable.xls');s=area.sheet_by_name('AR_BR_UF_2025');assert s.row_values(0)==['CD_UF','NM_UF','NM_UF_SIGLA','AR_UF_2025']
areas={str(s.cell_value(i,0)):s.cell_value(i,3) for i in range(1,s.nrows) if re.fullmatch(r'\d{2}',str(s.cell_value(i,0)))}
assert len(areas)==27
popbook=openpyxl.load_workbook(root/'populationTable.xlsx',data_only=True);ps=popbook['br_uf'];assert '2026' in ps.cell(1,1).value
pvalues={norm(row[0]):row[1] for row in ps.values if row[0] and isinstance(row[1],(int,float))}
with zipfile.ZipFile(root/'gdpTables.zip') as z:
 gs=xlrd.open_workbook(file_contents=z.read('tab01.xls')).sheet_by_index(0)
 assert gs.cell_value(3,14)==2023 and gs.cell_value(2,1)=='Produto Interno Bruto (1 000 000 R$)'
 gvalues={norm(gs.cell_value(i,0)):gs.cell_value(i,14)*1e6 for i in range(4,gs.nrows) if isinstance(gs.cell_value(i,14),(int,float))}
report=PdfReader(root/'stateReport.pdf');page=next((i,p.extract_text()) for i,p in enumerate(report.pages) if '129.790' in p.extract_text() and 'PIB - PRODUTO INTERNO BRUTO PER CAPITA' in p.extract_text())
cap={norm(m[1]):int(m[5].replace('.','')) for m in re.finditer(r'^(.+?)\s+(\d[\d.]*)\s+(\d[\d.]*)\s+(\d[\d.]*)\s+(\d[\d.]*)\s*$',page[1],re.M) if int(m[2].replace('.',''))>10000}
assert len(cap)==28 and cap['distrito federal']==129790
values={}
for p in pop[1:]:
 code=p['D1C'];name=p['D1N'];n=norm(name);gg=next(r for r in gdp[1:] if r['D1C']==code)
 assert p['D3C']=='2026' and p['MN']=='Pessoas' and p['D2C']=='9324'
 assert gg['D3C']=='2023' and gg['MN']=='Mil Reais' and gg['D2C']=='37'
 assert int(p['V'])==pvalues[n]
 assert abs(int(gg['V'])*1000-gvalues[n])<501
 values[code]={'name':name,'population':int(p['V']),'area':areas[code],'gdp':int(gg['V'])*1000,'gdpPerCapita':cap[n]}
assert sum(v['population'] for v in values.values())==pvalues['brasil']
assert abs(sum(v['area'] for v in values.values())-area.sheet_by_name('AR_BR_2025').cell_value(1,0))<.005
urls={'population.txt':'https://apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/2026/f/a','populationTable.xlsx':'https://ftp.ibge.gov.br/Estimativas_de_Populacao/Estimativas_2026/estimativa_dou_2026.xlsx','gdp.json':'https://apisidra.ibge.gov.br/values/t/5938/n3/all/v/37/p/2023/f/a','gdpTables.zip':'https://ftp.ibge.gov.br/Contas_Regionais/2023/xls/Especiais_2010_2023_xls.zip','areaTable.xls':'https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/areas_territoriais/2025/AR_BR_RG_UF_RGINT_RGI_MUN_2025.xls','stateReport.pdf':'https://sapl.al.am.leg.br/media/sapl/public/materialegislativa/2026/181682/mg_17_26.pdf','exchange.txt':'https://api.worldbank.org/v2/country/BRA/indicator/PA.NUS.FCRF?date=2023&format=json'}
raw={'retrieved':'2026-10-08','populationYear':2026,'populationDate':'2026-07-01','areaYear':2025,'gdpYear':2023,'gdpPerCapitaYear':2023,'gdpPerCapitaPdfPage':page[0]+1,'nationalPopulation':pvalues['brasil'],'nationalArea':area.sheet_by_name('AR_BR_2025').cell_value(1,0),'nationalGdp':gvalues['brasil'],'values':values,'sources':{k:{'url':u,'sha256':hashlib.sha256((root/k).read_bytes()).hexdigest()} for k,u in urls.items()}}
(out/'state-tables.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(out/'exchange-rate-2023.json').write_bytes((root/'exchange.txt').read_bytes())
print('Cross-checked all 27: population workbook/API, GDP workbook/API, national area/population totals; published GDP per capita from official report PDF page',page[0]+1)


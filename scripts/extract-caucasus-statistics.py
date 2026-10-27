import sys,gzip,io,re,json,hashlib,pathlib
from pypdf import PdfReader
import xlrd
root=pathlib.Path('scripts/boundary-sources/caucasus-gulf')
def raw(name):return gzip.open(root/(name+'.gz'),'rb').read()
arm=raw('armenia-population.pdf');text=PdfReader(io.BytesIO(arm)).pages[7].extract_text()
names={'Yerevan':'Yerevan','Aragatsotn':'Aragatsotn','Ararat':'Ararat','Armavir':'Armavir','Gegharqunik':'Gegharkunik','Lori':'Lori','Kotayk':'Kotayk','Shirak':'Shirak','Syunik':'Syunik','Vayots Dzor':'Vayots Dzor','Tavush':'Tavush'}
rows=[]
for line in text.splitlines():
 line=' '.join(line.split())
 for source,name in names.items():
  if line.endswith(source):
   numbers=re.findall(r'\d[\d ]*\.\d',line)
   if numbers:rows.append({'name':name,'population':round(float(numbers[0].replace(' ',''))*1000)})
assert len(rows)==11,rows
az=raw('azerbaijan-population.xls');s=xlrd.open_workbook(file_contents=az).sheet_by_index(0)
azrows=[{'name':s.cell_value(i,1).strip(),'population':round(s.cell_value(i,4)*1000),'areaKm2':s.cell_value(i,2)*1000} for i in range(s.nrows) if isinstance(s.cell_value(i,4),(float,int)) and isinstance(s.cell_value(i,2),(float,int))]
result={'armenia':{'year':2025,'date':'2025-01-01','sourceSha256':hashlib.sha256(arm).hexdigest(),'rows':rows},'azerbaijan':{'year':2026,'date':'2026-01-01','sourceSha256':hashlib.sha256(az).hexdigest(),'rows':azrows}}
(root/'census-normalized.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Extracted',len(rows),'Armenian regional rows and',len(azrows),'Azerbaijani territorial rows.')

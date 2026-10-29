import argparse,gzip,hashlib,io,json,re,sys
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--python-deps');args=parser.parse_args()
if args.python_deps:sys.path.insert(0,args.python_deps)
import xlrd
from pypdf import PdfReader
root=Path('scripts/boundary-sources/arabia-levant')
def raw(name):return gzip.decompress((root/(name+'.gz')).read_bytes())
def save(country,source,year,method,rows,**extra):
 data={'source':source,'sourceSha256':hashlib.sha256(raw(source)).hexdigest(),'year':year,'method':method,'rows':rows,**extra}
 (root/(country+'-population.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Use the census worksheet, not the workbook's separate 2010 civil-registration table.
book=xlrd.open_workbook(file_contents=raw('syria-census-2004.xls'));sheet=book.sheet_by_name('Admin1_Governorate')
rows=[{'id':sheet.cell_value(r,0),'en':sheet.cell_value(r,1).strip(),'ar':sheet.cell_value(r,2).strip(),'population':int(sheet.cell_value(r,3))} for r in range(1,sheet.nrows)]
assert len(rows)==14 and len({r['id'] for r in rows})==14
save('syria','syria-census-2004.xls',2004,'census',rows,note='2004 resident census. The separate 2010 civil-registration table is not used. Historical figures do not describe subsequent displacement.')
reader=PdfReader(io.BytesIO(raw('jordan-population-2025.pdf')));text=reader.pages[2].extract_text();names={'Amman':'JO-AM','Balqa':'JO-BA','Zarqa':'JO-AZ','Madaba':'JO-MD','Irbid':'JO-IR','Mafraq':'JO-MA','Jarash':'JO-JA','Ajlun':'JO-AJ','Karak':'JO-KA','Tafiela':'JO-AT',"Ma'an":'JO-MN','Aqaba':'JO-AQ'};rows=[]
for line in text.splitlines():
 nums=re.findall(r'\d{1,3}(?:,\d{3})+',line)
 for name,id in names.items():
  if line.strip().endswith(name) and len(nums)==3:
   rows.append({'id':id,'en':name,'ar':line.split(nums[0])[0].strip(),'population':int(nums[2].replace(',',''))})
assert len(rows)==12 and sum(r['population'] for r in rows)==11937000
save('jordan','jordan-population-2025.pdf',2025,'estimate',rows,date='2025-12-31',page=3,table='2.2')

import pypdfium2 as pdfium
reader=pdfium.PdfDocument(raw('oman-yearbook-2026.pdf'));text=reader[33].get_textpage().get_text_range()
names={'مسقط':'OM-MA','ظفار':'OM-ZU','مسندم':'OM-MU','البريمي':'OM-BU','الداخلية':'OM-DA','شمال الباطنة':'OM-BS','جنوب الباطنة':'OM-BJ','جنوب الشرقية':'OM-SJ','شمال الشرقية':'OM-SS','الظاهرة':'OM-ZA','الوسطى':'OM-WU'};rows=[]
for line in text.splitlines():
 for name,id in names.items():
  if line.startswith(name+' '):
   nums=re.findall(r'\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?',line)
   if len(nums)>=6:rows.append({'id':id,'ar':name,'population':int(nums[2].replace(',',''))})
assert len(rows)==11 and sum(r['population'] for r in rows)==5359557
save('oman','oman-yearbook-2026.pdf',2025,'register',rows,date='2025-12-31',page=34,table='2-6')
qa=Path('artifacts/pdf-source-qa');qa.mkdir(parents=True,exist_ok=True)
reader[33].render(scale=1.2).to_pil().save(qa/'oman-population-table.png')
jor=pdfium.PdfDocument(raw('jordan-population-2025.pdf'));jor[2].render(scale=1.2).to_pil().save(qa/'jordan-population-table.png')
print('Extracted Syria 2004 census, Jordan end-2025 estimates and Oman end-2025 registered population; official totals verified.')

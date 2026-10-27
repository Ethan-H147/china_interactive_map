import gzip, io, json, pathlib, hashlib
import openpyxl
root=pathlib.Path('scripts/boundary-sources/moldova-central-asia')
raw=gzip.open(root/'moldova-census.xlsx.gz','rb').read()
w=openpyxl.load_workbook(io.BytesIO(raw),data_only=True,read_only=True)
rows=[{'name':r[0],'population':int(r[7])} for r in w['T5'].iter_rows(min_row=8,max_row=49,max_col=8,values_only=True) if isinstance(r[0],str) and isinstance(r[7],(int,float))]
(root/'moldova-census-normalized.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(raw).hexdigest(),'year':2024,'date':'2024-04-08','table':'T5','rows':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Extracted Moldova census table T5:',len(rows),'rows, including published regional totals.')

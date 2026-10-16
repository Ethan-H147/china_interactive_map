# Counts Chile's 2024 census population by commune from INE's person-level microdata
# (viv_hog_per_censo2024.zip, https://censo2024.ine.gob.cl/resultados/) and writes the totals
# retained in scripts/statistics-sources/europe/chile-census-2024.json.
# Usage: py scripts/extract-chile-census.py path/to/viv_hog_per_censo2024.zip
import sys, zipfile, io, json, hashlib, datetime
import pyarrow.parquet as pq
path=sys.argv[1]
with zipfile.ZipFile(path) as z, z.open('personas_censo2024.parquet') as f:
    data=io.BytesIO(f.read())
counts={}
for code in pq.read_table(data,columns=['comuna']).column('comuna').to_pylist():
    counts[code]=counts.get(code,0)+1
sha=hashlib.sha256(open(path,'rb').read()).hexdigest()
out={'title':'Censo de Población y Vivienda 2024: personas censadas por comuna','publisher':'Instituto Nacional de Estadísticas (INE), Chile','url':'https://storage.googleapis.com/bktdescargascenso2024/viv_hog_per_censo2024.zip','page':'https://censo2024.ine.gob.cl/resultados/','archiveSHA256':sha,'date':'2024-06-30','retrieved':datetime.date.today().isoformat(),'national':sum(counts.values()),'values':{str(k).zfill(5):v for k,v in sorted(counts.items())}}
json.dump(out,open('scripts/statistics-sources/europe/chile-census-2024.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(len(counts),'communes,',out['national'],'people')

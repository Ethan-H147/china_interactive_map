import json,pathlib,subprocess,urllib.parse
root=pathlib.Path(__file__).resolve().parent/'statistics-sources'
base='https://data.1212.mn/api/v1/en/NSO/'+urllib.parse.quote('Economy, environment/National Accounts/REGIONAL GROSS DOMESTIC PRODUCT, by year/',safe='/,')
for name,table in [('gdp','DT_NSO_0500_007V1.px'),('per-capita','DT_NSO_0500_011V1.px')]:
 meta=json.loads((root/('mongolia-'+name+'-metadata.json')).read_text(encoding='utf8'))
 query={'query':[{'code':v['code'],'selection':{'filter':'item','values':v['values'][:3] if v['text']=='Year' else v['values']}} for v in meta['variables']],'response':{'format':'json-stat2'}}
 path=root/('mongolia-'+name+'-query.json');path.write_text(json.dumps(query,ensure_ascii=False),encoding='utf8')
 raw=subprocess.check_output(['curl.exe','--fail','--silent','--show-error','--location','-H','Content-Type: application/json','--data-binary','@'+str(path),base+table])
 (root/('mongolia-'+name+'.json')).write_bytes(raw)
 print(name,len(raw))

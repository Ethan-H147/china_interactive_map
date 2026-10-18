import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {csv} from './us-geography.mjs';
export const provinceNames={'10':'Newfoundland and Labrador','11':'Prince Edward Island','12':'Nova Scotia','13':'New Brunswick','24':'Quebec','35':'Ontario','46':'Manitoba','47':'Saskatchewan','48':'Alberta','59':'British Columbia','60':'Yukon','61':'Northwest Territories','62':'Nunavut'};
export const excludedTypes=new Set(['NO','SNO','RDA','SC','IRI','S-É','SÉ','TC','TI','TK','FD','SA','ID','CN']);
export const isMunicipalGovernment=(type,province)=>!excludedTypes.has(type)&&!(province==='13'&&type==='P');
export function canadaPopulation(){
 const retained='scripts/statistics-sources/canada/population-2025.csv.gz';const rows=csv(fs.existsSync(retained)?gunzipSync(fs.readFileSync(retained)).toString('utf8'):fs.readFileSync('artifacts/canada-source/population-2025.csv','utf8'));
 return new Map(rows.filter(r=>r.REF_DATE==='2025'&&/^2021A0005\d{7}$/.test(r.DGUID)).map(r=>[r.DGUID.slice(-7),{value:r.VALUE===''?null:Number(r.VALUE),status:r.STATUS,name:r.GEO}]));
}
export function canadaTargets(){
 const roster=JSON.parse(gunzipSync(fs.readFileSync('scripts/boundary-sources/canada/municipal-roster.json.gz'))).features,pop=canadaPopulation(),divisions=new Map(JSON.parse(gunzipSync(fs.readFileSync('scripts/boundary-sources/canada/division-roster.json.gz'))).features.map(f=>[String(f.properties.CDUID),f.properties]));
 return roster.map(f=>{const p=f.properties,code=String(p.CSDUID),population=pop.get(code);if(!population)throw Error('Population DGUID missing '+code);return{id:'CA-CSD-'+code,code,en:p.CSDNAME_E,local:p.SDRNOM,csdType:p.CSDTYPE,parent:'CA-CD-'+code.slice(0,4),parentName:divisions.get(code.slice(0,4)).CDNAME_E,province:code.slice(0,2),provinceName:provinceNames[code.slice(0,2)],population:population.value,populationStatus:population.status,eligible:isMunicipalGovernment(p.CSDTYPE,code.slice(0,2))};}).filter(r=>r.eligible&&r.population!==null).sort((a,b)=>b.population-a.population||a.id.localeCompare(b.id)).slice(0,500).map((r,i)=>({...r,rank:i+1}));
}
if(process.argv[1]?.endsWith('canada-municipalities.mjs')){
 const targets=canadaTargets();fs.writeFileSync('artifacts/canada-source/top500.json',JSON.stringify(targets,null,1));console.log('Canada top 500',targets[0],targets.at(-1));
}

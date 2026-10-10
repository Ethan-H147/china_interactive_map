import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';

const dir='scripts/statistics-sources/south-africa-settlements';
const output='dist/data/southern-africa/south-africa/settlements.json';
const snapshot=path.join(dir,'settlement-source.json');
const normalize=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function ringContains(p,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function contains(p,g){const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polygons.some(poly=>ringContains(p,poly[0])&&!poly.slice(1).some(r=>ringContains(p,r)));}
const modern={299007:['Gqeberha','Port Elizabeth'],299003:['Kariega','Uitenhage'],874065:['Mbombela','Nelspruit']};
const officialAudit={799035:{value:741651,url:'https://www.statssa.gov.za/?page_id=4286&id=11366'},599054:{value:595061,url:'https://www.statssa.gov.za/?page_id=4286&id=10350'},199041:{value:433688,url:'https://www.statssa.gov.za/?page_id=4286&id=331'},299007:{value:312392,url:'https://www.statssa.gov.za/?page_id=4286&id=6715'},798015:{value:957441,url:'https://www.statssa.gov.za/?page_id=4286&id=11306'}};

if(process.argv.includes('--extract')){
 const rows=fs.readFileSync(path.join(dir,'mainplaces-2011.csv'),'utf8').trim().split(/\r?\n/).slice(1).map(l=>{const f=l.split(',');return {code:f[0],name:f[1],population:+f[2],areaKm2:+f[4]};});
 const geometry=JSON.parse(fs.readFileSync(path.join(dir,'mainplaces.geojson'))).features;
 const geo=fs.readFileSync(path.join(dir,'ZA.txt'),'utf8').trim().split(/\r?\n/).map(l=>l.split('\t')).filter(f=>f[6]==='P'&&['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLC'].includes(f[7])).map(f=>({id:f[0],name:f[1],names:[f[1],f[2],...f[3].split(',')],center:[+f[5],+f[4]],kind:f[7],modified:f[18]}));
 const byName=new Map();for(const g of geo)for(const n of new Set(g.names.map(normalize))){if(!byName.has(n))byName.set(n,[]);byName.get(n).push(g);}
 const candidates=[];
 for(const f of geometry){const code=String(f.properties.MP_CODE),r=rows.find(r=>r.code===code);if(!r||!r.population||/\bNU\b/.test(r.name))continue;const censusName=code==='299007'?'Port Elizabeth':r.name;const names=[censusName,...(modern[code]||[])];const matches=[...new Set(names.flatMap(n=>byName.get(normalize(n))||[]))].filter(g=>contains(g.center,f.geometry)).sort((a,b)=>Number(normalize(b.name)===normalize(censusName))-Number(normalize(a.name)===normalize(censusName))||a.id.localeCompare(b.id));
  if(!matches.length)continue;const g=matches[0];candidates.push({...r,censusName,center:g.center,geonamesId:g.id,geonamesName:g.name,geonamesClass:g.kind,geonamesModified:g.modified,censusProvince:f.properties.PR_MDB_C,censusMunicipality:f.properties.MN_NAME});
 }
 candidates.sort((a,b)=>b.population-a.population||a.code.localeCompare(b.code));
 const selected=candidates.slice(0,500);
 for(const major of ['Pretoria','Durban','Port Elizabeth','Cape Town','Johannesburg'])if(!selected.some(r=>r.censusName===major))throw Error('Missing major settlement '+major);
 const files={};for(const n of ['mainplaces-2011.csv','MP_SA_20.zip','ZA.zip'])files[n]={sha256:createHash('sha256').update(fs.readFileSync(path.join(dir,n))).digest('hex')};
 fs.writeFileSync(snapshot,JSON.stringify({retrieved:'2026-10-09',files,eligible:candidates.length,records:selected},null,2)+'\n');
 console.log('Verified main-place point matches:',candidates.length,'selected:',selected.length);
}

const source=JSON.parse(fs.readFileSync(snapshot));
if(createHash('sha256').update(fs.readFileSync(path.join(dir,'mainplaces-2011.csv'))).digest('hex')!==source.files['mainplaces-2011.csv'].sha256)throw Error('Pinned census CSV changed; review the source update.');
const censusRows=new Map(fs.readFileSync(path.join(dir,'mainplaces-2011.csv'),'utf8').trim().split(/\r?\n/).slice(1).map(l=>{const f=l.split(',');return [f[0],{name:f[1],population:+f[2],areaKm2:+f[4]}];}));
const all=JSON.parse(zlib.gunzipSync(fs.readFileSync('dist/data/southern-africa/south-africa/all.bin')));
const catalogue=JSON.parse(zlib.gunzipSync(fs.readFileSync('dist/data/southern-africa/south-africa/catalogue.bin'))).records;
const terminal=all.levels.flatMap(l=>l.regions.features).filter(f=>{const r=catalogue.find(r=>r.id===f.properties.id);return r&&r.level>=2&&!catalogue.some(c=>c.parent===r.id);});
const records=source.records.map(r=>{
 const csv=censusRows.get(r.code);if(!csv||csv.name!==r.name||csv.population!==r.population||csv.areaKm2!==r.areaKm2)throw Error('Snapshot does not reproduce census CSV: '+r.code);
 const audited=officialAudit[r.code];if(audited&&audited.value!==r.population)throw Error('Official Stats SA population audit failed '+r.code);
 const parent=terminal.find(f=>contains(r.center,f.geometry));if(!parent)throw Error('No current municipality contains '+r.name);
 const parentRecord=catalogue.find(p=>p.id===parent.properties.id);let province=parentRecord;while(province.parent)province=catalogue.find(p=>p.id===province.parent);
 const renamed=modern[r.code];
 const en=renamed?.[0]||r.censusName;
 return {id:'ZA-C-'+r.code,en,name:en,kind:'Settlement',center:r.center,parentId:parentRecord.id,provinceId:province.id,aliases:renamed?[...new Set(renamed.slice(1).concat(r.censusName))].filter(n=>n!==en):[],population:{value:r.population,year:2011,source:audited?.url||'https://census2011.adrianfrith.com/place/'+r.code,periodLabel:'2011 census · main place',scope:'Census main place',scopeNote:'Census main place; municipal totals are separate.'},area:{value:r.areaKm2,unit:'km²',year:2011,source:'https://census2011.adrianfrith.com/place/'+r.code,scope:'Census main place'},areaKm2:r.areaKm2,provenance:{population:'Statistics South Africa Census 2011, reproduced by Adrian Frith',mainPlaceCode:r.code,censusName:r.name,censusMunicipality:r.censusMunicipality,geonamesId:r.geonamesId,coordinates:'https://www.geonames.org/'+r.geonamesId,coordinateMatch:'Named populated-place point inside the matching Census 2011 main-place polygon',...(audited?{officialPopulationAudit:audited.url}:{})}};
});
const sources=[{id:'statssa-census2011',title:'Statistics South Africa Census 2011',url:'https://www.statssa.gov.za/?page_id=3955',scope:'2011 main-place populations, not current city or metropolitan estimates'},{id:'frith-census2011',title:'Adrian Frith reproduction of Stats SA Census 2011',url:'https://census2011.adrianfrith.com/',dataURL:'https://stuff.adrianfrith.com/mainplaces-2011.csv',geometryURL:'https://stuff.adrianfrith.com/MP_SA_20.zip',description:'Census tabulations reproduced by a third party; checked against official Stats SA place pages for major cities.'},{id:'geonames',title:'GeoNames South Africa populated places',url:'https://www.geonames.org/',dataURL:'https://download.geonames.org/export/dump/ZA.zip',license:'CC BY 4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',description:'Coordinates only. Gazetteer population values are not used. Points must lie inside the identically named census main place.'}];
if(new Set(records.map(r=>r.id)).size!==500)throw Error('Expected 500 unique settlements');
fs.writeFileSync(output,JSON.stringify({country:'south-africa',records,sources,selection:{count:500,eligibleVerifiedMatches:source.eligible,method:'500 most populous Census 2011 main places with a matching populated-place gazetteer point inside their census polygon; non-urban municipal remainder areas excluded.'}},null,2)+'\n');
console.log('Prepared',records.length,'settlements with dated, scoped census population and current municipality containment.');

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {readXlsx} from './read-xlsx.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {command,fc} from './build-regional-dataset.mjs';

export const cyprusDetailRoot='scripts/boundary-sources/cyprus-details';
const retrieved='2026-10-18';
const mapService='https://eservices.dls.moi.gov.cy/arcgis/rest/services/National/AdminBoundaries_Indexes_EN/MapServer';
const censusUrl='https://cystatdb.cystat.gov.cy/api/v1/en/8.CYSTAT-DB/Population/Census%20of%20Population%20and%20Housing%202021/Population/Population%20-%20Place%20of%20Residence/1891114E.px';
const districtISO={1:'CY-01',2:'CY-06',3:'CY-04',4:'CY-03',5:'CY-02',6:'CY-05'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const censusQuery={query:[{code:'DISTRICT, MUNICIPALITY / COMMUNITY, QUARTER',selection:{filter:'all',values:['*']}},{code:'SEX',selection:{filter:'item',values:['0']}},{code:'AGE',selection:{filter:'item',values:['0']}}],response:{format:'json-stat2'}};
const query=new URLSearchParams({where:'1=1',outFields:'*',returnGeometry:'true',outSR:'4326',geometryPrecision:'6',orderByFields:'OBJECTID ASC',f:'geojson'});
const definitions={
 'geocodes2026-en.xlsx':{url:'https://library.cystat.gov.cy/NEW/Geocodes_with%20Toponyms-EN-090626.xlsx',license:'Official CYSTAT statistics; reuse with attribution',credit:'Statistical Service of the Republic of Cyprus, 2026 geographical classification',year:2026},
 'geocodes2026-el.xlsx':{url:'https://library.cystat.gov.cy/NEW/Geocodes_with%20Toponyms-EL-090626.xlsx',license:'Official CYSTAT statistics; reuse with attribution',credit:'Statistical Service of the Republic of Cyprus, 2026 geographical classification, Greek names',year:2026},
 'municipalities-communities.geojson':{url:mapService+'/12/query?'+query,pageSize:50,license:'CC BY 4.0',licenseUrl:'https://data.gov.cy/en/dataset/187',credit:'Republic of Cyprus Department of Lands and Surveys',year:2024},
 'municipalities-communities-metadata.json':{url:mapService+'/12?f=pjson',license:'CC BY 4.0',credit:'Republic of Cyprus Department of Lands and Surveys'},
 'census2021-metadata.json':{url:censusUrl,license:'Official CYSTAT statistics; reuse with attribution',credit:'Statistical Service of the Republic of Cyprus',year:2021},
 'census2021-totals.json':{url:censusUrl,method:'POST',body:censusQuery,license:'Official CYSTAT statistics; reuse with attribution',credit:'Statistical Service of the Republic of Cyprus, 2021 census, final results',year:2021},
 'boundary-license.html':{url:'https://data.gov.cy/en/dataset/187',license:'CC BY 4.0',credit:'Cyprus National Open Data Portal, Department of Lands and Surveys'},
 'statistics-license.pdf':{url:'https://library.cystat.gov.cy/NEW/DISSEMINATION_POLICY-EN.pdf',license:'Official CYSTAT statistics; reuse with attribution',credit:'Statistical Service of the Republic of Cyprus'},
 'classification-announcement.html':{url:'https://www.cystat.gov.cy/el/Announcement?id=74185',license:'Official CYSTAT information; reuse with attribution',credit:'Statistical Service of the Republic of Cyprus, 9 June 2026'}
};
function sourceBytes(name,manifest){const bytes=gunzipSync(fs.readFileSync(cyprusDetailRoot+'/'+name+'.gz'));assert.equal(sha(bytes),manifest.files[name].sha256,'Source checksum '+name);return bytes;}
function tableRows(bytes){const file=cyprusDetailRoot+'/.read-workbook.xlsx';fs.writeFileSync(file,bytes);try{const sheets=readXlsx(file);const rows=Object.values(sheets).find(rows=>rows[0]?.[0]?.includes('8')&&rows[0]?.[0]?.includes('GEOGRAPHICAL'));if(rows)return rows.filter(r=>/^\d{8}$/.test(String(r[0])));const greek=Object.values(sheets).find(rows=>rows.some(r=>/^\d{8}$/.test(String(r[0])))&&rows.filter(r=>/^\d{8}$/.test(String(r[0]))).length>600);assert(greek,'Greek 8-digit classification table');return greek.filter(r=>/^\d{8}$/.test(String(r[0])));}finally{fs.unlinkSync(file);}}
const historicalCode=p=>String(p.DIST_CODE)+String(p.VIL_CODE).padStart(3,'0');
const commonAliases={Lefkosia:['Nicosia'],Lemesos:['Limassol'],Pafos:['Paphos'],Larnaka:['Larnaca'],Keryneia:['Kyrenia','Girne'],Ammochostos:['Famagusta','Gazimağusa'],Geroskipou:['Yeroskipou'],Idalion:['Dali'],Lefkara:['Pano Lefkara'],'Agia Napa':['Ayia Napa']};

export async function fetchCyprusDetails(){
 fs.mkdirSync(cyprusDetailRoot,{recursive:true});
 const previous=fs.existsSync(cyprusDetailRoot+'/manifest.json')?JSON.parse(fs.readFileSync(cyprusDetailRoot+'/manifest.json')):{files:{}};
 const files={};
 for(const [name,meta]of Object.entries(definitions)){
  const file=cyprusDetailRoot+'/'+name+'.gz';let bytes;
  if(fs.existsSync(file)){bytes=gunzipSync(fs.readFileSync(file));if(previous.files[name])assert.equal(sha(bytes),previous.files[name].sha256,'Retained source checksum '+name);}
  else if(meta.pageSize){const features=[];for(let offset=0;offset<650;offset+=meta.pageSize){const url=meta.url+'&resultOffset='+offset+'&resultRecordCount='+meta.pageSize;const r=await fetch(url,{signal:AbortSignal.timeout(60000)});assert(r.ok,name+' page '+offset+' HTTP '+r.status);const data=await r.json();assert(Array.isArray(data.features),'DLS page features '+offset);features.push(...data.features);console.log('Cyprus geometry page',offset,data.features.length);if(data.features.length<meta.pageSize)break;}bytes=Buffer.from(JSON.stringify({type:'FeatureCollection',features}));fs.writeFileSync(file,gzipSync(bytes,{level:9}));}
  else{const r=await fetch(meta.url,{signal:AbortSignal.timeout(180000),...(meta.method?{method:meta.method,headers:{'Content-Type':'application/json'},body:JSON.stringify(meta.body)}:{})});assert(r.ok,name+' HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());fs.writeFileSync(file,gzipSync(bytes,{level:9}));}
  files[name]={...meta,bytes:bytes.length,sha256:sha(bytes)};console.log('Cyprus source',name,bytes.length);
 }
 const manifest={retrieved,files};fs.writeFileSync(cyprusDetailRoot+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 const details=await normalizeCyprusDetails(manifest);const bytes=Buffer.from(JSON.stringify(details));fs.writeFileSync(cyprusDetailRoot+'/normalized.json.gz',gzipSync(bytes,{level:9}));manifest.normalized={file:'normalized.json.gz',sha256:sha(bytes),bytes:bytes.length};fs.writeFileSync(cyprusDetailRoot+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');return details;
}
export function loadCyprusDetails(){const manifest=JSON.parse(fs.readFileSync(cyprusDetailRoot+'/manifest.json'));for(const name of Object.keys(manifest.files))sourceBytes(name,manifest);const bytes=gunzipSync(fs.readFileSync(cyprusDetailRoot+'/normalized.json.gz'));assert.equal(sha(bytes),manifest.normalized.sha256,'Normalized Cyprus source checksum');return JSON.parse(bytes);}
async function normalizeCyprusDetails(manifest){
 const raw=JSON.parse(sourceBytes('municipalities-communities.geojson',manifest));assert.equal(raw.features.length,613);assert(!raw.exceededTransferLimit,'Complete official boundary response');
 const rows=tableRows(sourceBytes('geocodes2026-en.xlsx',manifest)),greekRows=tableRows(sourceBytes('geocodes2026-el.xlsx',manifest));
 const greekByCode=new Map(greekRows.map(r=>[String(r[0]),r[2]]));
 const official=rows.map(r=>({code:String(r[0]),entity:String(r[1]).trim(),en:r[2],oldCode:String(r[3]),status:r[4]||'',local:greekByCode.get(String(r[0]))}));
 const byCode=new Map(official.map(r=>[r.code,r])),byOld=new Map(official.filter(r=>/^\d{4}$/.test(r.oldCode)).map(r=>[r.oldCode,r]));
 const municipalities=new Map(official.filter(r=>r.entity==='MUNICIPALITY').map(r=>[r.code.slice(0,4),r]));
 const census=JSON.parse(sourceBytes('census2021-totals.json',manifest)),geo=census.dimension[census.id[0]].category;
 const populations=new Map(Object.entries(geo.index).map(([code,index])=>[code,census.value[index]]));assert.equal(populations.get('TOTAL'),923381,'Official final 2021 government-controlled population');
 const unknown=raw.features.filter(f=>!byOld.has(historicalCode(f.properties))).map(f=>({code:historicalCode(f.properties),name:f.properties.VIL_NM_E}));assert.equal(unknown.length,0,'Every DLS boundary has an exact current-classification crosswalk');
 const rawByOld=new Map(raw.features.map(f=>[historicalCode(f.properties),f]));
 const records=[],secondParts=[],thirdParts=[],omittedPopulation=[];
 function makeRecord(u,level,parent,members){
  assert(u.local,'Greek current name '+u.code);const district=districtISO[+u.code[0]],id='CY-'+u.code;
  const partlyControlled=/occupied/i.test(u.status)||members.some(code=>/occupied/i.test(byOld.get(code)?.status||''));
  const vals=members.map(code=>populations.get(code)),complete=vals.every(v=>Number.isFinite(v));
  const aliases=[...new Set([u.local,...members.map(code=>rawByOld.get(code)?.properties.VIL_NM_E).filter(Boolean),...(commonAliases[u.en]||[])])];
  const record={id,code:u.code,sourceCode:u.code,oldCodes:members,level,parent,province:district,en:u.en,local:u.local,localLang:'el',names:{en:u.en,el:u.local},kind:u.entity==='MUNICIPALITY'?'Municipality':u.entity==='COMMUNITY'?'Community':'Municipal quarter',aliases,areaYear:2024,classificationYear:2026,sourceFields:{entity:u.entity,oldCode:u.oldCode,status:u.status},note:'Current Republic of Cyprus geographical classification (June 2026), including the July 2024 municipal mergers. The northern areas use Republic district and local-unit geography, not the separate de facto municipal system.'};
  if(complete&&!partlyControlled){record.population={value:vals.reduce((a,b)=>a+b,0),year:2021,date:'2021-10-01',method:members.length>1?'aggregate':'census',periodLabel:'2021 population census',source:'cystat2021',...(members.length>1?{note:'Sum of official 2021 predecessor-unit counts using the CYSTAT 2026 municipal crosswalk.'}:{})};}
  else{record.note+=' Whole-polygon population is omitted because the census covers government-controlled territory only or lacks a complete matching predecessor total.';omittedPopulation.push({id,status:u.status,missing:members.filter(code=>!Number.isFinite(populations.get(code)))});}
  records.push(record);return record;
 }
 for(const u of official){if(!['MUNICIPALITY','COMMUNITY'].includes(u.entity))continue;const children=official.filter(c=>c.entity==='MUNICIPAL QUARTER'&&c.code.slice(0,4)===u.code.slice(0,4));const members=children.length?children.map(c=>c.oldCode):[u.oldCode];assert(members.every(code=>rawByOld.has(code)),'Complete municipal members '+u.code);const rec=makeRecord(u,2,districtISO[+u.code[0]],members);for(const code of members)secondParts.push({type:'Feature',properties:{id:rec.id},geometry:rawByOld.get(code).geometry});}
 for(const u of official.filter(u=>u.entity==='MUNICIPAL QUARTER')){const parent=municipalities.get(u.code.slice(0,4));assert(parent,'Current quarter parent '+u.code);assert(rawByOld.has(u.oldCode),'Current quarter geometry '+u.code);const rec=makeRecord(u,3,'CY-'+parent.code,[u.oldCode]);thirdParts.push({type:'Feature',properties:{id:rec.id},geometry:rawByOld.get(u.oldCode).geometry});}
 const second=await command(fc(secondParts),'-dissolve2 id -clean gap-fill-area=0');const third=await command(fc(thirdParts),'-clean gap-fill-area=0');
 assert.equal(second.features.length,records.filter(r=>r.level===2).length);assert.equal(third.features.length,records.filter(r=>r.level===3).length);assert.equal(new Set(records.map(r=>r.id)).size,records.length);
 const report={oldDlsUnits:raw.features.length,rawAreaKm2:raw.features.reduce((n,f)=>n+geographicAreaKm2(f.geometry),0),secondAreaKm2:second.features.reduce((n,f)=>n+geographicAreaKm2(f.geometry),0),thirdAreaKm2:third.features.reduce((n,f)=>n+geographicAreaKm2(f.geometry),0),currentClassificationRows:official.length,second:second.features.length,municipalities:records.filter(r=>r.level===2&&r.kind==='Municipality').length,communities:records.filter(r=>r.kind==='Community').length,third:third.features.length,populationRecords:records.filter(r=>r.population).length,omittedPopulation,unknownCrosswalk:unknown,zeroPopulation:records.filter(r=>r.population?.value===0).map(r=>r.id),censusTotal:populations.get('TOTAL'),geometryNote:'Raw DLS administrative cadastral territory includes village areas inside the UK bases. The consuming map build must clip every level to its canonical Cyprus land and keep UK sovereign-base land separate. This helper does not align external borders. No place dots: the city/town areas are already municipal or community subdivisions.',levels:['Districts','Municipalities & communities','Municipal quarters'],excludedLevels:'The ordinary neighbourhood quarters (enories) below municipal quarters are not exposed as another atlas level. Rural community service clusters are cooperative groupings, not municipal governments, and are not substituted for the individual communities.'};
 return {version:1,retrieved,records,second,third,rawLocal:raw,crosswalk:official,districtCodeMap:districtISO,districtRecords:[],report,statisticsSources:{cystat2021:{title:'CYSTAT · 2021 census, final government-controlled-area population; current municipalities aggregated from exact predecessor codes',url:'https://cystatdb.cystat.gov.cy/pxweb/en/8.CYSTAT-DB/8.CYSTAT-DB__Population__Census%20of%20Population%20and%20Housing%202021__Population__Population%20-%20Place%20of%20Residence/1891114E.px/'}},sources:manifest.files};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const details=await fetchCyprusDetails();console.log('Cyprus official sources:',details.report.oldDlsUnits,'source units;',details.report.second,'municipalities/communities;',details.report.third,'municipal quarters;',details.report.populationRecords,'compatible population records before UK-base clipping.');}


// Official census counts for UK places below the 1,000-resident statistical base.
// Settlements: every smaller ONS 2022 built-up area (Census 2021), NRS 2022 settlement
// and NISRA settlement (Census 2021) from the retained statistics extracts. BUAs omitted
// from ONS's towns tables are summed from Census 2021 output areas, as for London.
// Parishes and Welsh communities: Census 2021 usual residents of their output areas
// (ONS best-fit lookup), split into residents inside and outside built-up areas.
// Usage: node scripts/fetch-uk-small-place-census.mjs [--refresh]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const refresh=process.argv.includes('--refresh'),cache='artifacts/europe-source/uk-small-places',statistics='scripts/statistics-sources/europe/',root='scripts/boundary-sources/uk-places/',minimum=1000;
const agent={'User-Agent':'boundary-atlas (github.com/Ethan-H147/china_interactive_map)'},arcgis='https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/';
fs.mkdirSync(cache,{recursive:true});
async function get(url,type='json'){for(let attempt=1;;attempt++){try{const r=await fetch(url,{headers:agent,signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(url+' '+r.status);return type==='json'?await r.json():await r.text();}catch(error){if(attempt>=4)throw error;await new Promise(r=>setTimeout(r,2000*attempt));}}}
async function cached(name,fetcher){const file=path.join(cache,name);if(!refresh&&fs.existsSync(file))return JSON.parse(fs.readFileSync(file));const data=await fetcher();fs.writeFileSync(file,JSON.stringify(data));return data;}
async function arcgisRows(service,fields,page){const rows=[];for(let offset=0;;offset+=page){const j=await get(`${arcgis}${service}/FeatureServer/0/query?where=1%3D1&outFields=${fields}&returnGeometry=false&resultOffset=${offset}&resultRecordCount=${page}&orderByFields=${fields.split(',')[0]}&f=json`);assert(!j.error,service+' '+JSON.stringify(j.error));rows.push(...j.features.map(f=>f.attributes));if(!j.exceededTransferLimit&&j.features.length<page)break;}return rows;}
const services={bua:'OA21_BUA22_LAD22_RGN22_EW_LU',parish:'OAs_2021_to_Civil_Parish_and_Non_Civil_Parished_Areas_to_LTLA_to_UTLA_to_Re_2022',points:'Parishes_and_Non_Civil_Parished_Areas_December_2022_EW_BSC_V3'},census='https://www.nomisweb.co.uk/datasets/c2021ts001';
const oaBua=await cached('oa-bua22.json',async()=>(await arcgisRows(services.bua,'OA21CD,BUA22CD,BUA22NM,BUA22NMW',1000)).map(r=>[r.OA21CD,r.BUA22CD||'',r.BUA22NM||'',r.BUA22NMW||'']));
const oaParish=await cached('oa-par22.json',async()=>(await arcgisRows(services.parish,'OA21CD,PAR22CD,PAR22NM,PAR22NMW,LTLA22CD',2000)).map(r=>[r.OA21CD,r.PAR22CD,r.PAR22NM,r.PAR22NMW||'',r.LTLA22CD]));
const parishPoints=await cached('par22-points.json',async()=>(await arcgisRows(services.points,'PARNCP22CD,PARNCP22NM,LONG,LAT',2000)).map(r=>[r.PARNCP22CD,r.PARNCP22NM,r.LONG,r.LAT]));
const oaPopulation=await cached('oa-census2021.json',async()=>{const rows=[];for(let offset=0;;offset+=25000){const lines=(await get(`https://www.nomisweb.co.uk/api/v01/dataset/NM_2021_1.data.csv?geography=TYPE150&c2021_restype_3=0&measures=20100&select=geography_code,obs_value&recordoffset=${offset}&recordlimit=25000`,'text')).trim().split('\n').slice(1);for(const l of lines){const [code,value]=l.replace(/"/g,'').split(',');rows.push([code,+value]);}if(lines.length<25000)break;}return rows;});
assert.equal(oaBua.length,188880,'Every 2021 output area in the BUA lookup');assert.equal(oaParish.length,188880,'Every 2021 output area in the parish lookup');assert.equal(oaPopulation.length,188880,'Census 2021 count for every output area');
const people=new Map(oaPopulation),builtUp=new Map(oaBua.map(([oa,bua])=>[oa,bua]));
// Output-area counts sum to within a few hundred of the published 59,597,542 national total.
assert(Math.abs([...people.values()].reduce((a,b)=>a+b,0)-59597542)<1000,'England and Wales Census 2021 usual residents');

// Settlements below the statistical base.
const read=name=>JSON.parse(fs.readFileSync(statistics+name)),ew=read('uk-bua-census2021.json'),points=read('uk-bua-2022-points.json'),scotland=read('scotland-settlements-2022.json'),ni=read('ni-settlements-2021.json');
const summed=new Map();for(const [oa,bua]of oaBua)if(bua&&!ew.values[bua]){const s=summed.get(bua)||{population:0,outputAreas:0};s.population+=people.get(oa);s.outputAreas++;summed.set(bua,s);}
const names=new Map(oaBua.filter(r=>r[1]).map(([,code,name,welsh])=>[code,{name,welsh}]));
const settlements=[];
for(const [code,point]of Object.entries(points.values)){
 const v=ew.values[code],sum=summed.get(code),population=v?v.population:sum?.population;
 if(!population||population>=minimum)continue;
 settlements.push({code,name:v?.name||names.get(code)?.name,welsh:point.welsh||names.get(code)?.welsh||'',population,center:point.center.map(x=>Math.round(x*1e5)/1e5),source:v?(v.source==='towns'?'ons-towns':'ons-oa'):'ons-oa',...(v?.outputAreas||sum?{outputAreas:v?.outputAreas||sum.outputAreas}:{})});
}
for(const [code,v]of Object.entries(scotland.values))if(v.population<minimum)settlements.push({code,name:v.name,population:v.population,center:v.center,source:'nrs'});
for(const [code,v]of Object.entries(ni.values))if(v.population<minimum&&v.center)settlements.push({code,name:v.name,censusName:v.censusName,population:v.population,center:v.center.map(x=>Math.round(x*1e5)/1e5),source:'nisra'});
assert(settlements.every(s=>s.name&&s.center.every(Number.isFinite)&&s.population>0),'Named, located, populated small settlements');

// Parishes (England) and communities (Wales), not unparished areas.
const located=new Map(parishPoints.map(([code,name,lon,lat])=>[code,{name,center:[Math.round(lon*1e5)/1e5,Math.round(lat*1e5)/1e5]}])),parishes=new Map();
for(const [oa,code,name,welsh,lad]of oaParish){if(!/^(E04|W04)/.test(code))continue;const p=parishes.get(code)||{code,name,welsh:welsh&&welsh!==name?welsh:'',lad,population:0,outsideBuiltUp:0,outputAreas:0,builtUpOutputAreas:0};p.population+=people.get(oa);p.outputAreas++;if(builtUp.get(oa)){p.builtUpOutputAreas++;}else p.outsideBuiltUp+=people.get(oa);parishes.set(code,p);}
const parishRows=[...parishes.values()].filter(p=>located.has(p.code)).map(p=>({...p,center:located.get(p.code).center})).sort((a,b)=>a.code.localeCompare(b.code));
const unlocated=[...parishes.keys()].filter(c=>!located.has(c));
const data={retrieved:new Date().toISOString().slice(0,10),minimum,sources:{
 builtUpAreas:{lookup:arcgis+services.bua,towns:ew.towns,points:points.source},
 scotland:scotland.source,northernIreland:ni.source,
 parishes:{lookup:arcgis+services.parish,points:arcgis+services.points},
 census
},settlements:settlements.sort((a,b)=>a.code.localeCompare(b.code)),parishes:parishRows,unlocatedParishes:unlocated};
const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(root+'small-place-census.json.gz',bytes);
const manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));
const source={id:'ons-small-place-census2021',title:'ONS Census 2021 usual residents (TS001) by output area, with the OA21 to BUA22 and OA21 to PAR22 best-fit lookups',url:census,lookups:[arcgis+services.bua,arcgis+services.parish,arcgis+services.points],license:'Open Government Licence v3.0',credit:'Source: Office for National Statistics licensed under the Open Government Licence v3.0. Contains OS data © Crown copyright and database right 2022.',description:'Counts for built-up areas omitted from the towns tables and for parishes and Welsh communities. Smaller NRS and NISRA settlements reuse the retained statistical sources.'};
manifest.sources=[...manifest.sources.filter(s=>s.id!==source.id),source];manifest.files['small-place-census.json.gz']={sha256:createHash('sha256').update(bytes).digest('hex')};fs.writeFileSync(root+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
const by=s=>settlements.filter(x=>x.source===s).length;
console.log('Small settlements',settlements.length,{onsTowns:by('ons-towns'),onsOutputAreas:by('ons-oa'),nrs:by('nrs'),nisra:by('nisra')},'parishes',parishRows.length,'unlocated',unlocated.length);

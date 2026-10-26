import fs from 'node:fs';import assert from 'node:assert/strict';import {gzipSync} from 'node:zlib';import {pathToFileURL} from 'node:url';import {load,landIndex,polygons,metres} from './geo-index.mjs';
export function prepareNorwayPlaces(){
 const root='scripts/boundary-sources/norway-places/',file='dist/data/europe/norway/settlements.json';
 if(!fs.existsSync(root+'urban-base.json.gz'))fs.writeFileSync(root+'urban-base.json.gz',gzipSync(JSON.stringify(load(file))));
 const data=load(root+'urban-base.json.gz'),urban=data.records.filter(r=>r.population),source=load(root+'places.json.gz'),manifest=load(root+'manifest.json'),catalogue=load('dist/data/europe/norway/catalogue.bin'),units=new Map(catalogue.records.map(r=>[r.id,r]));assert.equal(urban.length,1000);
 const areas=new Map(load('scripts/boundary-sources/nordic-settlements/norway-2026.geojson.gz').features.map(f=>[f.properties.tett_nr,landIndex(polygons(f.geometry).flat())]));
 const key=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,''),byName=new Map();
 for(const r of urban)for(const name of new Set([r.en,r.local,...r.aliases])){const k=key(name);if(!byName.has(k))byName.set(k,[]);byName.get(k).push(r);}
 const language={'Norsk':'nb','Nordsamisk':'se','Lulesamisk':'smj','Sørsamisk':'sma','Kvensk':'fkv','Finsk':'fi'},kinds={by:'City',tettsted:'Town',tettbebyggelse:'Settlement',grend:'Hamlet',bygdelagBygd:'Village'},records=[...urban],mapping=[],excluded=[];
 for(const p of source.places.sort((a,b)=>a.stedsnummer-b.stedsnummer)){
  if(p.stedstatus!=='aktiv'){excluded.push({id:p.stedsnummer,reason:p.stedstatus});continue;}
  const rawNames=p.stedsnavn.filter(n=>!['historisk','avslått','feil','utgått'].some(status=>n.skrivemåtestatus.includes(status)));
  const ordered=rawNames.sort((a,b)=>Number(b.navnestatus==='hovednavn')-Number(a.navnestatus==='hovednavn')||Number(b.skrivemåtestatus.includes('prioritert'))-Number(a.skrivemåtestatus.includes('prioritert'))||Number(a.skrivemåtestatus.includes('foreslått'))-Number(b.skrivemåtestatus.includes('foreslått')));
  if(!ordered.length){excluded.push({id:p.stedsnummer,reason:'No current public spelling'});continue;}const name=ordered[0].skrivemåte,aliases=[...new Set(ordered.map(n=>n.skrivemåte))],center=[p.representasjonspunkt.øst,p.representasjonspunkt.nord];assert(center.every(Number.isFinite));
  const parents=[...new Set((p.kommuner||[]).map(k=>'NO-M-'+k.kommunenummer).filter(id=>units.has(id)))];
  if(!parents.length&&p.fylker?.some(f=>f.fylkesnummer==='21'))parents.push('NO-SJ');
  assert(parents.length,'Municipal association '+p.stedsnummer+' '+name);const parent=units.get(parents[0]);
  const names={en:name};for(const n of ordered){const code=language[n.språk];if(code)names[code]??={name:n.skrivemåte};}
  const matches=[...new Set(aliases.flatMap(n=>byName.get(key(n))||[]))].filter(r=>r.parents.some(id=>parents.includes(id))&&areas.get(r.provenance.settlementCode)?.(center));
  let record;if(matches.length===1){record=matches[0];record.aliases=[...new Set([...record.aliases,...aliases])];record.names={...names,...record.names};(record.provenance.gazetteerIds??=[]).push(p.stedsnummer);}
  else{record={id:'NO-SSR-'+p.stedsnummer,en:name,name,local:name,names,aliases,kind:kinds[p.type],center,parentId:parent.id,parentName:parent.en,parents,provinceId:parent.level===1?parent.id:parent.parent,minzoom:p.type==='by'?6:p.type==='tettsted'?7:p.type==='tettbebyggelse'?8:9,provenance:{gazetteerId:p.stedsnummer,type:p.type,source:manifest.source}};records.push(record);}
  mapping.push({placeId:p.stedsnummer,recordId:record.id});
 }
 assert.equal(new Set(records.map(r=>r.id)).size,records.length);data.records=records.sort((a,b)=>a.id.localeCompare(b.id));data.sources.push({title:'Kartverket · national settlement names (SSR)',url:manifest.product,license:manifest.license,credit:manifest.credit});
 data.selection='All 1,000 SSB statistical urban areas plus every active Kartverket SSR city, town, built-up settlement, village and hamlet associated with Norway’s current counties and Svalbard. No population cutoff for named places. Farms, individual houses, neighbourhoods and historic settlements are excluded. Matching named centres within an SSB urban polygon share its existing page; other named places remain distinct. Population applies only to whole SSB urban areas.';
 data.coverage={urbanAreas:1000,sourcePlaces:source.places.length,activePlaces:mapping.length,excluded:excluded.length,merged:mapping.filter(m=>!m.recordId.startsWith('NO-SSR-')).length,total:records.length,classes:manifest.counts};
 fs.writeFileSync(file,JSON.stringify(data)+'\n');fs.writeFileSync(file.replace('.json','.bin'),gzipSync(JSON.stringify(data),{level:9}));fs.writeFileSync(root+'display-mapping.json',JSON.stringify({coverage:data.coverage,mapping,excluded}));
 const countrySource=load('dist/data/europe/norway/sources.json');countrySource.settlementCoverage=data.selection;countrySource.sources.kartverketSettlements={url:manifest.product,api:manifest.source,license:manifest.license,retrieved:manifest.retrieved};fs.writeFileSync('dist/data/europe/norway/sources.json',JSON.stringify(countrySource,null,2)+'\n');
 assert(records.some(r=>r.id==='NO-SSR-138567'&&r.en==='Årstein'&&r.parentId==='NO-M-5516'&&!r.population));console.log(data.coverage,'compressed bytes',fs.statSync(file.replace('.json','.bin')).size);return data;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)prepareNorwayPlaces();

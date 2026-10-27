import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import polygonClipping from 'polygon-clipping';
import {root,countries} from './fetch-central-asian-frontiers.mjs';
import {load,polygons,linesOf,lineIndex,metres} from './geo-index.mjs';
import {fc,command,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {partitionRegionalMask} from './partition-regional-mask.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {caspianWater} from './caucasus-gulf-water.mjs';
const osm=createRequire(import.meta.url)('osmtogeojson'),names=Object.keys(countries),area=d=>d.features.reduce((s,f)=>s+geographicAreaKm2(f.geometry),0);
const save=(path,data)=>{fs.mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(path,bytes);return bytes.length;};
const round=v=>typeof v==='number'?Math.round(v*1e6)/1e6:Array.isArray(v)?v.map(round):v;
const base=c=>'dist/data/europe/'+c+'/';
// Keep a reproducible input snapshot. Published population scope and the regional
// perimeter are independent of the international partition being corrected.
const baseline=root+'atlas-reference/';fs.mkdirSync(baseline,{recursive:true});
if(!fs.existsSync(root+'atlas-reference.json')){
 const files={};for(const c of names){const cat=load(base(c)+'catalogue.bin');for(const file of ['first.bin','catalogue.bin','statistics.json','context.bin','international.bin',...Object.values(cat.chunks||{}).map(x=>x.file)]){const target=baseline+c+'/'+file;fs.mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});const bytes=fs.readFileSync(base(c)+file);fs.writeFileSync(target,bytes);files[c+'/'+file]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};}}
 fs.writeFileSync(root+'atlas-reference.json',JSON.stringify({captured:'2026-10-26',description:'Existing local atlas geometry and independently sourced statistics before the shared Central Asian partition repair.',files},null,2)+'\n');
}
const sourceMeta=load(root+'sources.json'),raw=[];
for(const c of names){const bytes=gunzipSync(fs.readFileSync(root+c+'.json.gz')),source=sourceMeta.files[c+'.json'];assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);const data=JSON.parse(bytes),f=osm(data).features.find(f=>f.id==='relation/'+source.relation);assert(f&&!f.properties.tainted&&polygons(f.geometry).length,'Complete national relation '+c);raw.push({type:'Feature',properties:{id:c},geometry:{...f.geometry,coordinates:round(f.geometry.coordinates)}});}
const original=Object.fromEntries(names.map(c=>[c,load(baseline+c+'/first.bin').regions]));
const oldUnion=await command(fc(Object.values(original).flatMap(d=>d.features)),'-dissolve2 -clean gap-fill-area=0');
// The five countries contain all the region's foreign enclaves. Interior holes
// in their combined land are therefore water or missing coverage, not foreign
// territory. Reapply the retained lake masks after closing those coverage holes.
const outer=fc(oldUnion.features.map(f=>({...f,geometry:{type:'MultiPolygon',coordinates:polygons(f.geometry).map(p=>[p[0]])}})));
const water=fc([...load('scripts/boundary-sources/nordics/ne-lakes.json.gz').features,...load('dist/data/europe/kyrgyzstan/water.bin').features,...(await caspianWater()).features]);
const envelope=await command({'perimeter.json':outer,'water.json':water},'-erase water.json -dissolve2 -clean gap-fill-area=0',{precision:null});
assert(area(envelope)>3900000&&area(envelope)<4100000,'Retain the established regional footprint');
const partition=await partitionRegionalMask(fc(raw),envelope.features[0]);
// Include remote Caspian islands if the envelope was exported as separate features.
if(envelope.features.length>1)throw Error('Expected a dissolved regional MultiPolygon');
assert.equal(partition.features.length,5);const masks=new Map(partition.features.map(f=>[f.properties.id,f]));
for(let i=0;i<names.length;i++)for(let j=0;j<i;j++){const coordinates=polygonClipping.intersection(polygons(masks.get(names[i]).geometry),polygons(masks.get(names[j]).geometry));assert(geographicAreaKm2({type:'MultiPolygon',coordinates})<.001,'No overlapping country fills');}
save(root+'countries.bin',partition);save(root+'envelope.bin',envelope);
const reports={};
for(const c of names){
 const dir=base(c),cat=load(baseline+c+'/catalogue.bin'),stats=load(baseline+c+'/statistics.json'),first=await partitionRegionalMask(original[c],masks.get(c)),points=await command(first,'-points inner'),records=new Map(cat.records.map(r=>[r.id,r])),changed=[];
 assert.equal(first.features.length,original[c].features.length);
 const update=(feature,point)=>{const id=feature.properties.id,r=records.get(id),s=stats.regions[c+':'+id];assert(r&&s);r.center=point;r.bounds=geographicBounds(feature.geometry);const mapped=geographicAreaKm2(feature.geometry);if(s.area?.method==='mapped'){r.areaKm2=mapped;s.area.value=mapped;s.area.year=2026;}else if(!s.area)r.areaKm2=mapped;};
 first.features.forEach((f,i)=>{const old=original[c].features.find(o=>o.properties.id===f.properties.id);if(JSON.stringify(old.geometry)!==JSON.stringify(f.geometry))changed.push(f.properties.id);update(f,points.features[i].geometry.coordinates);});
 save(dir+'first.bin',{regions:first,boundaries:sharedBorders(first)});save(dir+'political.bin',first);
 // Contexts use the same full-resolution mask, including every enclave. Independent
 // simplification would reopen seams while the neighbouring country is inactive.
 save(dir+'context.bin',fc([{...masks.get(c),properties:{country:c}}]));
 for(const[parent,chunk]of Object.entries(cat.chunks||{})){const p=first.features.find(f=>f.properties.id===parent);assert(p,'Supported first-level detail parent');const old=load(baseline+c+'/'+chunk.file),supported=fc(old.regions.features.filter(f=>c!=='uzbekistan'||f.properties.id!=='UZ24410')),regions=await partitionRegionalMask(supported,p),centers=await command(regions,'-points inner');assert.equal(regions.features.length,supported.features.length);regions.features.forEach((f,i)=>update(f,centers.features[i].geometry.coordinates));const data={...old,regions,boundaries:sharedBorders(regions)};chunk.count=regions.features.length;chunk.bytes=save(dir+chunk.file,data);chunk.decodedBytes=Buffer.byteLength(JSON.stringify(data));}
 if(c==='uzbekistan'){
  const old=records.get('UZ24410'),place=load(root+'shirin-geocode.json.gz').find(r=>r.osm_type==='way'&&r.osm_id===140375240),center=[+place.lon,+place.lat];
  const point={id:old.id,en:'Shirin',local:'Shirin',localLang:'uz',names:old.names,kind:'City',parentId:'UZ24',center,minzoom:10,aliases:[old.en,...old.aliases],note:'City boundary unavailable; shown as a settlement point.',provenance:{place:'https://www.openstreetmap.org/way/140375240'}};
  fs.writeFileSync(dir+'settlements.json',JSON.stringify({records:[point],sources:[sourceMeta.files['shirin-geocode.json']],selection:'Shirin remains searchable as a settlement point. Its 0.12 km² OCHA administrative polygon lies across the retained national border and is not used as a city jurisdiction.'})+'\n');fs.writeFileSync(dir+'place-names-flags.json',JSON.stringify({places:{}})+'\n');
  cat.records=cat.records.filter(r=>r.id!=='UZ24410');cat.counts[2]=198;stats.regions[c+':UZ24410'].area=null;stats.regions[c+':UZ24410'].note=point.note;
 }
 save(dir+'catalogue.bin',cat);const national=Object.values(stats.regions).find(s=>s.level===0);if(national?.area?.method==='mapped')national.area.value=area(first);fs.writeFileSync(dir+'statistics.json',JSON.stringify(stats)+'\n');
 const sources=load(dir+'sources.json');sources.counts=cat.counts;if(c==='uzbekistan'&&!sources.coverage.includes('198 district/city polygons'))sources.coverage+=' The corrected display contains 198 district/city polygons; Shirin remains searchable as a settlement point because its retained administrative polygon lies across the national border.';sources.centralAsianFrontiers={source:'data/central-asian-frontiers-sources.json',method:'The five Central Asian countries share one retained OpenStreetMap national partition, including all enclaves. Existing external land frontiers and lake shorelines are retained; Caspian territorial water is excluded. Subdivision fills conform to their country and parent; country contexts and international strokes use the same boundaries.'};fs.writeFileSync(dir+'sources.json',JSON.stringify(sources,null,2)+'\n');
 reports[c]={changedRegions:changed,areaKm2:area(first),firstCount:first.features.length,chunks:Object.keys(cat.chunks||{}).length};console.log(c,reports[c]);
}
const shared=sharedBorders(partition),byOwner=Object.fromEntries(names.map(c=>[c,[]])),outerEdge=lineIndex(envelope.features.flatMap(f=>polygons(f.geometry).flat()));
for(const f of shared.features){const owners=f.properties.owners.slice().sort((a,b)=>names.indexOf(a)-names.indexOf(b));assert.equal(owners.length,2);const pair=owners.map(c=>countries[c].iso).sort().join('-');byOwner[owners[0]].push({...f,properties:{countries:owners.join(' '),pair,boundaryType:'land frontier',centralAsianReconciliation:true}});}
// Retain only the old strokes on the unchanged outside perimeter. Every old
// internal stroke, including unnamed Kyrgyz enclave loops, is replaced together.
for(const c of names)for(const f of load(baseline+c+'/international.bin').features)for(const path of linesOf(fc([f]))){let run;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],outside=[a,[(a[0]+b[0])/2,(a[1]+b[1])/2],b].every(p=>outerEdge(p)<.3);if(!outside){run=null;continue;}if(!run){run={...f,geometry:{type:'LineString',coordinates:[a]}};byOwner[c].push(run);}run.geometry.coordinates.push(b);}}
save(root+'resolved.bin',fc(Object.values(byOwner).flat()));
for(const c of names)save(root+'international/'+c+'.bin',lineData(fc(byOwner[c])));
const provenance={retrieved:sourceMeta.retrieved,source:'scripts/boundary-sources/central-asian-frontiers/sources.json',license:'© OpenStreetMap contributors · ODbL 1.0',sources:sourceMeta.files,method:'Joint five-country partition from the retained national OSM relations. The existing external land frontiers and retained lake masks remain fixed; the shared Natural Earth Caspian mask excludes territorial water. Regional gaps are closed within that perimeter, regional fills conform to the common national masks, and each shared frontier is stored once, including every enclave ring. Country contexts retain the full common boundary. Statistical values and their original dates remain unchanged; only mapped geometry areas and label anchors are recalculated.',reports,sharedPieces:shared.features.length};fs.writeFileSync(root+'report.json',JSON.stringify(provenance,null,2)+'\n');fs.writeFileSync('dist/data/central-asian-frontiers-sources.json',JSON.stringify(provenance,null,2)+'\n');
const {preserveCentralAsianFrontiers}=await import('./central-asian-frontiers.mjs');preserveCentralAsianFrontiers();

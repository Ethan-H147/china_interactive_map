import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fetchUSDetails,directory} from './fetch-us-details.mjs';
import {fc,command,load,polygons,bounds,borders,csv,write} from './us-geography.mjs';
const root='dist/data/europe/united-states/',pins=await fetchUSDetails(),catalogue=load(root+'catalogue.bin'),states=new Map(catalogue.records.filter(r=>r.level===1).map(r=>[r.id,r]));
const rows=csv(fs.readFileSync(directory+'/nanpa.csv','utf8').split('\n').slice(1).join('\n')),us=rows.filter(r=>r.COUNTRY==='US'&&r.USE==='G'&&r.IN_SERVICE==='Y');
assert.equal(us.length,378,'Review NANPA snapshot changes explicitly');
const active=new Map(us.map(r=>[r.NPA_ID,r])),source=load(directory+'/area-codes.geojson');
const legacy=new Map(source.features.filter(f=>f.properties.COUNTRY==='UNITED STATES').map(f=>[f.properties.NPA,f]));
const complex=text=>(text||'').split(',').map(s=>s.match(/\d{3}/g)||[]).filter(a=>a.length);
const merges=[['213','323','738'],['480','602','623']],rootCache=new Map();
const date=r=>new Date(r?.IN_SERVICE_DT||'2100-01-01').getTime();
function roots(code,trail=new Set()){
 if(rootCache.has(code))return rootCache.get(code);
 assert(!trail.has(code),'No circular overlay parent: '+code);trail=new Set([...trail,code]);
 const row=active.get(code);assert(row,'Active geographic code '+code);
 const merged=merges.find(g=>g.includes(code));let seeds;
 if(merged)seeds=merged.filter(c=>legacy.has(c));
 else {const groups=complex(row.OVERLAY_COMPLEX);if(groups.length)seeds=groups.flatMap(group=>{
  const candidates=group.filter(c=>legacy.has(c)&&complex(active.get(c)?.OVERLAY_COMPLEX).length<=1).sort((a,b)=>date(active.get(a))-date(active.get(b))||a.localeCompare(b));
  if(candidates.length)return [candidates[0]];
  if(row.PARENT_NPA_ID&&row.PARENT_NPA_ID!==code)return roots(row.PARENT_NPA_ID,trail);
  assert(legacy.has(code),'No geographic seed for '+code);return [code];
 });else if(legacy.has(code))seeds=[code];else seeds=roots(row.PARENT_NPA_ID,trail);}
 seeds=[...new Set(seeds)].sort();assert(seeds.length,code+' footprint');rootCache.set(code,seeds);return seeds;
}
for(const code of active.keys())roots(code);
const needed=new Set([...rootCache.values()].flat()),features=[...needed].map(code=>{const f=structuredClone(legacy.get(code));assert(f,'Public-domain footprint '+code);f.properties={id:code};if(legacy.get(code).properties.STATE==='AK')for(const p of polygons(f.geometry).flat(2))if(p[0]>0)p[0]-=360;return f;});
console.log('Simplifying',features.length,'reference footprints');
const simplified=await command(fc(features),'-simplify dp interval=.001 planar keep-shapes'),seeds=new Map(simplified.features.map(f=>[f.properties.id,f])),stateGeometry=new Map(load(root+'first.bin').regions.features.map(f=>[f.properties.id,f]));
const geometry=new Map(),regions=[],records=[],labels=[],groups=new Map();
for(const row of us){const state=row.LOCATION==='CNMI'?'MP':row.LOCATION,parent='US-'+state,key=roots(row.NPA_ID).join('-');assert(states.has(parent),parent);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row.NPA_ID);}
for(const [key,codes]of groups){
 const parent='US-'+(active.get(codes[0]).LOCATION==='CNMI'?'MP':active.get(codes[0]).LOCATION);
 let data=await command(fc(key.split('-').map(id=>({...seeds.get(id),properties:{}}))),'-dissolve');
 // Clip territory/state-wide codes to the same current coastline as administrative views.
 // The historic reference is generalized; current overlays inherit their documented parents.
 const state=stateGeometry.get(parent),mapshaper=(await import('mapshaper')).default;
 const output=await mapshaper.applyCommands('-i codes.json -clip state.json -o out.json format=geojson precision=.000001',{'codes.json':JSON.stringify(data),'state.json':JSON.stringify(fc([state]))});
 const clipped=JSON.parse(output['out.json']);data=clipped.type==='FeatureCollection'?clipped:clipped.type==='Feature'?fc([clipped]):fc([{type:'Feature',properties:{},geometry:clipped.type==='GeometryCollection'?{type:'MultiPolygon',coordinates:clipped.geometries.flatMap(g=>polygons(g))}:clipped}]);
 assert(data.features.length,key+' has mapped land');const shape=data.features.length===1?data.features[0].geometry:{type:'MultiPolygon',coordinates:data.features.flatMap(f=>polygons(f.geometry))};
 const b=bounds(shape),point=(await command(fc([{type:'Feature',properties:{},geometry:shape}]),'-points inner')).features[0].geometry.coordinates;
 geometry.set(key,shape);labels.push({id:'US-AREA-'+key,parent,level:2,en:codes.join(' / '),center:point,bounds:b,codes,footprint:key,primary:'US-NPA-'+codes[0]});
 for(const code of codes){const r=active.get(code),id='US-NPA-'+code;records.push({id,parent,parentName:states.get(parent).en,level:2,thematic:'area-codes',en:'Area code '+code,local:'',kind:'Telephone area',code,aliases:[code,'+1 '+code,'1-'+code],center:point,bounds:b,footprint:key,inService:r.IN_SERVICE_DT,overlays:[...new Set(complex(r.OVERLAY_COMPLEX).flat())].filter(c=>c!==code&&active.has(c)).sort(),note:r.NOTES||'',source:'https://www.nanpa.com/reports/npa-reports'});regions.push({type:'Feature',properties:{id,parent},geometry:shape});}
}
const nonGeographic=rows.filter(r=>r.USE==='N'&&r.IN_SERVICE==='Y'&&r.COUNTRY!=='CANADA'&&(r.COUNTRY==='US'||r.LOCATION==='NANP AREA'||!r.COUNTRY)).map(r=>({id:'US-NPA-'+r.NPA_ID,parent:null,level:2,thematic:'area-codes',nonGeographic:true,en:'Area code '+r.NPA_ID,kind:'Non-geographic service',code:r.NPA_ID,service:r.SERVICE||r.NOTES,aliases:[r.NPA_ID,r.SERVICE,r.NOTES].filter(Boolean),inService:r.IN_SERVICE_DT,source:'https://www.nanpa.com/reports/npa-reports'}));
const chunks={};
for(const [parent,state]of states){const subset=regions.filter(f=>f.properties.parent===parent);if(!subset.length)continue;
 // Mesh the unique coverage footprints, not repeated overlay polygons. Exterior coasts
 // belong to the selected outline; only edges between distinct areas are administrative-style lines.
 const unique=labels.filter(r=>r.parent===parent).map(r=>({type:'Feature',properties:{id:r.id},geometry:geometry.get(r.id.slice(8))}));
 const payload={regions:fc(subset.map(f=>({...f,properties:{id:f.properties.id}}))),boundaries:borders(fc(unique),{exterior:await command(fc(unique),'-dissolve')})},file='area-codes/'+parent+'.bin';
 chunks[parent]={file,count:subset.length,...write(root+file,payload)};
}
const planned=rows.filter(r=>r.COUNTRY==='US'&&r.USE==='G'&&r.ASSIGNED==='Yes'&&r.IN_SERVICE!=='Y').map(r=>({code:r.NPA_ID,state:r.LOCATION,date:r.IN_SERVICE_DT,parent:r.PARENT_NPA_ID,area:states.get('US-'+r.LOCATION)?.en||r.LOCATION}));
write(root+'area-codes/catalogue.bin',{records:[...records,...nonGeographic],labels,chunks,planned,asOf:pins.retrieved,counts:{geographic:records.length,nonGeographic:nonGeographic.length,planned:planned.length}});
write(root+'area-codes/sources.json',{retrieved:pins.retrieved,sources:['nanpa.csv','area-codes.geojson'].map(file=>({file,...pins.files[file]})),coverage:'All in-service geographic US NANP codes, including the five inhabited territories. Non-geographic US and shared NANP services are listed separately and have no polygon. Assigned future codes are not shown as active.',geometry:'Generalized public-domain UCLA 2015 reference footprints, clipped to Census 2025 state land and reconciled with NANPA 17 October 2026 assignments. New overlays use their parent footprint; multiple and partial overlays retain separate coverage. Los Angeles 213/323 and Phoenix 480/602/623 boundary eliminations are dissolved. These are reference areas, not address-level telephone-service guarantees. Later small rate-center boundary adjustments may not be reflected.',merges:[{codes:merges[0],url:'https://www.nanpa.com/sites/default/files/planning_letters/PL-492.pdf'},{codes:merges[1],url:'https://www.nanpa.com/sites/default/files/planning_letters/PL-576.pdf'}]});
console.log('US area codes:',records.length,'geographic,',nonGeographic.length,'non-geographic;',labels.length,'distinct footprints;',Object.keys(chunks).length,'lazy chunks.');

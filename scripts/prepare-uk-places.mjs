import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import proj4 from 'proj4';
import {load,landIndex,polygons,metres,lineIndex} from './geo-index.mjs';
import {combineLondonSettlements,londonRegion,londonId} from './london-settlement.mjs';

export function prepareUKPlaces(){
 const sourceRoot='scripts/boundary-sources/uk-places/',root='dist/data/europe/united-kingdom/',source=load(sourceRoot+'os-places.json.gz'),ni=load(sourceRoot+'osni-places.geojson'),geonames=load(sourceRoot+'geonames-ni.json.gz'),manifest=load(sourceRoot+'manifest.json'),data=load(sourceRoot+'statistical-base.json.gz'),catalogue=load(root+'catalogue.bin'),units=new Map(catalogue.records.map(r=>[r.id,r])),bundle=load(root+'all.bin');
 const children=new Set(catalogue.records.map(r=>r.parent)),leaves=bundle.levels.flatMap(l=>l.regions.features).filter(f=>!children.has(f.properties.id)),grid=new Map(),cell=.25;
 const shapes=leaves.map(f=>{const rings=polygons(f.geometry).flat(),box=[Infinity,Infinity,-Infinity,-Infinity];for(const ring of rings)for(const [x,y]of ring){box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y);}return{id:f.properties.id,box,inside:landIndex(rings),rings};});
 for(const shape of shapes){const b=shape.box;for(let x=Math.floor(b[0]/cell)-1;x<=Math.floor(b[2]/cell)+1;x++)for(let y=Math.floor(b[1]/cell)-1;y<=Math.floor(b[3]/cell)+1;y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(shape);}}
 const coastal=[];
 function container(center,sourceId){const candidates=grid.get(Math.floor(center[0]/cell)+','+Math.floor(center[1]/cell))||[],inside=candidates.find(s=>s.inside(center));if(inside)return inside.id;const near=candidates.map(s=>{s.distance??=lineIndex(s.rings);return{id:s.id,d:s.distance(center)};}).sort((a,b)=>a.d-b.d)[0];assert(near&&near.d<5000,'Gazetteer place outside mapped UK land: '+sourceId+' '+center);coastal.push({sourceId,parent:near.id,distanceMetres:Math.round(near.d)});return near.id;}
 const province=id=>{let r=units.get(id);while(r.parent)r=units.get(r.parent);return r.id;},key=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,''),namesOf=r=>[r.en,r.name,...(r.aliases||[]),...Object.values(r.names||{}).map(n=>n.name)].filter(Boolean);
 const records=data.records.map(r=>structuredClone(r)),candidates=new Map();
 function index(record){for(const name of namesOf(record)){const k=key(name);if(!candidates.has(k))candidates.set(k,[]);if(!candidates.get(k).includes(record))candidates.get(k).push(record);}}
 // Multi-town census areas retain their population and ID. Their component towns
 // get their own named-place points instead of inheriting a conurbation's count.
 // Index the real records, using only their displayed name for census matching.
 candidates.clear();for(const r of records){const k=key(r.en);if(!candidates.has(k))candidates.set(k,[]);candidates.get(k).push(r);if(r.en.startsWith('Greater ')){const k2=key(r.en.slice(8));if(!candidates.has(k2))candidates.set(k2,[]);candidates.get(k2).push(r);}}
 const mapping=[],counts={added:0,merged:0,london:0},languages={cym:'cy',wel:'cy',gla:'gd',sco:'sco',eng:'en'},transform=proj4('+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.060,0.1502,0.247,0.8421,-20.4894 +units=m +no_defs','EPSG:4326');
 const places=[...source.places.map(p=>({...p,source:'os',center:transform.forward([p.easting,p.northing])})),...ni.features.map(f=>({id:String(f.properties.OBJECTID),name:f.properties.PLACENAME.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase()),type:'Town or village',center:f.geometry.coordinates,source:'osni'})),...geonames.places.map(p=>({...p,type:'Settlement',source:'geonames'}))];
 for(const p of places){const sourceId=p.source+':'+p.id,center=p.center.map(v=>+v.toFixed(6)),parentId=container(center,sourceId),provinceId=province(parentId),allNames=[...new Set([p.name,p.alternate,...(p.aliases||[])].filter(Boolean))];if(provinceId===londonRegion){counts.london++;mapping.push({sourceId,recordId:londonId,action:'london'});continue;}
  const matches=[...new Set(allNames.flatMap(n=>candidates.get(key(n))||[]))].filter(r=>r.parentId===parentId&&metres(center,r.center)<3000).sort((a,b)=>metres(center,a.center)-metres(center,b.center));
  let record=matches[0];const names={};if(p.language&&languages[p.language])names[languages[p.language]]={name:p.name};if(p.alternate&&languages[p.alternateLanguage])names[languages[p.alternateLanguage]]={name:p.alternate};
  if(record){record.aliases=[...new Set([...(record.aliases||[]),...allNames])];record.names={...names,...record.names};(record.provenance.gazetteer??=[]).push({source:p.source,id:p.id,type:p.type});counts.merged++;}
  else{const english=p.alternateLanguage==='eng'?p.alternate:p.name;record={id:'GB-'+p.source.toUpperCase()+'-'+p.id,en:english,name:english,local:p.name,kind:p.type,names,aliases:allNames,center,parentId,parentName:units.get(parentId).en,provinceId,minzoom:({City:6,Town:7,Village:9,Hamlet:10,'Other Settlement':10,'Town or village':9,Settlement:10})[p.type],provenance:{gazetteer:[{source:p.source,id:p.id,type:p.type}]}};records.push(record);counts.added++;}
  index(record);mapping.push({sourceId,recordId:record.id,action:record.population?'census':'named-place'});
 }
 assert.equal(new Set(mapping.map(m=>m.sourceId)).size,places.length,'Each source place represented exactly once');assert.equal(new Set(records.map(r=>r.id)).size,records.length);
 data.records=records;data.sources.push(...manifest.sources);data.selection='All Ordnance Survey Open Names cities, towns, villages, hamlets and other settlements in Great Britain, supplemented by OSNI towns/villages and GeoNames populated places in Northern Ireland. No population cutoff for named places; suburban-area-only names, historical/deserted places and individual properties are excluded. Census populations remain attached to their whole statistical areas; newly added named places have no inferred population.';
 data.coverage={statisticalBase:load(sourceRoot+'statistical-base.json.gz').records.length,osPlaces:source.places.length,osClasses:source.types,osniPlaces:ni.features.length,geonamesNI:geonames.places.length,...counts,totalPoints:records.length,snapshot:manifest.snapshot,coastalAssignments:coastal.length};
 const result=combineLondonSettlements(data,catalogue,load(root+'statistics.json'));fs.writeFileSync(root+'settlements.json',JSON.stringify(result)+'\n');fs.writeFileSync(root+'settlements.bin',gzipSync(JSON.stringify(result),{level:9}));fs.writeFileSync(sourceRoot+'display-mapping.json',JSON.stringify({coverage:data.coverage,mapping,coastalAssignments:coastal})+'\n');const sources=load(root+'sources.json');sources.settlementCoverage=data.selection;sources.settlementSources=manifest.sources;fs.writeFileSync(root+'sources.json',JSON.stringify(sources,null,2)+'\n');console.log('UK named places:',data.coverage);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)prepareUKPlaces();

import fs from 'node:fs';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load,polygons,linesOf,landIndex,lineIndex} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {selectFrontierArc} from './frontier-arcs.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {alignSwissGermanLand} from './swiss-german-land.mjs';

export const sourceRoot='scripts/boundary-sources/alpine-lakes/';
export const lakeNames=['leman','constance'];
export function alpineWater(){return fc(lakeNames.map(name=>({type:'Feature',properties:{name,osmRelation:load(sourceRoot+name+'.json.gz')[0].osm_id},geometry:load(sourceRoot+name+'.json.gz')[0].geojson})));}
const boxes=[[6.14,46.20,6.94,46.53],[8.85,47.47,9.77,47.83]];
const near=g=>polygons(g).some(poly=>{const b=[Infinity,Infinity,-Infinity,-Infinity];for(const ring of poly)for(const [x,y]of ring){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}return boxes.some(q=>b[0]<=q[2]&&b[2]>=q[0]&&b[1]<=q[3]&&b[3]>=q[1]);});
const changed=new Set();
function save(file,data){const text=JSON.stringify(data),before=fs.existsSync(file)?gunzipSync(fs.readFileSync(file)).toString():null;if(text===before)return;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,gzipSync(text,{level:9}));changed.add(file);const compact=file.replace('dist/data/','dist/data/compact/');if(fs.existsSync(compact)){fs.writeFileSync(compact,gzipSync(encodeGeo(data,{source:createHash('sha256').update(text).digest('hex')}),{level:9}));changed.add(compact);}}
function saveJson(file,data){const text=JSON.stringify(data,null,2)+'\n';if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===text)return;fs.writeFileSync(file,text);changed.add(file);}
function lineCleaner(water){const inside=landIndex(water.features.flatMap(f=>polygons(f.geometry).flat())),shore=lineIndex(water.features.flatMap(f=>polygons(f.geometry).flat()));return data=>fc(data.features.flatMap(f=>{const paths=['Polygon','MultiPolygon'].includes(f.geometry.type)?polygons(f.geometry).flat():linesOf(fc([f])),kept=[];let touched=false;for(const p of paths){let run;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(inside(mid)||shore(mid)<45){touched=true;run=null;continue;}if(!run)kept.push(run=[a]);run.push(b);}}return touched?kept.map(coordinates=>({...f,geometry:{type:'LineString',coordinates}})):[f];}));}
async function maskRegions(data,water){const selected=data.features.filter(f=>near(f.geometry));if(!selected.length)return data;const masked=await command({'land.json':fc(selected),'water.json':water},'-erase water.json -clean gap-fill-area=0',{precision:.0000001}),byId=new Map(masked.features.map((f,i)=>[f.properties.id??f.properties.country??i,f]));
 // Process collections without stable IDs independently; regional collections
 // retain every administrative identity even when its land surface is empty.
 if(selected.some(f=>f.properties.id===undefined)){
  const features=[];for(const f of data.features){if(!near(f.geometry)){features.push(f);continue;}const clipped=await command({'land.json':fc([f]),'water.json':water},'-erase water.json -clean gap-fill-area=0',{precision:.0000001});features.push({...f,geometry:clipped.features[0]?.geometry||{type:'MultiPolygon',coordinates:[]}});}return {...data,features};
 }
 return {...data,features:data.features.map(f=>selected.includes(f)?{...f,geometry:byId.get(f.properties.id)?.geometry||{type:'MultiPolygon',coordinates:[]}}:f)};
}
async function maskPart(part,water,cleanLines){const regions=await maskRegions(part.regions,water);if(JSON.stringify(regions)===JSON.stringify(part.regions))return part;return {...part,regions,boundaries:lineData(cleanLines(part.boundaries)),selectionOutlines:cleanLines(fc(regions.features.flatMap(f=>polygons(f.geometry).flat().map(coordinates=>({type:'Feature',properties:f.properties,geometry:{type:'LineString',coordinates}})))))};}
export async function updateAlpineLabelPoints(base,cat){
 const records=new Map(cat.records.map(r=>[r.id,r])),seen=new Set();
 for(const file of ['first.bin',...Object.values(cat.chunks).map(c=>c.file)])for(const f of load(base+file).regions.features){
  if(seen.has(f.properties.id))continue;seen.add(f.properties.id);if(!near(f.geometry)&&polygons(f.geometry).length)continue;
  const record=records.get(f.properties.id),rings=polygons(f.geometry).flat();
  if(!rings.length){record.waterOnly=true;continue;}
  if(!landIndex(rings)(record.center)){const inner=await command(fc([f]),'-points inner',{precision:.0000001});record.center=inner.features[0].geometry.coordinates;}
 }
}
export async function maskAlpineWorld(){const water=alpineWater();for(const name of ['world-land.bin','flight-context.bin']){const file='dist/data/'+name;if(fs.existsSync(file)){const data=load(file);save(file,await maskRegions(data,water));}}const file='dist/data/world-land-sources.json',meta=load(file);meta.alpineWater={source:'data/alpine-lakes-sources.json',method:'Lac Léman and the complete Lake Constance surface are permanent land exclusions, without shoreline strokes.'};meta.bytes=fs.statSync('dist/data/world-land.bin').size;saveJson(file,meta);}
export async function reconcileAlpineLakes(){
 const water=alpineWater(),cleanLines=lineCleaner(water),reference=sourceRoot+'atlas-reference/';fs.mkdirSync(reference,{recursive:true});
 for(const [name,file]of [['swiss-first.bin','dist/data/europe/switzerland/first.bin'],['german-international.bin','dist/data/europe/germany/international.bin']])if(!fs.existsSync(reference+name)){fs.copyFileSync(file,reference+name);changed.add(reference+name);}
 const landAlignment=await alignSwissGermanLand({save,cleanLines});
 const swiss=await command(load(reference+'swiss-first.bin').regions,'-dissolve'),previous=load(reference+'german-international.bin'),old=previous.features.find(f=>f.properties.pair==='CHE-DEU');
 const arc=selectFrontierArc(swiss,old.geometry.coordinates).path,holes=swiss.features.flatMap(f=>polygons(f.geometry).flatMap(p=>p.slice(1))).filter(r=>r.every(([x,y])=>x>8.5&&x<8.9&&y>47.6&&y<47.8));
 const canonical=lineData(cleanLines(fc([arc,...holes].map(coordinates=>({type:'Feature',properties:{countries:['germany'],pair:'CHE-DEU',reference:'swisstopo swissBOUNDARIES3D 2026',alpineRepair:true},geometry:{type:'LineString',coordinates}})))));
 const borderFile='dist/data/europe/germany/international.bin',borders=load(borderFile);save(borderFile,fc([...borders.features.filter(f=>f.properties.pair!=='CHE-DEU'),...canonical.features]));
 for(const country of ['switzerland','france','germany']){
  const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin'),files=new Set(['first.bin',...(fs.existsSync(base+'all.bin')?['all.bin']:[]),...Object.values(cat.chunks).map(c=>c.file)]);
  for(const file of files){const data=load(base+file);const output=data.levels?{...data,levels:await Promise.all(data.levels.map(p=>maskPart(p,water,cleanLines)))}:await maskPart(data,water,cleanLines);if(output!==data)save(base+file,output);}
  for(const name of ['context.bin','neighbours.bin'])if(fs.existsSync(base+name))save(base+name,await maskRegions(load(base+name),water));
  save(base+'international.bin',lineData(cleanLines(load(base+'international.bin'))));
  await updateAlpineLabelPoints(base,cat);
  for(const chunk of Object.values(cat.chunks)){const bytes=fs.readFileSync(base+chunk.file);chunk.bytes=bytes.length;chunk.decodedBytes=gunzipSync(bytes).length;}save(base+'catalogue.bin',cat);
  const metadata=load(base+'sources.json');if(country==='germany'||country==='switzerland')metadata.swissGermanLand=landAlignment;metadata.alpineLakes={source:'data/alpine-lakes-sources.json',policy:'Mapped lake surfaces are excluded from land at every administrative level. No lake shoreline stroke is added; survey identities and statistics are retained.'};if(country==='germany'){metadata.frontiers=metadata.frontiers.filter(f=>f.pair!=='CHE-DEU');metadata.frontiers.push(...canonical.features.map(f=>({pair:'CHE-DEU',vertices:f.geometry.coordinates.length,endpointErrorMetres:0,method:'Complete Swiss survey outline, including Büsingen; mapped lake surfaces and shores excluded.'})));}saveJson(base+'sources.json',metadata);
 }
 // Keep the world fallback aligned with the same permanent lake exclusions.
 await maskAlpineWorld();
 for(const name of ['atlas-frontiers.bin','world-country-outlines.bin'])save('dist/data/'+name,lineData(cleanLines(load('dist/data/'+name))));
 save('dist/data/alpine-lakes.bin',water);
 saveJson('dist/data/alpine-lakes-sources.json',{retrieved:'2026-10-22',license:'© OpenStreetMap contributors · ODbL 1.0; Swiss survey © swisstopo',files:Object.fromEntries(lakeNames.map(name=>[name,{url:'https://www.openstreetmap.org/relation/'+water.features.find(f=>f.properties.name===name).properties.osmRelation,download:'https://nominatim.openstreetmap.org/lookup?osm_ids=R'+water.features.find(f=>f.properties.name===name).properties.osmRelation+'&format=jsonv2&polygon_geojson=1',sha256:createHash('sha256').update(gunzipSync(fs.readFileSync(sourceRoot+name+'.json.gz'))).digest('hex')}])),border:{source:'https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d',reference:reference+'swiss-first.bin',policy:'Use the complete retained Swiss survey edge for CHE-DEU, including Büsingen. Do not infer a sovereign boundary across Lake Constance.'}});
 fs.mkdirSync('artifacts/alpine-lakes',{recursive:true});fs.writeFileSync('artifacts/alpine-lakes/changed.json',JSON.stringify([...changed].sort(),null,2));console.log('Alpine lake repair:',changed.size,'files');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/alpine-lakes.mjs'))await reconcileAlpineLakes();

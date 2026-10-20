import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {load,polygons,landIndex,linesOf,lineIndex} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {readData} from './read-data.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {createHash} from 'node:crypto';
import {geographicAreaKm2} from './geographic-area.mjs';

export const khankaRoot='scripts/boundary-sources/khanka/';
export function khankaWater(){const geometry=load(khankaRoot+'osm-khanka.json.gz')[0].geojson;const round=v=>{if(typeof v[0]==='number'){v[0]=Math.round(v[0]*1e6)/1e6;v[1]=Math.round(v[1]*1e6)/1e6;}else v.forEach(round);};round(geometry.coordinates);return fc([{type:'Feature',properties:{name:'Lake Khanka / 兴凯湖',osmRelation:1125603},geometry}]);}
const save=(file,data)=>fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));
const near=g=>{let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const polygon of polygons(g))for(const ring of polygon)for(const [x,y]of ring){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return x0<132.86&&x1>131.98&&y0<45.35&&y1>44.52;};
const assertVoid=rings=>{if(rings.length!==1)throw Error("The original lake void must be identified uniquely");};
let patchPromise;
async function russianWaterPatch(){
 return patchPromise??= (async()=>{
  const old=load('scripts/additional-sources/water/ne_10m_lakes.geojson').features.filter(f=>f.properties.name==='Lake Khanka');
  const political=load(khankaRoot+'china-political-reference.bin'),original=load(khankaRoot+'atlas-reference/first.bin').regions.features.find(f=>f.properties.id==='RU-PRI');
  const pair=await command(fc([...political.features,original].map(f=>({...f,properties:{}}))),'-dissolve2 -clean gap-fill-area=0');
  const previousVoid=pair.features.flatMap(f=>polygons(f.geometry).flatMap(p=>p.slice(1))).filter(r=>landIndex([r])([132.4,44.9]));
  assertVoid(previousVoid);
  old.push(...previousVoid.map(r=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[r]}})));

  return command({'lake.json':fc([...old,...khankaWater().features].map(f=>({...f,properties:{}}))),'china.json':load(khankaRoot+'china-political-reference.bin')},'-dissolve2 -erase china.json -clean gap-fill-area=0');
 })();
}
async function maskFeature(f,restore=false){
 if(!restore){
  const overlap=await command({'land.json':fc([{...f,properties:{}}]),'water.json':khankaWater()},'-clip water.json -clean gap-fill-area=0');
  if(!overlap.features.some(g=>g.geometry&&geographicAreaKm2(g.geometry)>1e-8))return f;
 }

 const input=fc([{...f,properties:{}},...(restore?(await russianWaterPatch()).features:[])]);
 const result=await command({'land.json':input,'water.json':khankaWater()},(restore?'-dissolve2 ':'')+'-erase water.json -dissolve2 -clean gap-fill-area=0');
 if(result.features.length!==1)throw Error('Khanka masking must retain each administrative feature');
 return {...f,geometry:result.features[0].geometry};
}
async function maskCollection(data,{restore=false}={}){
 const features=[];for(const f of data.features)features.push(near(f.geometry)?await maskFeature(f,restore):f);return {...data,features};
}
export async function maskKhankaWorld(){
 if(!fs.existsSync(khankaRoot+'sources.json'))return;
 for(const name of ['world-land.bin','flight-context.bin','china-context.bin','china-neighbours.bin']){
  const file='dist/data/'+name;if(fs.existsSync(file))save(file,await maskCollection(load(file)));
 }
 const metaFile='dist/data/world-land-sources.json';if(fs.existsSync(metaFile)){const meta=load(metaFile);meta.khankaWater={source:'data/khanka-water-sources.json',license:'© OpenStreetMap contributors · ODbL 1.0',method:'Full satellite-checked Lake Khanka shoreline is excluded from permanent land independently of the optional major-water overlay.'};meta.bytes=fs.statSync('dist/data/world-land.bin').size;fs.writeFileSync(metaFile,JSON.stringify(meta,null,2)+'\n');}
}
export async function reconcileKhanka(){
 if(!fs.existsSync(khankaRoot+'sources.json'))return;
 const water=khankaWater(),display=readData('display-boundaries.json');
 for(const key of ['provinces','subdivisions'])display[key]=await maskCollection(display[key]);
 // Preserve all administrative meshes. The lake changes land coverage, not jurisdictions.
 const json=Buffer.from(JSON.stringify(display)),zip=gzipSync(json,{level:9}),parts=[];
 for(let i=0;i<zip.length;i+=4*1024*1024){const file='display-boundaries.'+String(parts.length).padStart(2,'0')+'.bin';parts.push(file);fs.writeFileSync('dist/data/'+file,zip.subarray(i,i+4*1024*1024));}
 fs.writeFileSync('dist/data/display-boundaries.parts.json',JSON.stringify({compression:'gzip',parts,compressedBytes:zip.length,uncompressedBytes:json.length,sha256:createHash('sha256').update(json).digest('hex')},null,2));
 const countyFile='dist/data/china-counties.bin';if(fs.existsSync(countyFile)){const data=load(countyFile);data.regions=await maskCollection(data.regions);save(countyFile,data);}
 const base='dist/data/russia/',first=load(base+'first.bin'),parent=first.regions.features.find(f=>f.properties.id==='RU-PRI'),repaired=await maskFeature(parent,true);first.regions.features=first.regions.features.map(f=>f===parent?repaired:f);save(base+'first.bin',first);
 const file=base+'second/RU-PRI.bin',children=load(file);children.regions=await maskCollection(children.regions);
 // Fill only coastline slivers exposed by the old generalized lake hole. Internal
 // district strokes stay verbatim; ownership comes from the closest existing district.
 const gaps=await command({'parent.json':fc([repaired]),'children.json':children.regions},'-erase children.json -explode -clean gap-fill-area=0');

 const additions=[];
 if(gaps.features.length){
  const distances=children.regions.features.map(f=>({f,distance:lineIndex(polygons(f.geometry).flat())})),shore=lineIndex(polygons(water.features[0].geometry).flat());
  for(const gap of gaps.features){
   if(!near(gap.geometry)||polygons(gap.geometry).flat(2).length<4||geographicAreaKm2(gap.geometry)<.000001)continue;
   const point=(await command(fc([gap]),'-points inner')).features[0]?.geometry.coordinates;if(!point||shore(point)>2500)continue;
   const nearest=distances.reduce((a,b)=>a.distance(point)<b.distance(point)?a:b);
   additions.push({...gap,properties:nearest.f.properties});
  }
 }
 if(additions.length){const properties=new Map(children.regions.features.map(f=>[f.properties.id,f.properties]));children.regions=await command(fc([...children.regions.features,...additions]),'-dissolve2 id -clean gap-fill-area=0');for(const f of children.regions.features)f.properties=properties.get(f.properties.id);}

 children.regions=await command({'children.json':children.regions,'parent.json':fc([repaired])},'-clip parent.json -clean gap-fill-area=0');
 const before=load(khankaRoot+'atlas-reference/second/RU-PRI.bin').regions.features;
 if(before.length!==children.regions.features.length||before.some(f=>!children.regions.features.some(g=>g.properties.id===f.properties.id&&geographicAreaKm2(g.geometry)>.9*geographicAreaKm2(f.geometry))))throw Error('Khanka repair must retain all districts and their inland areas');
 save(file,children);
 const catFile=base+'catalogue.bin',cat=load(catFile),chunk=cat.chunks['RU-PRI'];chunk.bytes=fs.statSync(file).size;chunk.decodedBytes=Buffer.byteLength(JSON.stringify(children));const shapes=new Map([repaired,...children.regions.features].map(f=>[f.properties.id,f]));for(const r of cat.records){const f=shapes.get(r.id);if(f&&!landIndex(polygons(f.geometry).flat())(r.center))r.center=(await command(fc([f]),'-points inner')).features[0].geometry.coordinates;}save(catFile,cat);
 save(base+'context.bin',await maskCollection(load(base+'context.bin'),{restore:true}));
 // Use the existing political outline across the water instead of inferring a
 // frontier from shore proximity, which previously left a long missing section.
 const reference=load(khankaRoot+'frontier.json'),distance=lineIndex(linesOf(reference)),features=[];
 for(const f of load(base+'international.bin').features){if(f.properties.canonicalBorder==='khanka')continue;for(const path of linesOf(fc([f]))){let run;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];if([a,m,b].every(p=>distance(p)<2)){run=null;continue;}if(!run){run=[a];features.push({...f,geometry:{type:'LineString',coordinates:run}});}run.push(b);}}}save(base+'international.bin',lineData(fc([...features,...reference.features])));
 for(const name of ['major-water.bin','major-water-original.bin']){const target='dist/data/'+name,data=load(target);data.features=data.features.filter(f=>!(f.properties.kind==='lake'&&/khanka/i.test(f.properties.name)));save(target,data);}
 const metaFile='dist/data/major-water-sources.json',meta=load(metaFile);meta.lakes=load('dist/data/major-water.bin').features.filter(f=>f.properties.kind==='lake').length;meta.coverage=meta.coverage.replace('Lake Khanka is shown in full. ','');meta.permanentCrossBorderLakes={khanka:'data/khanka-water-sources.json'};fs.writeFileSync(metaFile,JSON.stringify(meta,null,2)+'\n');
 save('dist/data/khanka-water.bin',water);fs.copyFileSync(khankaRoot+'sources.json','dist/data/khanka-water-sources.json');const sources=load(base+'sources.json');sources.khankaWater={source:'data/khanka-water-sources.json',policy:'Satellite-checked lake land mask; existing international reference and internal district strokes retained.'};fs.writeFileSync(base+'sources.json',JSON.stringify(sources,null,2)+'\n');
 await maskKhankaWorld();console.log('Khanka: permanent shoreline on both sides; continuous international border; optional overlay removed.');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/khanka-water.mjs'))await reconcileKhanka();

import fs from 'node:fs';import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {load,polygons,landIndex} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';import {encodeGeo} from '../dist/geo-pack.mjs';
const base='dist/data/europe/canada/',sourceRoot='scripts/boundary-sources/canada-lakes/',hash=b=>createHash('sha256').update(b).digest('hex');
export function canadaLakeWater(){const bytes=gunzipSync(fs.readFileSync(sourceRoot+'lakes.geojson.gz')),pin=load(sourceRoot+'source.json');if(hash(bytes)!==pin.sha256)throw Error('Canadian lake source changed');return JSON.parse(bytes);}
const paths=g=>g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:polygons(g).map(p=>p[0]);
function boxes(g){return paths(g).map(r=>r.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]));}
const intersects=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
function save(file,data){const text=JSON.stringify(data),bytes=gzipSync(text,{level:9});if(fs.existsSync(file)&&gunzipSync(fs.readFileSync(file)).toString()===text)return false;fs.writeFileSync(file,bytes);const compact=file.replace('dist/data/','dist/data/compact/');if(fs.existsSync(compact))fs.writeFileSync(compact,gzipSync(encodeGeo(data,{source:hash(text)}),{level:9}));return true;}
function saveJson(file,data){const text=JSON.stringify(data,null,2)+'\n';if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==text)fs.writeFileSync(file,text);}
export async function maskCanadaLakes({areaCodesOnly=false,worldOnly=false}={}){
 const signature=load(sourceRoot+'source.json').sha256+':2',water=canadaLakeWater(),waterBoxes=water.features.flatMap(f=>boxes(f.geometry)),waterInside=landIndex(water.features.flatMap(f=>polygons(f.geometry).flat()));
 const near=g=>boxes(g).some(b=>waterBoxes.some(w=>intersects(b,w))),changed=[],changedRegions=new Map(),empty=[];
 const independentCache=new Map();
 async function erase(data,{regions=false,independent=false,clean=false}={}){
  // Telephone overlays can have identical, overlapping footprints. Clip each
  // distinct footprint on its own so every overlay receives the same holes.
  if(independent){let touched=false;const features=[];for(const f of data.features){if(!near(f.geometry)){features.push(f);continue;}const key=JSON.stringify(f.geometry);let geometry=independentCache.get(key);if(!geometry){const result=await erase(fc([f]),{regions});geometry=result.features[0]?.geometry;if(!geometry)throw Error('Lost area-code footprint '+f.properties.id);independentCache.set(key,geometry);}if(JSON.stringify(geometry)!==key){touched=true;changedRegions.set(f.properties.id,{...f,geometry});}features.push({...f,geometry});}return touched?{...data,features}:data;}
  const candidates=data.features.map((f,i)=>({f,i})).filter(({f})=>f.geometry&&near(f.geometry));if(!candidates.length)return data;
  const input=fc(candidates.map(({f,i})=>({...f,properties:{_lakeFeatureIndex:i}}))),result=await command({'land.json':input,'water.json':water},(clean?'-clean gap-fill-area=0 ':'')+'-erase water.json',{precision:.0000001}),masked=new Map(result.features.filter(f=>f.geometry).map(f=>[f.properties._lakeFeatureIndex,f.geometry]));let touched=false;
  const features=data.features.flatMap((f,i)=>{if(!candidates.some(c=>c.i===i))return [f];const geometry=masked.get(i);if(!geometry){if(regions){empty.push(f.properties.id);return [{...f,geometry:{type:'MultiPolygon',coordinates:[]}}];}touched=true;return [];}
   if(JSON.stringify(geometry)===JSON.stringify(f.geometry))return [f];touched=true;if(regions&&f.properties.id)changedRegions.set(f.properties.id,{...f,geometry});return [{...f,geometry}];});
  return touched?{...data,features}:data;
 }
 async function moveCenters(cat,geometries){for(const r of cat.records){const f=geometries.get(r.id);if(!f||!waterInside(r.center))continue;const points=await command(fc([f]),'-points inner',{precision:.0000001});r.center=points.features[0].geometry.coordinates;}}
 async function part(file){const data=load(file);if(data.canadaLakeMask===signature||!data.regions.features.some(f=>near(f.geometry)))return;const regions=await erase(data.regions,{regions:true,independent:file.includes("/area-codes/")}),boundaries=await erase(data.boundaries);
  if(empty.length)throw Error('Lake source would erase complete administrative units: '+empty.join(', '));
  const output={...data,regions,boundaries:lineData(boundaries),canadaLakeMask:signature};delete output.selectionOutlines;
  if(save(file,output))changed.push(file);
 }
 async function collection(file){const data=load(file),overview=file.endsWith('globe-overview-land.bin'),collectionSignature=signature+(overview?':clean':'');if(data.canadaLakeMask===collectionSignature||!data.features.some(f=>near(f.geometry)))return;const masked=await erase(data,{regions:true,clean:overview});masked.canadaLakeMask=collectionSignature;if(save(file,masked))changed.push(file);}
 if(!areaCodesOnly){
  if(!worldOnly){const cat=load(base+'catalogue.bin');for(const file of ['first.bin',...Object.values(cat.chunks).map(c=>c.file)])await part(base+file);await moveCenters(cat,changedRegions);for(const ch of Object.values(cat.chunks)){const bytes=fs.readFileSync(base+ch.file);ch.bytes=bytes.length;ch.decodedBytes=gunzipSync(bytes).length;}save(base+'catalogue.bin',cat);
   await collection(base+'context.bin');
   const source=load(base+'sources.json');source.lakes={source:'data/canada-lakes-sources.json',names:load(sourceRoot+'source.json').names,policy:'Mapped lake surfaces are excluded from all administrative land displays. Administrative identities, official land areas and population scopes remain unchanged. Lake shores are not administrative boundary strokes.'};fs.writeFileSync(base+'sources.json',JSON.stringify(source)+'\n');
  }
  for(const file of ['dist/data/world-land.bin','dist/data/flight-context.bin','dist/data/globe-overview-land.bin'])if(fs.existsSync(file))await collection(file);
  if(fs.existsSync('dist/data/globe-overview.json')){const overview=load('dist/data/globe-overview.json');overview.landBytes=fs.statSync('dist/data/globe-overview-land.bin').size;overview.canadaLakes='data/canada-lakes-sources.json';saveJson('dist/data/globe-overview.json',overview);}
  const meta=load('dist/data/world-land-sources.json');meta.canadaLakes={source:'data/canada-lakes-sources.json',names:load(sourceRoot+'source.json').names,method:'Permanent lake exclusions matching Canadian administrative fills.'};meta.bytes=fs.statSync('dist/data/world-land.bin').size;saveJson('dist/data/world-land-sources.json',meta);
 }
 if(!worldOnly&&fs.existsSync(base+'area-codes/catalogue.bin')){
  const cat=load(base+'area-codes/catalogue.bin'),codeShapes=new Map();for(const ch of Object.values(cat.chunks)){await part(base+ch.file);for(const f of load(base+ch.file).regions.features)codeShapes.set(f.properties.id,f);const bytes=fs.readFileSync(base+ch.file);ch.bytes=bytes.length;ch.decodedBytes=gunzipSync(bytes).length;}await moveCenters(cat,codeShapes);
  const provinces=new Map(load(base+'first.bin').regions.features.map(f=>[f.properties.id,f]));for(const label of cat.labels||[])if(waterInside(label.center)){const shape=codeShapes.get(label.primary),mask=provinces.get(label.parent),clipped=await command({'code.json':fc([shape]),'province.json':fc([mask])},'-clip province.json');label.center=(await command(clipped,'-points inner')).features[0].geometry.coordinates;}save(base+'area-codes/catalogue.bin',cat);
 }
 save('dist/data/canada-lakes.bin',water);saveJson('dist/data/canada-lakes-sources.json',{...load(sourceRoot+'source.json'),retained:sourceRoot+'lakes.geojson.gz',policy:'Display water exclusions only; legal jurisdictions and reported statistics are not redefined.'});
 console.log('Canadian lake cutouts updated:',changed.length,'geometry files;',changedRegions.size,'administrative/area-code features.');return {changed,regions:[...changedRegions.keys()]};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/canada-lakes.mjs'))await maskCanadaLakes({areaCodesOnly:process.argv.includes('--area-codes'),worldOnly:process.argv.includes('--world')});

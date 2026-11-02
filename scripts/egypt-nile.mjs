// Egypt's source excludes the Nile from land polygons. Fill only that channel
// for display; preserve lakes, coasts, source identities and land statistics.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {load,polygons} from './geo-index.mjs';
import {command,fc,geographicBounds,sharedBorders} from './build-regional-dataset.mjs';
import {conform,unionLand,cleanNumericalReturns} from './horn-islands-topology.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';

const base='dist/data/europe/egypt/',version=1;
export function geometrySize(data){return data.features.reduce((s,f)=>{for(const p of polygons(f.geometry)){s.parts++;s.holes+=p.length-1;for(const r of p)s.vertices+=r.length;}return s;},{parts:0,holes:0,vertices:0});}
const box=(x0,y0,x1,y1)=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]}});
function save(file,value){const text=JSON.stringify(value),bytes=gzipSync(text,{level:9});fs.writeFileSync(file,bytes);const compact=file.replace('dist/data/','dist/data/compact/');if(fs.existsSync(compact))fs.writeFileSync(compact,gzipSync(encodeGeo(value,{source:createHash('sha256').update(text).digest('hex')}),{level:9}));return {bytes:bytes.length,decodedBytes:Buffer.byteLength(text)};}

export async function nileChannel(regions){
 // These three temporary cross-sections isolate the open river from the sea
 // and reservoir. They select a hole, and are never added to the displayed land.
 const sections=fc([box(32.75,24.0199,33,24.0201),box(30.3,31.4599,30.45,31.4601),box(31.75,31.5099,31.92,31.5101)]);
 const bridged=await command(fc([...regions.features,...sections.features]),'-dissolve2 -clean gap-fill-area=0');
 const holes=bridged.features.flatMap(f=>polygons(f.geometry).flatMap(p=>p.slice(1).map(r=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[r]}}))));
 const selected=holes.filter(f=>{const b=geographicBounds(f.geometry);return b[0][1]<24.1&&b[0][1]>24&&b[1][1]>31.3&&b[1][1]<31.6;});
 assert.equal(selected.length,1,'Exactly one connected Nile channel, excluding the reservoir and coastal lakes');
 return fc(selected);
}

async function extendToChannel(regions,water,parent){
 // Topological buffers partition contested water between its neighboring
 // units instead of covering either bank or awarding the whole river to one.
 const expanded=await command(regions,'-buffer 1500m topological');
 const patches=await command({'expanded.json':expanded,'channel.json':water},'-clip channel.json');
 const joined=await command(fc([...regions.features,...patches.features.filter(f=>f.geometry)]),'-dissolve2 id'+(regions.features.some(f=>f.properties.parent)?',parent':'')+' -clean gap-fill-area=0');
 return cleanNumericalReturns(await conform(joined,parent)).regions;
}

export async function fillEgyptNile({world=true}={}){
 let first=load(base+'first.bin'),context=load(base+'context.bin');
 let report=load(base+'sources.json').nileDisplay;
 if(first.egyptNileDisplay!==version){
  assert(!first.egyptNileDisplay,'Rebuild Egypt from retained sources before changing the Nile display policy');
  const original=first.regions,water=await nileChannel(original),target=unionLand(fc([...original.features,...water.features]));
  const regions=await extendToChannel(original,water,target.features[0]),parents=new Map(regions.features.map(f=>[f.properties.id,f]));
  const catalogue=load(base+'catalogue.bin'),byId=new Map(catalogue.records.map(r=>[r.id,r]));let changedChunks=0;
  for(const [id,chunk]of Object.entries(catalogue.chunks)){
   const inside=await command({'water.json':water,'parent.json':fc([parents.get(id)])},'-clip parent.json');
   if(!inside.features.some(f=>f.geometry&&polygons(f.geometry).length))continue;
   const file=base+chunk.file,data=load(file),children=await extendToChannel(data.regions,inside,parents.get(id));
   assert.equal(children.features.length,data.regions.features.length,'Preserve all district identities '+id);
   Object.assign(chunk,save(file,{...data,regions:children,boundaries:sharedBorders(children),egyptNileDisplay:version}));
   for(const f of children.features)byId.get(f.properties.id).bounds=geographicBounds(f.geometry);
   changedChunks++;
  }
  for(const f of regions.features)byId.get(f.properties.id).bounds=geographicBounds(f.geometry);
  first={...first,regions,boundaries:sharedBorders(regions),egyptNileDisplay:version};save(base+'first.bin',first);save(base+'catalogue.bin',catalogue);
  context=unionLand(regions,{country:'egypt'});save(base+'context.bin',context);
  report={version,channelAreaKm2:geographicAreaKm2(water.features[0].geometry),before:geometrySize(original),after:geometrySize(regions),districtChunks:changedChunks,policy:'Display-only fill of the Nile channel between Aswan and its two delta mouth cross-sections. Existing lakes, reservoir surfaces, sea coast and international frontiers are preserved. Shared subdivision borders continue across the filled channel, partitioned between adjacent banks. Source administrative identities, population and land-area statistics are unchanged; the display extension is not a cadastral boundary source.',builder:'scripts/egypt-nile.mjs'};
  const sources=load(base+'sources.json');sources.nileDisplay=report;fs.writeFileSync(base+'sources.json',JSON.stringify(sources,null,2)+'\n');
 }
 if(world){
  for(const file of ['dist/data/world-land.bin','dist/data/flight-context.bin']){
   const data=load(file);if(!data.features.some(f=>f.properties.country==='egypt'))continue;
   const next={...data,features:data.features.flatMap(f=>f.properties.country==='egypt'?context.features.map(c=>({...c,properties:{...f.properties,...c.properties}})):[f])};
   if(JSON.stringify(next)!==JSON.stringify(data))save(file,next);
  }
  // Update only Egypt in the resident world buffer. Other countries and the
  // complete international-border buffer retain their existing geometry.
  const overviewFile='dist/data/globe-overview-land.bin',overview=load(overviewFile);
  const ringArea=r=>{let a=0;const o=r[0];for(let i=1;i<r.length;i++)a+=(r[i-1][0]-o[0])*(r[i][1]-o[1])-(r[i][0]-o[0])*(r[i-1][1]-o[1]);return Math.abs(a)/2;};
  const coarse=await command(fc(context.features.map(f=>{const p=polygons(f.geometry),largest=p.reduce((a,b)=>ringArea(a[0])>ringArea(b[0])?a:b);return {...f,geometry:{type:'MultiPolygon',coordinates:p.filter(r=>r===largest||ringArea(r[0])>=.0008)}};})),'-simplify dp interval=.006 planar keep-shapes');
  const nextOverview={...overview,features:overview.features.flatMap(f=>f.properties.country==='egypt'?coarse.features.map(c=>({...c,properties:{...f.properties,...c.properties}})):[f])};
  if(JSON.stringify(nextOverview)!==JSON.stringify(overview))save(overviewFile,nextOverview);
  const overviewMeta=load('dist/data/globe-overview.json');overviewMeta.landBytes=fs.statSync(overviewFile).size;fs.writeFileSync('dist/data/globe-overview.json',JSON.stringify(overviewMeta,null,2)+'\n');
  const meta=load('dist/data/world-land-sources.json');meta.egyptNileDisplay={source:'data/europe/egypt/sources.json',version};meta.bytes=fs.statSync('dist/data/world-land.bin').size;fs.writeFileSync('dist/data/world-land-sources.json',JSON.stringify(meta,null,2)+'\n');
 }
 console.log('Egypt Nile display',JSON.stringify(report));return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await fillEgyptNile();}

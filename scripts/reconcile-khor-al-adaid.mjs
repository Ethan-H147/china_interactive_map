import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import polygonClipping from 'polygon-clipping';
import {load,polygons,landIndex,lineIndex,metres} from './geo-index.mjs';
import {fc,command,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {khorReference,khorPatch} from './khor-al-adaid.mjs';
import {build as buildCoverage} from './build-context-coverage.mjs';
import {prepareRegionColors} from './prepare-region-colors.mjs';

const root='dist/data/',countries=['qatar','saudi-arabia'];
const write=(file,data)=>fs.writeFileSync(root+file,gzipSync(JSON.stringify(data),{level:9}));
const shape=coordinates=>({type:'MultiPolygon',coordinates});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const touches=f=>{const b=geographicBounds(f.geometry);return b[0][0]<51.65&&b[1][0]>51.18&&b[0][1]<24.85&&b[1][1]>24.47;};
// Mapshaper handles near-coincident survey vertices before gap assignment. Keep
// untouched districts in their original representation outside this patch.
async function conformCoast(children,parent){
 const mask=await command(fc([parent]),'-clean snap-interval=0 gap-fill-area=0');
 const clipped=await command({'children.json':children,'parent.json':mask},'-clip parent.json -clean gap-fill-area=0');
 const gaps=await command({'parent.json':mask,'children.json':clipped},'-erase children.json -explode -clean gap-fill-area=0');
 const edges=clipped.features.map(f=>lineIndex(polygons(f.geometry).flat())),pieces=[...clipped.features];
 for(const gap of gaps.features){if(!gap.geometry||geographicAreaKm2(gap.geometry)<1e-8)continue;
  const lengths=edges.map(()=>0);for(const ring of polygons(gap.geometry).flat())for(let i=1;i<ring.length;i++){
   const a=ring[i-1],b=ring[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];edges.forEach((edge,j)=>{if(edge(mid)<.5)lengths[j]+=metres(a,b);});
  }
  let owner=lengths.indexOf(Math.max(...lengths));if(!lengths[owner]){const distances=edges.map(e=>e(polygons(gap.geometry)[0][0][0]));owner=distances.indexOf(Math.min(...distances));}
  pieces.push({...gap,properties:{...clipped.features[owner].properties}});
 }
 return command(fc(pieces),'-dissolve2 id,parent -clean snap-interval=0 gap-fill-area=0');
}
export async function reconcileKhor(){
 const reference=khorReference(),contexts={},changedFiles=new Set(),report={bounds:[51.18,24.47,51.65,24.85],source:'scripts/boundary-sources/caucasus-gulf/manifest.json',coastVertices:reference.coast.length,landBorderVertices:reference.border.length,landBorderEndpoint:reference.junction,endpointAdjustmentMetres:reference.endpointAdjustmentMetres,countries:{}};
 for(const country of countries){
  const base='europe/'+country+'/',cat=load(root+base+'catalogue.bin'),stats=load(root+base+'statistics.json');
  const parts=new Map([['first.bin',load(root+base+'first.bin')],...Object.values(cat.chunks).map(c=>[c.file,load(root+base+c.file)])]);
  const original=parts.get('first.bin').regions,outline=await command(original,'-dissolve2'),old=outline.features.flatMap(f=>polygons(f.geometry));
  const ownIslands=reference.islands.length?polygonClipping.intersection(old,reference.islands):[];
  const patch=polygonClipping.union(country==='qatar'?reference.qatar:reference.saudi,ownIslands);
  const coordinates=polygonClipping.union(polygonClipping.difference(old,khorPatch),patch);
  const target={type:'Feature',properties:{},geometry:shape(coordinates)};
  const replacements=new Map(),beforeById=new Map([...parts.values()].flatMap(p=>p.regions.features).map(f=>[f.properties.id,f]));
  // Conform each parent and child partition so every detail layer gets
  // the same coast and no source gap becomes a false administrative unit.
  console.log('Reconciling',country,'coast');const first=await conformCoast(fc(original.features.map(f=>({...f,properties:{...f.properties,parent:''}}))),target);for(const f of first.features){f.properties={...beforeById.get(f.properties.id).properties};if(touches(f))replacements.set(f.properties.id,f);}
  for(const level of [2,3])for(const [id,chunk]of Object.entries(cat.chunks).filter(([,c])=>c.level===level)){
   const parent=replacements.get(id),oldParent=beforeById.get(id);if(!parent||hash(parent.geometry)===hash(oldParent.geometry))continue;
   console.log('Detail',id);const next=await conformCoast(parts.get(chunk.file).regions,parent);for(const f of next.features)if(touches(f))replacements.set(f.properties.id,f);
  }
  const changed=[];
  for(const [file,part]of parts){let touched=false;part.regions.features=part.regions.features.map(f=>{
   const next=replacements.get(f.properties.id);if(!next||hash(next.geometry)===hash(f.geometry))return f;touched=true;changed.push(f.properties.id);return next;
  });if(touched){part.boundaries=sharedBorders(part.regions);write(base+file,part);changedFiles.add(base+file);}}
  for(const id of changed){const f=replacements.get(id),r=cat.records.find(r=>r.id===id),s=stats.regions[country+':'+id];
   r.bounds=geographicBounds(f.geometry);if(!landIndex(polygons(f.geometry).flat())(r.center))r.center=(await command(fc([f]),'-points inner')).features[0].geometry.coordinates;
   if(s?.area?.method==='mapped'){r.areaKm2=geographicAreaKm2(f.geometry);s.area.value=r.areaKm2;}
  }
  for(const chunk of Object.values(cat.chunks)){chunk.bytes=fs.statSync(root+base+chunk.file).size;chunk.decodedBytes=Buffer.byteLength(JSON.stringify(parts.get(chunk.file)));}
  write(base+'catalogue.bin',cat);fs.writeFileSync(root+base+'statistics.json',JSON.stringify(stats)+'\n');
  const previousContext=load(root+base+'context.bin').features.flatMap(f=>polygons(f.geometry));
  const context=fc([{type:'Feature',properties:{country},geometry:shape(polygonClipping.union(polygonClipping.difference(previousContext,khorPatch),patch))}]);contexts[country]=context;
  write(base+'context.bin',context);write(base+'political.bin',parts.get('first.bin').regions);changedFiles.add(base+'context.bin');
  const national=Object.values(stats.regions).find(r=>r.level===0);if(national?.area?.method==='mapped')national.area.value=cat.records.filter(r=>r.level===1).reduce((n,r)=>n+r.areaKm2,0);
  fs.writeFileSync(root+base+'statistics.json',JSON.stringify(stats)+'\n');
  const sources=load(root+base+'sources.json');sources.sources['qatar-khor-al-adaid-coast-osm.json']=load('scripts/boundary-sources/caucasus-gulf/manifest.json').files['qatar-khor-al-adaid-coast-osm.json'];sources.coastalCorrection={source:'scripts/boundary-sources/caucasus-gulf/qatar-khor-al-adaid-coast-osm.json.gz',credit:'© OpenStreetMap contributors',license:'ODbL 1.0',bounds:report.bounds,method:'Continuous mapped coast through Khor Al Adaid; retain the inland reference frontier and stop its stroke at the shore. Parent and child land partitions share the correction.'};fs.writeFileSync(root+base+'sources.json',JSON.stringify(sources,null,2)+'\n');
  report.countries[country]={changed:[...new Set(changed)],counts:cat.counts};console.log(country,changed.length,'updated geometries');
 }
 // The Qatar-owned stroke is the shared land segment only, with no coast loop.
 const file='europe/qatar/international.bin',previous=load(root+file);
 write(file,lineData(fc([...previous.features.filter(f=>f.properties.pair!=='QAT-SAU'),{type:'Feature',properties:{countries:['qatar'],pair:'QAT-SAU',boundaryType:'land frontier'},geometry:{type:'LineString',coordinates:reference.border}}])));changedFiles.add(file);
 const world=load(root+'world-land.bin'),preserved=world.features.filter(f=>!countries.includes(f.properties.country)).map(hash);
 const next=fc([...world.features.filter(f=>!countries.includes(f.properties.country)),...countries.flatMap(c=>contexts[c].features)]);
 assert.deepEqual(next.features.filter(f=>!countries.includes(f.properties.country)).map(hash),preserved,'Unrelated world geometry remains byte-for-byte equivalent');write('world-land.bin',next);changedFiles.add('world-land.bin');
 const metadata=load(root+'world-land-sources.json');metadata.khorAlAdaidCorrection={source:report.source,bounds:report.bounds,countries,method:'Replace the two country silhouettes together using their reconciled land geometry; coastal and maritime arcs have no stroke.'};for(const value of Object.values(metadata))if(value?.preservedInteractiveHashes)for(const country of countries)delete value.preservedInteractiveHashes[country];metadata.bytes=fs.statSync(root+'world-land.bin').size;fs.writeFileSync(root+'world-land-sources.json',JSON.stringify(metadata,null,2)+'\n');
 for(const file of changedFiles){if(!fs.existsSync(root+'compact/'+file))continue;const text=gunzipSync(fs.readFileSync(root+file)).toString();fs.writeFileSync(root+'compact/'+file,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));}
 fs.writeFileSync(root+'europe/qatar/khor-al-adaid-report.json',JSON.stringify(report,null,2)+'\n');
 const depthFile='scripts/boundary-sources/west-asia/depth-report.json';
 if(fs.existsSync(depthFile)){const depth=load(depthFile),info=depth.countries['saudi-arabia'],base='europe/saudi-arabia/',stats=load(root+base+'statistics.json');
  const correction=info.coastalCorrection||{report:'dist/data/europe/qatar/khor-al-adaid-report.json',previousAssets:{},previousStatistics:{}};
  for(const [file,old]of Object.entries(info.preservedAssets)){const next=createHash('sha256').update(fs.readFileSync(root+base+file)).digest('hex');if(next!==old){assert.equal(file,'context.bin','Only the local coast changes a preserved display asset');correction.previousAssets[file]??=old;info.preservedAssets[file]=next;}}
  for(const [id,old]of Object.entries(info.preservedStatistics)){const next=hash(stats.regions[id]);if(next!==old){assert.equal(id,'saudi-arabia:SAU');correction.previousStatistics[id]??=old;info.preservedStatistics[id]=next;}}
  info.coastalCorrection=correction;fs.writeFileSync(depthFile,JSON.stringify(depth,null,2)+'\n');
 }
 prepareRegionColors(countries);await buildCoverage();await import('./build-globe-overview.mjs?coast='+Date.now());await import('./build-border-previews.mjs?coast='+Date.now());
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await reconcileKhor();

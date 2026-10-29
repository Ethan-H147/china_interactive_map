import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import polygonClipping from 'polygon-clipping';
import {load,polygons,landIndex,lineIndex,linesOf,metres} from './geo-index.mjs';
import {fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {decodeGeoStructure,decodeData} from '../dist/geo-pack.mjs';
import {khorReference} from './khor-al-adaid.mjs';

const reference=khorReference(),countries=['qatar','saudi-arabia'],regions={},inside={};
for(const country of countries){
 const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json');
 assert.deepEqual(cat.counts,country==='qatar'?{1:8,2:90,3:781}:{1:13,2:147});
 const first=load(base+'first.bin');regions[country]=first.regions;inside[country]=landIndex(first.regions.features.flatMap(f=>polygons(f.geometry).flat()));
 const all=new Map(first.regions.features.map(f=>[f.properties.id,f]));
 for(const chunk of Object.values(cat.chunks)){const bytes=fs.readFileSync(base+chunk.file),part=load(base+chunk.file);assert.equal(bytes.length,chunk.bytes);assert.equal(Buffer.byteLength(JSON.stringify(part)),chunk.decodedBytes);for(const f of part.regions.features)all.set(f.properties.id,f);}
 const report=load('dist/data/europe/qatar/khor-al-adaid-report.json');
 for(const id of report.countries[country].changed){const record=cat.records.find(r=>r.id===id),feature=all.get(id);assert(record&&feature);assert(landIndex(polygons(feature.geometry).flat())(record.center),'Label remains on its own land: '+id);assert(stats.regions[country+':'+id].area.value>0);
  if(record.parent){const outside=polygonClipping.difference(polygons(feature.geometry),polygons(all.get(record.parent).geometry));assert(outside.reduce((n,p)=>n+geographicAreaKm2({type:'Polygon',coordinates:p}),0)<.001,'Child stays inside its parent: '+id);}
 }
 for(const name of ['context.bin','international.bin']){const file='europe/'+country+'/'+name,text=gunzipSync(fs.readFileSync('dist/data/'+file)).toString(),compact=decodeGeoStructure(gunzipSync(fs.readFileSync('dist/data/compact/'+file)));assert.equal(compact.meta.source,createHash('sha256').update(text).digest('hex'),'Fresh compact '+file);}
}
for(const point of [[51.28,24.62],[51.31,24.55],[51.32,24.61],[51.33,24.57]])for(const country of countries)assert(!inside[country](point),'Inlet water stays open: '+country+' '+point);
for(const [country,points]of [['qatar',[[51.35,24.65],[51.37,24.59],[51.36,24.61]]],['saudi-arabia',[[51.35,24.55],[51.4,24.62]]]])for(const point of points)assert(inside[country](point),'No coastal wedge: '+country+' '+point);
const overlap=polygonClipping.intersection(regions.qatar.features.flatMap(f=>polygons(f.geometry)),regions['saudi-arabia'].features.flatMap(f=>polygons(f.geometry)));assert(overlap.reduce((n,p)=>n+geographicAreaKm2({type:'Polygon',coordinates:p}),0)<.001,'Countries never overlap');
const border=load('dist/data/europe/qatar/international.bin').features.filter(f=>f.properties.pair==='QAT-SAU'),paths=linesOf(fc(border));assert.equal(paths.length,1);assert.equal(paths[0].length,48);assert(metres(paths[0][0],reference.junction)<.2);assert(!load('dist/data/europe/saudi-arabia/international.bin').features.some(f=>f.properties.pair==='QAT-SAU'),'One border owner');
const near=lineIndex(paths);let shoreSamples=0;for(const point of reference.coast.filter((_,i)=>i%70===0)){if(metres(point,reference.junction)<1000)continue;assert(near(point)>20,'No shoreline stroke: '+point);shoreSamples++;}assert(shoreSamples>70);
const previews=await decodeData(fs.readFileSync('dist/data/country-border-previews.bin'));assert.equal(previews.features.filter(f=>f.properties.pair==='QAT-SAU').length,1,'Previews also use the single land segment');
const world=load('dist/data/world-land.bin');for(const country of countries){const worldInside=landIndex(world.features.filter(f=>f.properties.country===country).flatMap(f=>polygons(f.geometry).flat()));for(const point of [[51.31,24.55],[51.35,24.65],[51.4,24.62]])assert.equal(worldInside(point),inside[country](point),'World silhouette matches '+country);}
console.log('Khor Al Adaid: continuous coast, open water, land-only border, hierarchy, labels, compact copies and previews verified.');

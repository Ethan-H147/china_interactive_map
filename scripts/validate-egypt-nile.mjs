import assert from 'node:assert/strict';
import fs from 'node:fs';
import pc from 'polygon-clipping';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {load,polygons,landIndex,lineIndex} from './geo-index.mjs';
import {fc,sharedBorders} from './build-regional-dataset.mjs';
import {unionLand,eraseWater,cleanNumericalReturns} from './horn-islands-topology.mjs';
import {nileChannel,geometrySize} from './egypt-nile.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {decodeGeoStructure} from '../dist/geo-pack.mjs';

const base='dist/data/europe/egypt/',first=load(base+'first.bin'),cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),report=load(base+'sources.json').nileDisplay;
assert.equal(first.egyptNileDisplay,1);assert.deepEqual(cat.counts,{'1':27,'2':365});
assert.deepEqual(geometrySize(first.regions),report.after);assert(report.after.vertices<report.before.vertices*.65,'Substantially reduce the fill geometry');
const lakes=load('scripts/boundary-sources/nordics/ne-lakes.json.gz');
const original=cleanNumericalReturns(eraseWater(load(base+'political.bin'),lakes)).regions,water=await nileChannel(original);
const expected=unionLand(fc([...original.features,...water.features])),actual=unionLand(first.regions);
const lattice=v=>typeof v==='number'?Math.round(v*1e6):v.map(lattice),degrees=v=>typeof v==='number'?v/1e6:v.map(degrees),shape=d=>lattice(polygons(d.features[0].geometry));
const area=parts=>parts.reduce((s,coordinates)=>s+geographicAreaKm2({type:'Polygon',coordinates:degrees(coordinates)}),0);
assert(area(pc.difference(shape(expected),shape(actual)))<.003,'Filled river and retained original land match the reference mask');
assert(area(pc.difference(shape(actual),shape(expected)))<.003,'Lakes, reservoir and coastline stay excluded');
assert.deepEqual(first.boundaries,sharedBorders(first.regions),'One mesh connects governorate borders across the former river gap');
// Geographic area can overstate a thin triangle on long straight boundaries.
// Check its actual width against the same metre-level tolerance as the source.
function numericalOnly(parts,edge,label){if(area(parts)<.003)return;for(const polygon of degrees(parts))for(const ring of polygon)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];for(const p of [a,b,[(a[0]+b[0])/2,(a[1]+b[1])/2]])assert(edge(p)<1,label);}}
const geometries=new Map(first.regions.features.map(f=>[f.properties.id,f])),ids=new Set(cat.records.map(r=>r.id));
for(const [id,ch]of Object.entries(cat.chunks)){
 const bytes=fs.readFileSync(base+ch.file),data=load(base+ch.file);assert.equal(bytes.length,ch.bytes);assert.equal(gunzipSync(bytes).length,ch.decodedBytes);
 if(!data.egyptNileDisplay)continue;
 assert.deepEqual(data.boundaries,sharedBorders(data.regions),'Connected district mesh '+id);
 const childUnion=unionLand(data.regions),parent=fc([geometries.get(id)]);
 numericalOnly(pc.difference(shape(parent),shape(childUnion)),lineIndex([...polygons(geometries.get(id).geometry).flat(),...polygons(childUnion.features[0].geometry).flat()]),'Districts cover their parent '+id);
 numericalOnly(pc.difference(shape(childUnion),shape(parent)),lineIndex(polygons(geometries.get(id).geometry).flat()),'Districts stay within their parent '+id);
 for(const f of data.regions.features)geometries.set(f.properties.id,f);
}
for(const r of cat.records){assert(ids.has(r.id));if(r.parent)assert(ids.has(r.parent));assert.equal(stats.regions['egypt:'+r.id].area.value,r.areaKm2,'Original land-area statistic retained '+r.id);const f=geometries.get(r.id);if(f)assert(landIndex(polygons(f.geometry).flat())(r.center),'Retain a land label '+r.id);}
for(const file of ['europe/egypt/context.bin','world-land.bin']){
 const raw=gunzipSync(fs.readFileSync('dist/data/'+file)),copy=decodeGeoStructure(gunzipSync(fs.readFileSync('dist/data/compact/'+file)));
 assert.equal(copy.meta.source,createHash('sha256').update(raw).digest('hex'),'Compact asset matches '+file);
}
console.log('Egypt: Nile filled, lakes/coast preserved, 27 governorates/365 districts, connected meshes, parent coverage, areas and compact assets passed.');

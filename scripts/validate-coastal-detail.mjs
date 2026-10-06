import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {splitCoastalDetail,coastalDetailZoom,coastalDetailBounds,coastalDetailIds,coastalPartId} from '../dist/coastal-detail.mjs';
const read=name=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/archipelago/'+name+'.bin')));
const polygons=f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
const sorted=parts=>parts.map(p=>JSON.stringify(p)).sort();
const inside=([x,y])=>x>=coastalDetailBounds[0][0]&&x<=coastalDetailBounds[1][0]&&y>=coastalDetailBounds[0][1]&&y<=coastalDetailBounds[1][1];
assert.equal(coastalDetailZoom,9,'Delta channels must be visible at Samarinda city scale');
for(const name of ['indonesia-overview','indonesia-ID64'])for(const level of ['first','second']){
 const input=read(name)[level],before=JSON.stringify(input),display=splitCoastalDetail(input);
 assert.equal(JSON.stringify(input),before,'The original source geometry is never changed');
 for(const original of input.features){const main=display.features.find(f=>f.properties.id===original.properties.id);if(!coastalDetailIds.has(original.properties.id)){assert.deepEqual(main,original);continue;}
  const detail=display.features.find(f=>f.properties.id===coastalPartId(original.properties.id));assert(detail);assert.equal(polygons(detail).length,name==='indonesia-ID64'?85:level==='first'?57:45);assert(polygons(detail).every(p=>p[0].every(inside)));assert(!polygons(main).some(p=>p[0].every(inside)));
  assert.deepEqual(sorted([...polygons(main),...polygons(detail)]),sorted(polygons(original)),'Close zoom retains every original island and boundary vertex');
  assert.equal(detail.properties.regionId,original.properties.id);assert.equal(detail.properties.parent,original.properties.parent);
 }
}
const context=read('indonesia-context'),coarse=splitCoastalDetail(context,{context:true});
assert.equal(coarse.features.length,context.features.length);assert(!coarse.features.some(f=>f.properties.coastalDetail));
for(const f of coarse.features)if(coastalDetailIds.has(f.properties.id))assert(!polygons(f).some(p=>p[0].every(inside)),'Gray context cannot reveal hidden delta islands underneath the active map');
for(const country of ['philippines'])for(const level of ['first','second']){const input=read(country+'-overview')[level];assert.deepEqual(splitCoastalDetail(input),input);}
console.log(`Mahakam detail: 85 islands visible from zoom ${coastalDetailZoom}, original mainland/regency edges unchanged, every island vertex retained, gray-context masking and unrelated countries unchanged.`);

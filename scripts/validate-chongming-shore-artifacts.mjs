import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readData} from './read-data.mjs';
import {contains} from './east-coast.mjs';
import {refineChongmingArtifacts,chongmingArtifactAt} from './chongming-shore-artifacts.mjs';
const data=readData('display-boundaries.json'),review=readData('chongming-source-versions.json').displayCorrections;
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex'),polys=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const owners=(fc,p)=>fc.features.filter(f=>contains(f,p)).map(f=>f.properties.adcode);
for(const p of [[121.170082795,31.815771047],[121.178483952,31.823496938]]){
 assert.deepEqual(owners(data.subdivisions,p),[310151]);assert.deepEqual(owners(data.provinces,p),[310000]);
}
const water=[121.290093745,31.876722246];assert.deepEqual(owners(data.subdivisions,water),[]);assert.deepEqual(owners(data.provinces,water),[]);
assert.deepEqual(owners(data.subdivisions,[121.454171285,31.781734371]),[320600]);
const nantong=data.subdivisions.features.find(f=>f.properties.adcode===320600);
assert.deepEqual(polys(nantong.geometry).map(hash).sort(),review.preservedNantongComponentHashes,'Genuine Jiangsu island and mainland geometry remain exact');
const vertices=[...new Set(data.subdivisions.features.filter(f=>[310151,320600].includes(f.properties.adcode)).flatMap(f=>polys(f.geometry).flat(2)).filter(p=>!chongmingArtifactAt(p)).map(p=>JSON.stringify(p)))].sort();
assert.equal(hash(vertices),review.preservedOutsideWindowVertexHash,'Every original vertex outside the reviewed windows is retained');
assert.deepEqual((await refineChongmingArtifacts(data.subdivisions.features)).features,data.subdivisions.features,'Idempotent correction');
console.log('Chongming: western ownership, northern river water, genuine Jiangsu geometry, unreviewed coastline vertices and idempotence passed.');

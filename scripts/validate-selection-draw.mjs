import assert from 'node:assert/strict';
import {prepareSelectedBucket,selectedSegments,selectedOutlineSource} from '../dist/selection-draw.mjs';
const segment=(vertexOffset,primitiveOffset,vertexLength,primitiveLength)=>({vertexOffset,primitiveOffset,vertexLength,primitiveLength,vaos:{native:true}});
const positions={indexed:true,ids:[1,1,2,3],positions:[0,0,4,1,4,8,2,8,12,3,12,16],getPositions(id){return this.ids.flatMap((key,i)=>key===Number(id)?[{start:this.positions[i*3+1],end:this.positions[i*3+2]}]:[]);}};
// Two GPU segments use local indices, while feature positions use global offsets.
const original=[segment(0,0,12,6),segment(12,6,4,2)];
const bucket={programConfigurations:{_featureMap:positions},segments:{get:()=>original},indexArray:{length:8,uint16:new Uint16Array([0,1,2,2,1,3,4,5,6,6,5,7,8,9,10,10,9,11,0,1,2,2,1,3])}};
prepareSelectedBucket(bucket);
// Native upload frees the CPU index buffer; cached ranges must keep working.
bucket.indexArray.uint16=new Uint16Array();
for(const [ids,expected] of [[[1],[[0,0,2],[0,2,2]]],[[2],[[0,4,2]]],[[3],[[12,6,2]]],[[1,3],[[0,0,2],[0,2,2],[12,6,2]]],[[],[]],[[99],[]]]){
 const draws=selectedSegments(bucket,ids).get();assert.deepEqual(draws.map(s=>[s.vertexOffset,s.primitiveOffset,s.primitiveLength]),expected);assert(draws.every(s=>original.some(o=>s.vaos===o.vaos)),'Native VAOs are reused');
}
assert.deepEqual(original.map(s=>s.primitiveLength),[6,2],'Native segments stay unchanged');
assert.equal(selectedSegments({programConfigurations:{_featureMap:positions}},[1]),null,'Unknown or already freed buffers fall back to native');
const layer={id:'outline'},tile={getBucket:()=>bucket},manager={getTile:()=>tile};
const source=selectedOutlineSource(manager,layer,[2]);assert.equal(source,selectedOutlineSource(manager,layer,[2]));assert.equal(source.getTile({}),source.getTile({}));assert.deepEqual(source.getTile({}).getBucket(layer).segments.get().map(s=>s.primitiveLength),[2]);assert.equal(tile.getBucket(layer),bucket);
const emptyTile={getBucket:()=>undefined};assert.equal(selectedOutlineSource({getTile:()=>emptyTile},layer,[2]).getTile({}),emptyTile,'Tiles without an outline bucket keep native behavior');
console.log('Selection draw ranges: repeated IDs, local segment indices, freed buffers, empty and missing tiles, native VAO ownership and unchanged geometry passed.');

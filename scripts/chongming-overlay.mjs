import assert from 'node:assert/strict';
import mapshaper from 'mapshaper';

export const chongmingWindow=[121.10,31.42,122.05,31.93];
const collection=features=>({type:'FeatureCollection',features});
const polygons=g=>g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
const box=([w,s,e,n])=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}});
const overlay=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o output.json format=geojson',files))['output.json']).features;

// Coastline describes physical land. Retain the existing Shanghai/Jiangsu
// administrative border through Haiyong and Qilong on the island.
export async function applyChongmingCoast(features,island,bank){
 const oldChongming=features.find(f=>f.properties.adcode===310151);
 const oldNantong=features.find(f=>f.properties.adcode===320600);
 assert(oldChongming&&oldNantong);
 const parts=polygons(oldChongming.geometry);
 // The main Chongming component is the only part extending north of 31.6°.
 const main=parts.filter(p=>p[0].some(c=>c[1]>31.6));
 assert.equal(main.length,1,'Ambiguous main Chongming island');
 const other=parts.filter(p=>p!==main[0]);
 const shanghaiIsland=await overlay('-i island.json -erase nantong.json',{'island.json':{...island,properties:oldChongming.properties},'nantong.json':oldNantong});
 const jiangsuIsland=await overlay('-i nantong.json -clip island.json',{'nantong.json':oldNantong,'island.json':island});
 const coast=bank.geometry.coordinates;
 // Close the mainland mask inland, north of the replacement window. These
 // closure segments never appear as shorelines or administrative boundaries.
 assert(coast[0][0]<chongmingWindow[0]&&coast.at(-1)[1]>chongmingWindow[3]);
 const mainland={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[...coast,[coast.at(-1)[0],32.1],[coast[0][0],32.1],coast[0]]]}};
 const extent=box(chongmingWindow);
 const outside=await overlay('-i nantong.json -erase extent.json',{'nantong.json':oldNantong,'extent.json':extent});
 const inside=await overlay('-i nantong.json -clip extent.json -clip mainland.json',{'nantong.json':oldNantong,'extent.json':extent,'mainland.json':mainland});
 const chongming=await overlay('-i input.json -dissolve2 adcode copy-fields=name,level,provinceCode,center,centroid,parent,acroutes,childrenNum,subFeatureIndex',{'input.json':collection([...shanghaiIsland,{...oldChongming,geometry:{type:'MultiPolygon',coordinates:other}}])});
 const nantong=await overlay('-i input.json -dissolve2 adcode copy-fields=name,level,provinceCode,center,centroid,parent,acroutes,childrenNum,subFeatureIndex',{'input.json':collection([...outside,...inside,...jiangsuIsland])});
 assert.equal(chongming.length,1);assert.equal(nantong.length,1);
 return features.map(f=>f.properties.adcode===310151?chongming[0]:f.properties.adcode===320600?nantong[0]:f);
}

import mapshaper from 'mapshaper';
import assert from 'node:assert/strict';
const fc=features=>({type:'FeatureCollection',features});
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const run=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o out.json format=geojson geojson-type=FeatureCollection',structuredClone(files)))['out.json']);
export const seamReview={
 bounds:[113.54,22.212,113.557,22.221],
 source:'https://webmap.gis.gov.mo/MapGIS/index.html',
 legalReference:'https://www.hmo.gov.cn/zcfg_new/jbf/flwj/qtwj/qtwj_am/201711/t20171114_34935.html',
 method:'Fill enclosed physical-land gaps at Gongbei between the existing Zhuhai polygon and the unchanged official Macau boundary. Only complete gap components inside the reviewed checkpoint extent are eligible; components reaching its edge, sea and adjacent reclamation are excluded. Retain the physical coastline and all Macau source coordinates.'
};
export async function reconcileZhuhaiMacau(features,land){
 const original=features.find(f=>f.properties.adcode===440400);assert(original);
 const macau=features.filter(f=>f.properties.provinceCode===820000);
 const [w,s,e,n]=seamReview.bounds;
 const extent={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}};
 const gaps=await run('-i land.json -clip extent.json -erase occupied.json -explode',{'land.json':land,'extent.json':extent,'occupied.json':fc([original,...macau])});
 const additions=gaps.features.filter(f=>polygons(f.geometry).flat(2).every(([x,y])=>x>w+1e-9&&x<e-1e-9&&y>s+1e-9&&y<n-1e-9));
 assert(additions.length===0||additions.length===3,'Unexpected Gongbei gap topology; review before applying');
 if(!additions.length)return {features,additions};
 const merged=await run('-i input.json -dissolve2',{'input.json':fc([original,...additions])});assert.equal(merged.features.length,1);
 // Overlay intersections can differ by floating-point noise. Restore the exact
 // government vertices so the shared edge is rendered once by the topology.
 const canonical=new Map(macau.flatMap(f=>polygons(f.geometry).flat(2)).map(p=>[p.map(v=>v.toFixed(9)).join(','),p]));
 const geometry=merged.features[0].geometry;
 for(const poly of polygons(geometry))for(const ring of poly)for(let i=0;i<ring.length;i++){const p=canonical.get(ring[i].map(v=>v.toFixed(9)).join(','));if(p&&Math.hypot(p[0]-ring[i][0],p[1]-ring[i][1])<1e-10)ring[i]=p;}
 return {features:features.map(f=>f===original?{...f,geometry}:f),additions};
}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {collection,run} from './pearl-coast.mjs';
export const nanhuiMethod='Nanhui mainland display follows the landward edge of the mapped coastal wetlands along the seawall. Exposed tidal flats and tidal training dikes are excluded from the land fill. The raised harbor access retains its mapped footprint. Only Pudong display geometry changes; administrative inland boundaries and Dishui Lake remain unchanged.';
export function nanhuiSource(){
 const raw=gunzipSync(fs.readFileSync(new URL('./additional-sources/east-coast/osm-nanhui.bin',import.meta.url))),data=JSON.parse(raw);
 const coasts=JSON.parse(gunzipSync(fs.readFileSync(new URL('./additional-sources/east-coast/osm-coast.bin',import.meta.url)))).elements;
 const coast=coasts.find(w=>w.id===842632375),extension=coasts.find(w=>w.id===662581919);
 assert.equal(extension.version,5,'Review changed northern coastal source');
 const outline=[...coast.geometry,...extension.geometry.slice(1,258)];
 assert.equal(coast.version,4,'Review changed coastal source');
 const refs=[{id:1107703029,start:1,end:3,reverse:true,version:1},{id:1107703027,start:1,end:5,version:1},{id:985635390,start:5,end:9,version:3},{id:985635389,start:26,end:28,reverse:true,version:3},{id:1107742533,start:1,end:2,version:1},{id:1107742537,start:22,end:23,reverse:true,version:1}];
 const coord=p=>[p.lon,p.lat],north=coord(outline.at(-1)),south=coord(coast.geometry[0]);
 // These landward wetland edges were checked against the seawall in the
 // same WGS84 Sentinel imagery used by the website. Join only adjacent
 // mapped edges; never use the exposed mud's outer edge as dry land.
 const shore=[north,...refs.flatMap(r=>{const w=data.elements.find(w=>w.id===r.id);assert.equal(w.version,r.version,'Review changed seawall reference '+r.id);const points=w.geometry.slice(r.start,r.end+1).map(coord),ordered=r.reverse?points.reverse():points;return r.id===1107703027?[...ordered,coord(coast.geometry.at(-1))]:ordered;}),south].filter((p,i,a)=>!i||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
 const cut={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[...outline.map(coord),...shore.slice(1)]]}};
 const ids=[826453672,829094532];
 const structures=collection(ids.map(id=>{const w=data.elements.find(w=>w.id===id);assert.equal(w.tags.man_made,'breakwater');assert.equal(w.nodes[0],w.nodes.at(-1),'Open breakwater '+id);return {type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[w.geometry.map(coord)]}};}));
 return {shore,cut,structures,metadata:{timestamp:data.osm3s.timestamp_osm_base,provider:'OpenStreetMap coastal wetland and harbor-access geometry',coordinateSystem:'WGS84',sha256:createHash('sha256').update(raw).digest('hex'),landwardEdges:refs,coastWay:{id:coast.id,version:coast.version},northCoastWay:{id:extension.id,version:extension.version,endIndex:257},structureWays:ids,excludedTidalDikes:[826365004,826365005,826365006,1107742531],license:'ODbL 1.0',licenseUrl:'https://www.openstreetmap.org/copyright',reference:'https://swj.sh.gov.cn/shshyglswzx-xwdt/20220718/91cf7191971d444d98f2771f5645caf2.html',imagery:'EOxCloudless Sentinel-2 2025, same alignment as the satellite layer',processing:nanhuiMethod}};
}
export async function refineNanhuiShore(features){
 const source=nanhuiSource(),old=features.find(f=>f.properties.adcode===310115);assert(old);
 const clipped=await run('-i city.json -erase flats.json',{'city.json':old,'flats.json':source.cut});
 const structures=await run('-i structures.json -clip city.json',{'structures.json':source.structures,'city.json':old});
 const combined=collection([...clipped.features,...structures.features].map(f=>({...f,properties:old.properties})));
 const result=await run('-i land.json -dissolve2',{'land.json':combined});assert.equal(result.features.length,1);
 const next={...old,geometry:result.features[0].geometry};
 return {features:features.map(f=>f===old?next:f),report:{...source.metadata,shoreline:source.shore}};
}

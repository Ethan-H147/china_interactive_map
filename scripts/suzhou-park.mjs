import fs from 'node:fs';
import mapshaper from 'mapshaper';
const fc=features=>({type:'FeatureCollection',features});
const run=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o output.json format=geojson geojson-type=FeatureCollection',files))['output.json']);
export const parkId='suzhou-industrial-park';
export async function separateSuzhouPark(collection,parent){
 const reference=JSON.parse(fs.readFileSync('scripts/additional-sources/city-districts/suzhou-industrial-park.geojson'));
 const huqiu=collection.features.find(f=>f.properties.adcode===320505);
 const polygons=huqiu.geometry.type==='Polygon'?[huqiu.geometry.coordinates]:huqiu.geometry.coordinates;
 // The source groups the old eastern affiliation with Huqiu. Identify that
 // entire detached component, preserving its shared edge with its neighbors.
 const eastern=polygons.filter(p=>p[0].every(([x])=>x>120.63));
 if(eastern.length!==1)throw Error('Review changed Huqiu components before rebuilding');
 const retained={type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:eastern}};
 const park=await run('-i input.json -dissolve -clip parent.json',{'input.json':fc([reference,retained]),'parent.json':parent});
 if(park.features.length!==1)throw Error('Expected one Industrial Park feature');
 const bounds=g=>{const result=[Infinity,Infinity,-Infinity,-Infinity];const visit=c=>{if(typeof c[0]==='number'){result[0]=Math.min(result[0],c[0]);result[1]=Math.min(result[1],c[1]);result[2]=Math.max(result[2],c[0]);result[3]=Math.max(result[3],c[1]);}else c.forEach(visit);};visit(g.coordinates);return result;};
 const extent=bounds(park.features[0].geometry);
 const intersects=f=>{const b=bounds(f.geometry);return b[0]<=extent[2]&&b[2]>=extent[0]&&b[1]<=extent[3]&&b[3]>=extent[1];};
 const affected=collection.features.filter(intersects);
 const districts=await run('-i input.json -erase park.json',{'input.json':fc(affected),'park.json':park});
 park.features[0].properties={adcode:parkId,name:'苏州工业园区',level:'city-district',parentCity:320500,parent:{adcode:320500},provinceCode:320000,adminType:'Development Zone',functionalArea:true,center:[120.723,31.324]};
 const corrected=new Map(districts.features.map(f=>[f.properties.adcode,f]));
 return fc([...collection.features.map(f=>corrected.get(f.properties.adcode)||f),...park.features]);
}

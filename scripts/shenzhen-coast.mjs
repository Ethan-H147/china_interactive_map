import assert from 'node:assert/strict';
import mapshaper from 'mapshaper';
export async function clipShenzhenLand(features,land){
  const selected=features.filter(f=>f.properties.adcode===440300||f.properties.parentCity===440300);
  assert(selected.length,'Missing Shenzhen polygons');
  const result=await mapshaper.applyCommands('-i regions.json -clip land.json -o output.json format=geojson geojson-type=FeatureCollection',{'regions.json':{type:'FeatureCollection',features:selected},'land.json':land});
  const clipped=JSON.parse(result['output.json']).features;
  assert.equal(clipped.length,selected.length,'Coastline clipping removed an administrative region');
  const byCode=new Map(clipped.map(f=>[f.properties.adcode,f]));
  return features.map(f=>byCode.get(f.properties.adcode)||f);
}

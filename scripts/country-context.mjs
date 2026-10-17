import assert from 'node:assert/strict';
// Entry destinations are separate from a unit's administrative status.
export const hasFocusedEntry=unit=>!!(unit.overseas||unit.focusOnEntry);
export async function countryContext(country,regions,units,command){
 const fc=features=>({type:'FeatureCollection',features});
 const focused=f=>hasFocusedEntry(units.get(f.properties.id));
 const home=await command(fc(regions.features.filter(f=>!focused(f))),'-dissolve');
 // A property-free dissolve may export a GeometryCollection rather than Features.
 // Normalize both forms before putting the mainland back into a FeatureCollection.
 const parts=value=>{
  if(value.type==='FeatureCollection')return value.features.flatMap(parts);
  if(value.type==='Feature')return parts(value.geometry);
  if(value.type==='GeometryCollection')return value.geometries.flatMap(parts);
  assert(['Polygon','MultiPolygon'].includes(value.type),'Country context requires polygon geometry');
  return value.type==='Polygon'?[value.coordinates]:value.coordinates;
 };
 const coordinates=parts(home);assert(coordinates.length,'Country context must retain mainland land');
 return fc([{type:'Feature',properties:{country},geometry:{type:'MultiPolygon',coordinates}},
  ...regions.features.filter(focused).map(f=>({...f,properties:{country,region:f.properties.id,bounds:units.get(f.properties.id).bounds.flat()}}))]);
}

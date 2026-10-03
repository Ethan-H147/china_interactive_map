import assert from 'node:assert/strict';
import {topology} from 'topojson-server';
import {merge} from 'topojson-client';

// The old DataV city file assigns this detached part to Jiamusi. The newer
// AreaCity county boundary covers it as Qiezihe, Qitaihe. Transfer ownership
// using the existing shared edges so the correction adds no new coordinates.
export function correctJiamusi(features) {
  const jiamusi=features.find(f=>f.properties.adcode===230800);
  const qitaihe=features.find(f=>f.properties.adcode===230900);
  assert(jiamusi&&qitaihe,'Both cities must be present');
  const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
  const candidates=polygons(jiamusi.geometry).filter(p=>p[0].every(([x,y])=>x>131.47&&x<131.64&&y>46.12&&y<46.26));
  if(!candidates.length)return features;
  assert.equal(candidates.length,1,'Unexpected detached Jiamusi parts');
  const part=candidates[0];
  assert.equal(part[0].length,21,'Recheck the reference if source geometry changes');
  const top=topology({regions:{type:'FeatureCollection',features:[qitaihe,{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:part}}]}});
  const qitaiheGeometry=merge(top,top.objects.regions.geometries);
  assert.equal(qitaiheGeometry.coordinates.length,1,'Transferred land must join Qitaihe');
  return features.map(f=>f===jiamusi?{...f,geometry:{type:'MultiPolygon',coordinates:polygons(f.geometry).filter(p=>p!==part)}}:f===qitaihe?{...f,geometry:qitaiheGeometry}:f);
}

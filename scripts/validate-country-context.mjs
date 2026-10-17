import assert from 'node:assert/strict';
import {countryContext} from './country-context.mjs';
const shape={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]};
const feature={type:'Feature',properties:{id:'main'},geometry:shape},regions={type:'FeatureCollection',features:[feature]},units=new Map([['main',{id:'main'}]]);
for(const exported of [shape,{type:'GeometryCollection',geometries:[shape]},{type:'Feature',properties:{},geometry:shape},{type:'FeatureCollection',features:[{type:'GeometryCollection',geometries:[shape]}]},{type:'FeatureCollection',features:[feature]}]){
 const result=await countryContext('example',regions,units,async()=>exported);
 assert.deepEqual(result,{type:'FeatureCollection',features:[{type:'Feature',properties:{country:'example'},geometry:{type:'MultiPolygon',coordinates:[shape.coordinates]}}]});
}
console.log('Country context: raw geometry, GeometryCollection, Feature and FeatureCollection exports retain valid mainland polygons.');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPropertyExpression,latest} from '@maplibre/maplibre-gl-style-spec';
import {settlementFeatures,settlementZoom,settlementDotOpacity,settlementDotLayers,settlementDotVisible} from '../dist/settlement-layer.mjs';
const records=JSON.parse(fs.readFileSync('dist/data/europe/finland/settlements.json')).records;
const features=settlementFeatures(records).features,index=new Map(features.map(f=>[f.properties.id,f]));
const villages=records.filter(r=>r.kind==='Village / hamlet');assert(villages.length>18000);assert(villages.every(r=>settlementZoom(r)>=14));
const expressions=new Map();for(const f of features){const z=f.properties.dotzoom;if(expressions.has(z))continue;const compiled=createPropertyExpression(settlementDotOpacity(z),'circle-opacity',latest.paint_circle['circle-opacity']);assert.equal(compiled.result,'success',JSON.stringify(compiled.value));assert.equal(compiled.value.kind,'camera','Tile-independent camera paint');expressions.set(z,compiled.value);}
const opacity=(f,z)=>expressions.get(f.properties.dotzoom).evaluate({zoom:z});
// A close-up followed by a large zoom-out uses the same paint expression. No
// worker response, moveend event, filter mutation or transition is needed.
for(const z of [16,15,14.1,13.99,10,6,4,15,5,14.5,3]){
 for(const r of villages)if(z<14)assert.equal(opacity(index.get(r.id),z),0,r.en+' hidden during fast zoom-out');
 for(const f of features.filter((_,i)=>i%71===0))assert.equal(opacity(f,z)>0,settlementDotVisible(f,z));
}
const layers=settlementDotLayers('test',{features},'#123456');assert.equal(layers.at(-1).id,'test');assert.deepEqual(layers.at(-1).filter,['==',['get','id'],''],'Selected places have a separate always-visible layer');for(const l of layers.slice(0,-1))assert.equal(l.minzoom,l.filter[2]-.25,'Frame zoom limits also reject stale high-detail tiles');
// Earlier points retain their admission zoom when lower-priority candidates join.
const sample=[{id:'a',center:[0,0],population:{value:1000000}},{id:'b',center:[.001,0],population:{value:10000}},{id:'c',center:[0,0],population:{value:100}}];
const ranked=settlementFeatures(sample).features;assert(ranked[1].properties.dotzoom>ranked[0].properties.dotzoom);assert.equal(ranked[2].properties.dotzoom,25,'Coincident dots never form a stack');
const wrap=settlementFeatures([{id:'east',center:[179.999,0],minzoom:4},{id:'west',center:[-179.999,0],minzoom:4}]).features;assert(wrap[1].properties.dotzoom>4.25,'Spacing crosses the antimeridian');
// Check actual CSS-pixel spacing at multiple camera scales, using a spatial grid.
for(const z of [5,8,10,14,15]){
 const grid=new Map(),scale=512*2**z;
 for(const f of features.filter(f=>opacity(f,z)>0)){
  const [lng,lat]=f.geometry.coordinates,x=(lng+180)/360*scale,y=(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2*scale,gx=Math.floor(x/36),gy=Math.floor(y/36);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const q of grid.get((gx+dx)+','+(gy+dy))||[])assert(Math.hypot(x-q[0],y-q[1])>=36-.001,'Dots keep 36 pixels of space at zoom '+z);
  const key=gx+','+gy;if(!grid.has(key))grid.set(key,[]);grid.get(key).push([x,y]);
 }
}
const code=fs.readFileSync('dist/regional-country.mjs','utf8');assert(!code.includes("['<=',['get','minzoom'],map.getZoom()]"),'Camera visibility never waits for a filter worker');assert(code.includes('settlementDotVisible(settlementDots.get'),'Invisible circles cannot steal map clicks');
console.log('19,121 places: close-up village thresholds, 36px spacing, stable priorities, antimeridian, fractional zoom paint, rapid reversals, selected places and hidden-dot picking passed.');

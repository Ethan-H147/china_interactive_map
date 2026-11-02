import assert from 'node:assert/strict';
import {load,polygons,landIndex,linesOf} from '../geo-index.mjs';
import {command,fc} from '../build-regional-dataset.mjs';
import {nileChannel} from '../egypt-nile.mjs';
import {searchAndSelect} from './countries.test.mjs';

const first=load('dist/data/europe/egypt/first.bin'),legal=load('dist/data/europe/egypt/political.bin'),water=await nileChannel(legal),inRiver=landIndex(water.features.flatMap(f=>polygons(f.geometry).flat())),oldLand=landIndex(legal.features.flatMap(f=>polygons(f.geometry).flat()));
const crossings=first.boundaries.features.flatMap(f=>{
 for(const path of linesOf(fc([f])))for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],p=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(!inRiver(p)||oldLand(p))continue;
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length)continue;
  return [{owners:f.properties.owners,point:p,inside:[p[0]+dy/length*.00008,p[1]-dx/length*.00008]}];
 }return [];
}).sort((a,b)=>a.point[1]-b.point[1]);
assert(crossings.length>5,'Exercise multiple former gaps and bank-to-bank borders');
const probes=[crossings[0],crossings[Math.floor(crossings.length/2)],...crossings.slice(-3)];
const lakes=load('scripts/boundary-sources/nordics/ne-lakes.json.gz').features.filter(f=>f.properties.name==='Lake Nasser'||f.properties.name==='Great Bitter Lake');
const lakeCenters=(await command(fc(lakes),'-points inner')).features.map(f=>f.geometry.coordinates);
export default [1280,390].map(width=>({name:'Egypt filled Nile, joined borders and preserved lakes '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#egypt');await p.evaluate('window.AtlasSheet?.collapse()');
 for(const probe of probes){
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(probe.point)+',zoom:10})');await p.settle();
  assert(await p.evaluate('(()=>{const q=map.project('+JSON.stringify(probe.point)+');return map.queryRenderedFeatures([[q.x-3,q.y-3],[q.x+3,q.y+3]],{layers:["egypt-first-lines"]}).length>0})()'),'Governorate border crosses filled Nile '+probe.owners);
  const ids=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(probe.inside)+');return [...new Set(map.queryRenderedFeatures(q,{layers:["egypt-first-fill"]}).map(f=>f.properties.id))]})()');
  assert.equal(ids.length,1,'Former river gap has one fill owner');assert(probe.owners.includes(ids[0]));
 }
 for(const point of [...lakeCenters,[30.6,29.46],[30.42,29.14]]){
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:9})');await p.settle();
  assert.equal(await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return map.queryRenderedFeatures(q,{layers:["egypt-first-fill"]}).length})()'),0,'Lake cutout remains '+point);
 }
 await searchAndSelect(p,'Giza','Giza','Governorate');
 await p.waitFor('map.getLayer("egypt-second-fill")&&map.isSourceLoaded("egypt-second")');
 const giza=crossings.find(x=>x.owners.includes('EG21'));assert(giza);
 await p.evaluate('void map.jumpTo({center:'+JSON.stringify(giza.point)+',zoom:11})');await p.settle();
 assert(await p.evaluate('map.queryRenderedFeatures({layers:["egypt-second-fill"]}).length>0'),'District fill renders along the restored river');
 assert(await p.evaluate('mapScene.assertOrder()'));assert.equal(await p.evaluate('currentAtlas().getSelection()'),'EG21');
 await p.screenshot('egypt-nile-connected-'+width);
}}));

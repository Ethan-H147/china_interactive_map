import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {decodeData} from '../../dist/geo-pack.mjs';
import {landIndex,polygons} from '../geo-index.mjs';
const sharp=createRequire(import.meta.url)('sharp');
const modern=(await decodeData(fs.readFileSync('dist/data/europe/canada/first.bin'))).regions.features.flatMap(f=>polygons(f.geometry));
const island=modern.find(p=>landIndex(p)([-63.2,49.5])),inside=landIndex(island);
const point=[-64.515,49.87];
assert(inside(point),'Regression coordinate remains modern Anticosti land');
export default [{name:'Historical coast restores gray Anticosti land across overview and detailed zooms',options:{width:1400,height:1000},async run(p,base){
 await p.open(base,'#united-kingdom');
 await p.evaluate('AtlasComfort.set({appearance:"light"});void document.getElementById("historical-snapshot").click()');
 await p.waitFor('!!map.getLayer("united-kingdom-history-fill")');
 await p.evaluate('void document.querySelector('+JSON.stringify('#united-kingdom-history-dock [data-year="1766"]')+').click()');
 await p.waitFor('document.querySelector("#united-kingdom-history-dock .election-year strong").textContent==="1766"');
 for(const projection of ['mercator','globe']){
  await p.evaluate('void map.setProjection({type:'+JSON.stringify(projection)+'})');
  for(const zoom of [5.5,6.99,7.01,9]){
   await p.evaluate('void map.jumpTo('+JSON.stringify({center:point,zoom})+')');await p.settle();
   const sample=await p.evaluate('('+(()=>{const q=map.project(map.getCenter()),r=map.getCanvas().getBoundingClientRect();return{x:Math.floor(q.x+r.x),y:Math.floor(q.y+r.y),place:currentAtlas().hoverAt(q)?.en??null};})+')()');
   const image=await p.screenshot('coastal-gray-'+projection+'-'+zoom);
   const rgb=await sharp(image).extract({left:sample.x,top:sample.y,width:1,height:1}).removeAlpha().raw().toBuffer();
   assert.equal(sample.place,'Province of Quebec','Modern Anticosti land retains dated ownership');
   assert(rgb[0]>rgb[1]+20&&rgb[0]>rgb[2]+20,'Coastal land has solid historical fill instead of gray: '+[...rgb]);
  }
 }
}}, {name:'Historical sea correction clears coarse gray overshoot and refreshes after a distant pan',options:{width:1400,height:1000},async run(p,base){
 await p.open(base,'#united-kingdom');
 await p.evaluate('AtlasComfort.set({appearance:"light"});void map.setProjection({type:"globe"});void document.getElementById("historical-snapshot").click()');
 await p.waitFor('!!map.getLayer("united-kingdom-history-water")');
 for(const zoom of [6.99,9]){
  await p.evaluate('void map.jumpTo({center:[-64.175,49.95],zoom:'+zoom+'})');await p.settle();
  await p.waitFor('map.isSourceLoaded("united-kingdom-history-water")');
  const sample=await p.evaluate('('+(()=>{const q=map.project(map.getCenter()),r=map.getCanvas().getBoundingClientRect(),c=document.createElement('canvas').getContext('2d');c.fillStyle=map.getPaintProperty('background','background-color');c.fillRect(0,0,1,1);return{x:Math.floor(q.x+r.x),y:Math.floor(q.y+r.y),rgb:Array.from(c.getImageData(0,0,1,1).data).slice(0,3)};})+')()');
  const image=await p.screenshot('coarse-gray-sea-'+zoom),rgb=await sharp(image).extract({left:sample.x,top:sample.y,width:1,height:1}).removeAlpha().raw().toBuffer();
  assert(Math.max(...sample.rgb.map((v,i)=>Math.abs(v-rgb[i])))<4,'Actual sea clears the coarse gray background '+[...rgb]);
 }
 const url=await p.evaluate('map.getSource("united-kingdom-history-water").serialize().data');
 assert(url.includes('transform=historical-water')&&url.includes('scope='),'Sea tiles stay bounded to the current view');
}}];

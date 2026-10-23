import assert from 'node:assert/strict';
import {regionalLineWidth} from '../../dist/adaptive-lines.mjs';
const profile=regionalLineWidth(1,true);
async function check(p,label){const layers=await p.evaluate('map.getStyle().layers.filter(l=>l.type==="line"&&mapScene.role(l.id)==="selection").map(l=>({id:l.id,width:map.getPaintProperty(l.id,"line-width")}))');assert(layers.length,label+' has selection outlines');for(const layer of layers)assert.deepEqual(layer.width,profile,label+': '+layer.id+' uses the shared selection width');}
export default [1280,390].map(width=>({name:'Selected outlines share one zoom profile across country adapters '+width,options:{width,height:960,mobile:width===390},async run(p,base){
 await p.open(base,'#brazil');await p.evaluate('currentAtlas().restore("BR-43")');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'BR-43');
 for(const zoom of [4.5,6,9]){await p.evaluate('void map.jumpTo({center:[-53.2,-29.75],zoom:'+zoom+'})');await p.settle();await check(p,'Brazil at zoom '+zoom);}
 await p.evaluate('void map.jumpTo({center:[-53.2,-29.75],zoom:6})');await p.settle();await p.screenshot('shared-selection-brazil-'+width);
 const brazilWidth=await p.evaluate('map.style._layers["south-brazil-selection"].paint.get("line-width").constantOr(-1)');assert(Math.abs(brazilWidth-1.1)<1e-6,'Brazil renders the shared width in CSS pixels');
 await p.evaluate('currentAtlas().restore("BR-4314902")');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'BR-4314902');
 await p.evaluate('void map.jumpTo({center:[-51.17,-30.1],zoom:10})');await p.settle();await check(p,'Brazil municipality');
 await p.evaluate('void changeAtlas("united-states",false)');await p.settle();await p.evaluate('currentAtlas().restore("US-ND")');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'US-ND');
 await p.evaluate('void map.jumpTo({center:[-100.5,47.5],zoom:6})');await p.settle();await check(p,'United States');await p.screenshot('shared-selection-us-'+width);
 const usWidth=await p.evaluate('map.style._layers["united-states-first-selected"].paint.get("line-width").constantOr(-1)');assert.equal(usWidth,brazilWidth,'Brazil and the US render the same selection thickness at the same zoom');
 for(const country of ['china','korea','mongolia','japan','indonesia','malaysia','russia','south-africa','argentina','uruguay']){await p.evaluate('void changeAtlas('+JSON.stringify(country)+',false)');await p.settle();await check(p,country);}
 assert(await p.evaluate('mapScene.assertOrder()'));
}}));

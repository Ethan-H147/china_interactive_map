import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
export default [1280,390].map(width=>({name:'Baikonur city search, boundary, saved view and map selection '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#kazakhstan');await searchAndSelect(p,'Baykonur','Baikonur','Special-status city');
 assert.equal(await p.evaluate('currentAtlas().getSelection()'),'KZ-BAIKONUR');
 assert(await p.evaluate('map.queryRenderedFeatures({layers:["kazakhstan-first-selected"]}).length>0'),'The city has a rendered selection outline');
 const hash=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,hash);assert.equal(await p.evaluate('currentAtlas().getSelection()'),'KZ-BAIKONUR','The saved view restores the city');
 await p.evaluate('void map.jumpTo({center:[63.31,45.62],zoom:11})');await p.settle();
 assert.equal(await p.evaluate('(()=>{const q=map.project([63.31,45.62]);return map.queryRenderedFeatures(q,{layers:["kazakhstan-first-fill"]})[0]?.properties.id})()'),'KZ-BAIKONUR','City land is rendered as Baikonur');
 const point=await p.evaluate('(()=>{const q=map.project([63.31,45.62]),r=map.getCanvas().getBoundingClientRect();return[r.x+q.x,r.y+q.y]})()');await p.tap(point);await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'KZ-BAIKONUR','Map click agrees with search');
 await p.screenshot('baikonur-city-'+width);assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await p.tap('#kz-tab-quiz');assert((await p.evaluate('document.querySelector("#kz-quiz-panel [data-q=count]").textContent')).startsWith('21 Regions & cities available'),'The special city is included in the quiz');
}}));

import assert from 'node:assert/strict';


import {searchAndSelect} from './countries.test.mjs';
export default [[1280,'Addington','Suburb'],[390,'Acton','Locality']].map(([width,name,kind])=>({name:'New Zealand locality search and boundary '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#new-zealand');await searchAndSelect(p,name,name,kind);await p.settle();
 const id=await p.evaluate('currentAtlas().getSelection()');assert.match(id,/^NZ-LINZ-/);assert((await p.evaluate('document.querySelector("#nz-explore-panel h2").textContent')).includes(name));
 await p.waitFor('map.queryRenderedFeatures({layers:["new-zealand-third-selected"]}).length>0');
 assert(await p.evaluate('mapScene.assertOrder()'));
}}));

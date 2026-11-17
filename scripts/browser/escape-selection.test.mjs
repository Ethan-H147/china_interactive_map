import assert from 'node:assert/strict';import {searchAndSelect} from './countries.test.mjs';
const cases=[['australia','Epping NSW','Epping'],['china','Suzhou','Suzhou'],['korea','Busan','Busan'],['mongolia','Darkhan','Darkhan'],['japan','Osaka','Osaka'],['indonesia','Bali','Bali'],['malaysia','Johor','Johor'],['united-states','California','California'],['russia/history=1914','Russian Empire','Russian Empire']];
export default cases.map(([route,query,name])=>({name:'Escape clears '+route+' selection without moving the view',options:{width:1280,height:900},async run(p,base){
 const choose=async()=>{if(!route.includes('/history='))return searchAndSelect(p,query,name);await p.tap('#ru-search');await p.type(query);await p.waitFor('!!document.querySelector("#ru-search-results button")');await p.tap('#ru-search-results button');await p.waitFor('!!captureView().selection');};
 await p.open(base,'#'+route);await choose();await p.settle();await p.waitFor('document.querySelector("aside.sidebar:not([hidden])").getAttribute("aria-busy")!=="true"',{timeout:60000});
 const id=await p.evaluate('captureView().selection');assert(id,'A selected place');
 const camera=await p.evaluate('({center:map.getCenter().toArray(),zoom:map.getZoom(),mode:captureView().mode,scope:captureView().scope})');
 if(route==='australia'){await p.waitFor('document.getElementById("au-flag").naturalWidth>0');await p.tap('#au-flag-source');await p.waitFor('document.getElementById("flag-viewer").open');await p.key('Escape');assert.equal(await p.evaluate('captureView().selection'),id,'Escape closes the dialog first');}
 await p.evaluate('document.querySelector("aside.sidebar:not([hidden]) input[type=search]").focus()');await p.key('Escape');await p.waitFor('!captureView().selection');await p.settle();assert.deepEqual(await p.evaluate('({center:map.getCenter().toArray(),zoom:map.getZoom(),mode:captureView().mode,scope:captureView().scope})'),camera,'Camera, detail level and snapshot stay put');
 assert(!await p.evaluate('document.getElementById("map-shell").dataset.selected==="true"'),'Selection card closes');
 await p.key('Escape');assert(!await p.evaluate('captureView().selection'),'Repeated Escape is harmless');
 await choose();await p.settle();await p.evaluate('document.querySelector("aside.sidebar:not([hidden]) button[id$=tab-layers]").focus()');await p.key('Escape');await p.waitFor('!captureView().selection');
 assert.equal(p.problems.length,0,JSON.stringify(p.problems));assert.equal(p.failures.length,0,JSON.stringify(p.failures));
}}));

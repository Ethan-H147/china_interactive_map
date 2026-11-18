import assert from 'node:assert/strict';


import {searchAndSelect} from './countries.test.mjs';
export default [[1280,'Addington','Suburb'],[390,'Acton','Locality']].map(([width,name,kind])=>({name:'New Zealand locality search and boundary '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#new-zealand');await searchAndSelect(p,name,name,kind);await p.settle();
 const id=await p.evaluate('currentAtlas().getSelection()');assert.match(id,/^NZ-LINZ-/);assert((await p.evaluate('document.querySelector("#nz-explore-panel h2").textContent')).includes(name));
 await p.waitFor('map.queryRenderedFeatures({layers:["new-zealand-third-selected"]}).length>0');
 assert(await p.evaluate('mapScene.assertOrder()'));
}})).concat([{
 name:'One click shows localities across the selected NZ region',
 options:{width:1280,height:900},
 async run(p,base){
  await p.open(base,'#new-zealand');
  await p.evaluate('currentAtlas().restore("NZ-15").then(()=>true)');
  await p.settle();
  await p.tap('#mode-third');
  const matches='map.querySourceFeatures("new-zealand-third").map(f=>f.properties.id)';
  await p.waitFor('map.getLayer("new-zealand-third-fill") && map.queryRenderedFeatures({layers:["new-zealand-third-fill"]}).length',{timeout:10000});
  assert.equal(await p.evaluate('currentAtlas().getSelection()'),'NZ-15');
  // Southland District and Invercargill City are both visible from the region.
  assert(await p.evaluate(matches+'.includes("NZ-LINZ-2088")'));
  assert(await p.evaluate(matches+'.includes("NZ-LINZ-35")'));
  await p.tap('#mode-prefecture');
  await p.waitFor('!map.getLayer("new-zealand-third-fill")');
  await p.tap('#mode-third');
  await p.waitFor('map.getLayer("new-zealand-third-fill") && '+matches+'.includes("NZ-LINZ-2088")');
 }
},{
 name:'Southland locality outlines beside Fiordland on the ordinary map',
 options:{width:1280,height:900},
 async run(p,base){
  await p.open(base,'#new-zealand');
  await searchAndSelect(p,'Southland District','Southland District');
  await p.evaluate('currentAtlas().setMode(3)');
  const probes=[[167.38195,-45.910509],[167.942635,-45.119378]];
  for(const center of probes){
   await p.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:12})');
   await p.settle();
   await p.waitFor('(()=>{const {x,y}=map.project('+JSON.stringify(center)+');return map.queryRenderedFeatures([[x-3,y-3],[x+3,y+3]],{layers:["new-zealand-third-lines"]}).some(f=>String(f.properties.owners).includes("NZ-LINZ-6536"));})()');
  }
 }
}]);

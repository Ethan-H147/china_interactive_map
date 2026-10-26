import assert from 'node:assert/strict';import {searchAndSelect} from './countries.test.mjs';
export default [1280,390].map(width=>({name:'Norway municipality highlights and complete settlement search '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#norway');
 for(const id of ['NO-M-5518','NO-M-5516','NO-M-0301']){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await p.settle();
  for(const mode of [2,3]){await p.evaluate('currentAtlas().setMode('+mode+')');await p.settle();
   assert.deepEqual(await p.evaluate('map.getFilter("norway-second-selection-fill")'),['==',['get','id'],id]);
   const layers=await p.evaluate('map.getStyle().layers.map(l=>l.id)');
   const selected=layers.indexOf('norway-second-selection-fill');
   for(const name of ['norway-first-fill','norway-second-fill',...(mode===3?['norway-third-fill']:[])])assert(selected>layers.indexOf(name),'Selection above child/parent base fills');
   assert(selected<layers.indexOf('norway-second-selected'),'Outline above fill');assert(await p.evaluate('mapScene.assertOrder()'));
  }
  if(id==='NO-M-5518'){await p.evaluate('void map.jumpTo({center:[17.81,68.7],zoom:10})');await p.settle();await p.screenshot('norway-lavangen-fixed-'+width);
   await p.evaluate('(()=>{const e=document.querySelector("[data-region-color]");e.value="population";e.dispatchEvent(new Event("change",{bubbles:true}));})()');await p.settle();
   assert(Array.isArray(await p.evaluate('map.getPaintProperty("norway-second-selection-fill","fill-color")')),'Selection uses population shading when enabled');
   await p.evaluate('(()=>{const e=document.querySelector("[data-region-color]");e.value="none";e.dispatchEvent(new Event("change",{bubbles:true}));})()');await p.settle();}
 }
 await searchAndSelect(p,'Arstein','Årstein','Village');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'NO-SSR-138567');
 assert.equal(await p.evaluate('document.getElementById("no-name").textContent'),'Årstein');assert.equal(await p.evaluate('currentAtlas().getMode()'),2);
 assert(p.requests.some(u=>u.includes('/norway/settlements.bin')));assert(!p.requests.some(u=>u.includes('/norway/settlements.json')));
 await p.screenshot('norway-arstein-'+width);
 await p.evaluate('currentAtlas().home()');assert.equal(await p.evaluate('map.getLayoutProperty("norway-first-selection-fill","visibility")'),'none');
}}));

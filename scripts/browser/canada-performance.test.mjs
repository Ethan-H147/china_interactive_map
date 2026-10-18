import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
export default [
 {name:'northern territory selection uses one slice and stable feature-state colors',options:{width:1280,height:900},async run(p,base){
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.outlineSlices=0;const slice=Blob.prototype.slice;Blob.prototype.slice=function(...args){window.outlineSlices++;return slice.apply(this,args)};`});
  await p.open(base,'#canada');const initial=await p.evaluate('JSON.stringify(map.getPaintProperty("canada-first-fill","fill-color"))');
  assert(initial.includes('feature-state'));await p.evaluate('window.firstSource=map.getSource("canada-first");true');
  let previous='';
  for(const [name,id]of [['Nunavut','CA-NU'],['Northwest Territories','CA-NT'],['Nunavut','CA-NU']]){
   await p.evaluate('window.outlineSlices=0');await searchAndSelect(p,name,name,'Territory');await p.waitFor('document.getElementById("canada-sidebar").getAttribute("aria-busy")!=="true"');await p.settle();
   assert.equal(await p.evaluate('currentAtlas().getSelection()'),id);assert.equal(await p.evaluate('window.outlineSlices'),1,'One slice replaces thousands of island slices');
   assert(await p.evaluate('firstSource===map.getSource("canada-first")'),'Selection reuses the unchanged full-precision polygon source');
   assert.equal(await p.evaluate('JSON.stringify(map.getPaintProperty("canada-first-fill","fill-color"))'),initial,'Selecting a territory never replaces its fill paint expression');
   assert(await p.evaluate('map.getFeatureState({source:"canada-first",id:'+JSON.stringify(id)+'}).selected'),'The selected territory is highlighted');
   if(previous)assert(!await p.evaluate('map.getFeatureState({source:"canada-first",id:'+JSON.stringify(previous)+'}).selected'),'Previous territory highlight is cleared');
   previous=id;
  }
  await p.evaluate('(()=>{const s=document.querySelector("[data-region-color]");s.value="population";s.dispatchEvent(new Event("change",{bubbles:true}));})()');await p.settle();
  assert.notEqual(await p.evaluate('JSON.stringify(map.getPaintProperty("canada-first-fill","fill-color"))'),initial);
  await p.evaluate('(()=>{const s=document.querySelector("[data-region-color]");s.value="none";s.dispatchEvent(new Event("change",{bubbles:true}));})()');await p.settle();
  assert.equal(await p.evaluate('JSON.stringify(map.getPaintProperty("canada-first-fill","fill-color"))'),initial,'Turning color shading off restores the feature-state selection style');
  await p.evaluate('void map.jumpTo({center:[-68.52,63.75],zoom:12})');await p.settle();await p.screenshot('canada-northern-close-detail');
  assert.equal(await p.evaluate('map.getSource("canada-first").serialize().tolerance'),0,'Close-up fill quality is untouched');
 }}
];

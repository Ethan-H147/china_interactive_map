import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
import {load} from '../geo-index.mjs';

const cambridge='GB-OS-osgb4000000074577087',glasgow='GB-OS-osgb4000000074580391',greaterGlasgow='GB-S-S53000230';
export default [1280,390].map(width=>({name:'UK place dots, scoped populations and old links '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#united-kingdom');
 const source=load('dist/data/europe/united-kingdom/settlements.bin');
 await p.evaluate("currentAtlas().restore('GB-S-E63003443')");await p.settle();
 assert.equal(await p.evaluate('currentAtlas().getSelection()'),cambridge,'Former qualified Cambridge link opens the city');
 await p.evaluate("map.jumpTo({center:[.123,52.203],zoom:12});void 0");await p.settle();
 await p.waitFor('!!document.querySelector(\'.settlement-label[data-atlas-place="'+cambridge+'"]\')',{label:'Cambridge label'});
 const center=source.records.find(r=>r.id===cambridge).center;
 const marker=await p.evaluate('(()=>{const e=document.querySelector(\'.settlement-label[data-atlas-place="'+cambridge+'"]\'),b=e.getBoundingClientRect(),c=map.getCanvas().getBoundingClientRect(),q=map.project('+JSON.stringify(center)+');return {text:e.textContent,dx:b.left+b.width/2-c.left-q.x,dy:b.top-c.top-q.y,count:[...document.querySelectorAll(".settlement-label")].filter(el=>el.textContent==="Cambridge").length,point:[q.x+c.left,q.y+c.top]}})()');
 assert.equal(marker.text,'Cambridge');assert.equal(marker.count,1);assert(Math.abs(marker.dx)<=1&&Math.abs(marker.dy-4)<=1,'Label centered 4 px below the dot: '+JSON.stringify(marker));
 if(width===1280){
  await p.tap(marker.point);await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),cambridge);
  await p.screenshot('uk-city-cambridge');
  await p.evaluate('currentAtlas().deselect()');await p.settle();
  // Use an isolated town so this visibility check is independent of label collisions.
  const town=source.records.find(r=>r.id==='GB-OS-osgb4000000074555189'),point={center:town.center,zoom:source.dotzooms[town.id],id:town.id};
  await p.evaluate('for(const l of map.getStyle().layers.filter(l=>l.id.startsWith("united-kingdom-settlements")))map.setPaintProperty(l.id,"circle-color","#ff00ff");void 0');
  for(const [offset,visible] of [[-.3,false],[.1,true],[-.3,false]]){
   await p.evaluate('map.jumpTo({center:'+JSON.stringify(point.center)+',zoom:'+(point.zoom+offset)+'});void 0');await p.settle();
   const state=await p.evaluate('new Promise(resolve=>{map.once("render",()=>{const id='+JSON.stringify(point.id)+',q=map.project('+JSON.stringify(point.center)+'),c=map.getCanvas(),ratio=c.width/c.clientWidth,s=document.createElement("canvas"),ctx=s.getContext("2d");ctx.drawImage(c,Math.round(q.x*ratio)-2,Math.round(q.y*ratio)-2,5,5,0,0,5,5);const rgb=ctx.getImageData(0,0,5,5).data,dot=rgb.some((v,i)=>i%4===0&&v>rgb[i+1]+35&&rgb[i+2]>rgb[i+1]+35);resolve({dot,label:!!document.querySelector(\'.settlement-label[data-atlas-place="\'+id+\'"]\'),hit:currentAtlas().hoverAt(q)?.id===id})});map.triggerRepaint()})');
   assert.deepEqual(state,{dot:visible,label:visible,hit:visible},'Hugh Town painted dot, text and hit target on zoom reversal');
  }
 }
 const council=source.records.find(r=>r.id===glasgow).parentId;
 await p.evaluate('currentAtlas().restore('+JSON.stringify(council)+')');await p.settle();
 assert.equal(await p.evaluate('map.getFeatureState({source:"united-kingdom-second",id:'+JSON.stringify(council)+'}).selected'),true,'Council selection highlights its boundary');
 await p.evaluate('currentAtlas().restore("'+glasgow+'")');await p.settle();
 assert.notEqual(await p.evaluate('map.getFeatureState({source:"united-kingdom-second",id:'+JSON.stringify(council)+'}).selected'),true,'City selection clears council highlight');
 const linked='#gb-place-overview button';await p.waitFor('!!document.querySelector('+JSON.stringify(linked)+')',{label:'Glasgow census area link'});
 const openArea=await p.evaluate('(()=>{const b=[...document.querySelectorAll("#gb-place-overview button")].find(b=>b.textContent==="Greater Glasgow");if(!b)return false;b.click();return true})()');
 assert(openArea);await p.settle();
 assert.equal(await p.evaluate('currentAtlas().getSelection()'),greaterGlasgow);
 const population='document.querySelector("#united-kingdom-sidebar .archipelago-population:not([hidden]) .population-total")?.textContent';
 assert.equal(await p.evaluate(population),'1,023,873','Greater Glasgow census total');
 assert(await p.evaluate('(()=>{const layers=map.getStyle().layers.filter(l=>l.id.startsWith("united-kingdom-")&&(l.metadata?.atlas?.role==="selection"||l.metadata?.atlas?.stableSelectionFill));return layers.length>0&&layers.every(l=>map.getFilter(l.id)?.at(-1)==="")})()'),'Area selection clears administrative highlights');
 assert.equal(await p.evaluate('map.getFilter("united-kingdom-settlements").at(-1)'),'');
 const saved=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,saved);assert.equal(await p.evaluate('currentAtlas().getSelection()'),greaterGlasgow);
 await searchAndSelect(p,'Metropolitan Lisburn','Metropolitan Lisburn','Statistical settlement');
 assert.equal(await p.evaluate(population),'32,643','Metropolitan Lisburn census total');
 await p.evaluate('document.querySelector("#gb-place-overview button").click()');await p.settle();
 assert.equal(await p.evaluate('currentAtlas().getSelection()'),'GB-OSNI-152');
 assert.notEqual(await p.evaluate(population),'32,643','Dunmurry has its own card');
 await searchAndSelect(p,'Brighton and Hove','Brighton and Hove','City');
 assert.equal(await p.evaluate('currentAtlas().getSelection()'),'GB-OS-osgb4000000074570696');
 assert.equal(await p.evaluate(population),'277,105','Brighton and Hove built-up area population');
 const shared=source.records.find(r=>source.dotzooms[r.id]>21&&r.coincidentPlaceIds?.length);
 if(shared){
  const neighbour=shared.coincidentPlaceIds[0];
  await p.evaluate('currentAtlas().restore('+JSON.stringify(neighbour)+')');await p.settle();
  await p.evaluate('(()=>{const b=[...document.querySelectorAll("#gb-place-overview button")].find(b=>b.textContent==='+JSON.stringify(shared.en)+');if(!b)throw Error("Missing co-located place");b.click()})()');
  await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),shared.id);assert.equal(await p.evaluate('map.getFilter("united-kingdom-settlements").at(-1)'),shared.id);
 }
}}));

import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const prefix='united-kingdom-history';
async function jump(p,point,zoom,historical){
 await p.evaluate('void map.jumpTo('+JSON.stringify({center:point,zoom})+')');
 if(historical&&zoom>=7)await p.waitFor('map.getLayer("'+prefix+'-coast-detail")&&map.getPaintProperty("'+prefix+'-coast-detail","fill-opacity")===1',{timeout:90000});
 await p.settle();
}
async function waterPixel(p,point,label){
 const sample=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+'),r=map.getCanvas().getBoundingClientRect(),c=document.createElement("canvas").getContext("2d");c.fillStyle=map.getPaintProperty("background","background-color");c.fillRect(0,0,1,1);return {x:Math.floor(q.x+r.x),y:Math.floor(q.y+r.y),zoom:map.getZoom(),place:currentAtlas().hoverAt(q)?.en??null,rgb:Array.from(c.getImageData(0,0,1,1).data).slice(0,3)}})()');
 const image=await p.screenshot('shared-coast-'+label);
 // At regional zoom a lagoon can be narrower than one screen pixel. Check
 // its exact hit area and the local water footprint, rather than requiring
 // one antialiased shoreline pixel to equal the background exactly.
 assert.equal(sample.place,null,label+' exact water coordinate has no place fill');
 const radius=sample.zoom<6?1:0,size=2*radius+1;
 const pixels=await sharp(image).extract({left:sample.x-radius,top:sample.y-radius,width:size,height:size}).removeAlpha().raw().toBuffer();
 let closest=Infinity;for(let i=0;i<pixels.length;i+=3)closest=Math.min(closest,Math.max(...sample.rgb.map((v,j)=>Math.abs(v-pixels[i+j]))));
 assert(closest<=3,label+' retains visible water without historical or gray fill; RGB error '+closest);
}
const bays=[{name:'choctawhatchee',point:[-86.2,30.45]},{name:'st-andrew',point:[-85.71,30.16]},{name:'east-bay',point:[-85.557147,30.1063134]}];
export default [{
 name:'Modern coastline preserves Panhandle lagoons across zooms',
 options:{width:1600,height:1060},
 async run(p,base){
  await p.open(base,'#united-states');
  await p.evaluate('AtlasComfort.set({appearance:"light"});void map.setProjection({type:"mercator"})');
  for(const bay of bays)for(const zoom of [5.3,6.99,7.01,9.5]){await jump(p,bay.point,zoom,false);await waterPixel(p,bay.point,'modern-'+bay.name+'-'+zoom);}
 }
},{
 name:'British coastline uses the same lagoons and selected outline through the detail handoff',
 options:{width:1600,height:1060},
 async run(p,base){
  await p.open(base,'#united-kingdom');
  await p.evaluate('AtlasComfort.set({appearance:"light"});void map.setProjection({type:"mercator"})');
  await p.evaluate('void document.getElementById("historical-snapshot").click()');
  await p.waitFor('!!map.getLayer("'+prefix+'-fill")');
  await p.evaluate('void document.querySelector('+JSON.stringify('#'+prefix+'-dock [data-year="1779"]')+').click()');
  await p.waitFor('document.querySelector("#'+prefix+'-dock .election-year strong").textContent==="1779"');
  for(const projection of ['mercator','globe']){
   await p.evaluate('void map.setProjection({type:'+JSON.stringify(projection)+'})');
   for(const bay of bays)for(const zoom of [5.3,6.99,7.01,9.5]){await jump(p,bay.point,zoom,true);await waterPixel(p,bay.point,projection+'-'+bay.name+'-'+zoom);}
  }
  await jump(p,[-85,30],5.3,true);
  const xy=await p.evaluate('(()=>{const q=map.project([-84.28,30.44]),r=map.getCanvas().getBoundingClientRect();return [q.x+r.x,q.y+r.y]})()');
  await p.tap(xy);await p.waitFor('document.querySelector("#gb-name").textContent==="East and West Florida"');await p.settle();
  const outline=await p.evaluate('map.getSource("'+prefix+'-selection").serialize().data');
  assert.match(outline,/coastRegion=north-america/,'Selection uses the canonical coast at overview zoom');
  await jump(p,[-86.2,30.45],8,true);
  assert.equal(await p.evaluate('map.getSource("'+prefix+'-selection").serialize().data'),outline,'Selection reuses its same canonical geometry across the detail handoff');
  await waterPixel(p,[-86.2,30.45],'selected-choctawhatchee');
 }
}];

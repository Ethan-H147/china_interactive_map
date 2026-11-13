import assert from 'node:assert/strict';
import sharp from 'sharp';
import {fixtureImagery} from './atlas-audit-helpers.mjs';
const ready=async p=>{await p.evaluate('AtlasContextSourcesController.whenReady()');await p.settle();};
const capture=async p=>sharp(Buffer.from((await p.evaluate('new Promise(resolve=>{map.once("render",()=>resolve(map.getCanvas().toDataURL()));map.triggerRepaint()})')).split(',')[1],'base64')).ensureAlpha().raw().toBuffer();
async function unchanged(p,name){
 await p.evaluate('AtlasContextSourcesController.setEnabled(false)');await ready(p);const full=await p.evaluate('Object.keys(map.style.tileManagers).length'),originals=[await capture(p),await capture(p)];
 await p.evaluate('AtlasContextSourcesController.setEnabled(true)');await ready(p);const lean=await p.evaluate('Object.keys(map.style.tileManagers).length'),optimized=[await capture(p),await capture(p)];
 let persistent=0;const differences=[0,0];assert.equal(originals[0].length,optimized[0].length);
 for(let i=0;i<originals[0].length;i+=4){const changed=optimized.map(frame=>[0,1,2].some(c=>frame[i+c]<Math.min(originals[0][i+c],originals[1][i+c])-2||frame[i+c]>Math.max(originals[0][i+c],originals[1][i+c])+2));changed.forEach((value,index)=>{if(value)differences[index]++;});if(changed.every(Boolean))persistent++;}
 assert(Math.max(...differences)<=32&&persistent<=5,name+': '+persistent+' persistently changed pixels; per frame '+differences.join(', '));
 assert(lean<=full,name+': context residency stays bounded');if(!p.mobile)assert(full-lean>100,name+': inactive shared sources are actually released');assert(await p.evaluate('mapScene.assertOrder()'));
}
export default [{name:'shared contexts retain exact pixels across countries, close borders, poles, globe and flat views',options:{width:1280,height:900},async run(p,base){
 await fixtureImagery(p);await p.open(base,'#singapore');await p.waitFor('atlasesReady');
 for(const [country,center,zoom,projection]of [
  ['singapore',[103.82,1.35],10,'mercator'],['singapore',[103.82,1.35],10,'globe'],
  ['china',[105,36],3.3,'globe'],['china',[179,-10],2.8,'globe'],['china',[0,82],2,'globe'],['china',[0,-82],2,'globe'],
  ['canada',[-72,45],7,'mercator'],['norway',[10.5,61],5.5,'mercator'],['switzerland',[9.55,47.14],10,'mercator'],
  ['france',[7.43,43.74],12,'mercator'],['spain',[-5.32,35.9],11,'globe'],['brazil',[-51.6,4.1],9,'mercator']
 ]){
  await p.evaluate(`changeAtlas(${JSON.stringify(country)},false)`);await p.settle();await p.evaluate(`map.setProjection({type:${JSON.stringify(projection)}});void map.jumpTo({center:${JSON.stringify(center)},zoom:${zoom}})`);await ready(p);await unchanged(p,[country,projection,zoom].join(' '));
 }
 await p.evaluate('AtlasRegionColorController.setMetric("population")');await p.settle();await unchanged(p,'Population shading');await p.evaluate('AtlasRegionColorController.setMetric("none")');
 await p.tap('#satellite-layer');await p.waitFor('satelliteDisplay.state.hasTile');await ready(p);await unchanged(p,'Satellite');await p.tap('#satellite-layer');
 }},{name:'phone navigation restores shared contexts through reversals, interrupted loads and graphics recovery',options:{width:390,height:844,mobile:true},async run(p,base){
 await p.open(base,'#singapore');await p.waitFor('atlasesReady');
 for(const [center,zoom]of [[[9.55,47.14],10],[[179,0],3],[[7.43,43.74],12],[[103.82,1.35],10]]){await p.evaluate(`void map.jumpTo({center:${JSON.stringify(center)},zoom:${zoom}})`);await ready(p);}
 await unchanged(p,'Phone return');
 await p.evaluate('map.easeTo({center:[10,47],zoom:9,duration:400});setTimeout(()=>map.jumpTo({center:[103.82,1.35],zoom:10}),40);void 0');await ready(p);
 for(let i=0;i<3;i++){await p.evaluate('changeAtlas("norway",true)');await ready(p);await p.evaluate('changeAtlas("singapore",true)');await ready(p);}
 assert.equal(await p.evaluate('AtlasCountryMemory.snapshot().countries.length'),1);await unchanged(p,'Phone repeated switches');
 await new Promise(r=>setTimeout(r,11000));
 await p.evaluate('new Promise(resolve=>{const e=map.painter.context.gl.getExtension("WEBGL_lose_context");map.once("webglcontextrestored",()=>resolve(true));map.once("webglcontextlost",()=>setTimeout(()=>e.restoreContext(),100));e.loseContext();})');await ready(p);await unchanged(p,'Graphics restored');
 await p.send('Page.reload');await p.settle();await p.waitFor('atlasesReady');await ready(p);await unchanged(p,'Reloaded');
 }},{name:'rapid China globe zoom reversals reuse prepared contexts and release them after idle',options:{width:1652,height:773},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-globe-v1','true')"});
 await p.open(base,'#china');await p.waitFor('atlasesReady&&chinaCounties');
 await p.evaluate('void map.jumpTo({center:[110.8,32.6],zoom:5.5})');await ready(p);
 const warm=await p.evaluate('AtlasContextSourcesController.snapshot().resident.length'),warmSources=new Set(await p.evaluate('Object.keys(map.style.tileManagers)'));assert(warm>0);
 await p.evaluate('window.contextReloads=[];const originalAddSource=map.addSource;map.addSource=function(id,...args){contextReloads.push(id);return originalAddSource.call(this,id,...args)}');
 for(const zoom of [2.8,5.5,2.6,5.5,2.8,5.5,2.6,5.5])await p.evaluate(`new Promise(resolve=>{map.once('moveend',()=>resolve(true));map.easeTo({zoom:${zoom},duration:300,easing:t=>t})})`);
 await ready(p);const admissions=await p.evaluate('contextReloads');assert.equal(admissions.length,new Set(admissions).size,'Short mouse-wheel gestures admit each newly encountered source at most once');assert(admissions.every(id=>!warmSources.has(id)),'Previously prepared sources survive repeated reversals');
 await p.evaluate('void map.jumpTo({zoom:3.3})');await p.settle();await new Promise(resolve=>setTimeout(resolve,3300));await ready(p);
 assert(await p.evaluate('AtlasContextSourcesController.snapshot().resident.length')<warm,'Unused background data still unloads after the retention window');
 assert.equal(await p.evaluate('AtlasCountryMemory.snapshot().countries.length'),1);
 }}];

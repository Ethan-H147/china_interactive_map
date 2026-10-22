import assert from 'node:assert/strict';
import {sleep} from './harness.mjs';
async function wheel(p,dx,dy,modifiers=0){const [x,y]=await p.evaluate('(()=>{const r=map.getCanvas().getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()');await p.send('Input.dispatchMouseEvent',{type:'mouseWheel',x,y,deltaX:dx,deltaY:dy,modifiers});}
// Globe keeps apparent radius constant by adjusting Mercator zoom with latitude.
const camera=p=>p.evaluate('({center:map.getCenter().toArray(),zoom:map.getZoom(),apparentZoom:map.getZoom()-(map.getProjection().type==="globe"?Math.log2(Math.cos(map.getCenter().lat*Math.PI/180)):0),bearing:map.getBearing()})');
const selectMode=async(p,mode)=>{await p.tap('#settings-open');await p.evaluate(`(()=>{const e=document.getElementById('settings-map-interaction');e.value=${JSON.stringify(mode)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await p.tap('#settings-close');};
export default [{name:'iPad trackpad scroll pans on both axes, pinch zooms, and device preference preserves mouse mode',options:{width:1366,height:1024,mobile:true},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'platform',{get:()=> 'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});"});
 await p.open(base,'#bolivia');assert.equal(await p.evaluate('AtlasInputController.getResolvedMode()'),'trackpad');
 for(const projection of ['mercator','globe']){
  if(projection==='globe'){await p.tap('#globe-view');await p.settle();}
  const before=await camera(p);await p.evaluate('window.trackpadEnds=0;window.endListener=()=>trackpadEnds++;void map.on("moveend",endListener)');
  for(let i=0;i<8;i++){await wheel(p,0,10);await sleep(16);}await p.settle();
  const after=await camera(p);assert(Math.abs(after.apparentZoom-before.apparentZoom)<1e-6,'Vertical scrolling pans without zooming in '+projection+': '+JSON.stringify({before,after}));assert.notDeepEqual(after.center,before.center);assert(after.center[1]<before.center[1],'Natural scrolling moves the camera down for a positive scroll delta');
  // DevTools round trips can outlast the gesture on a software renderer.
  // Keep native wheel coverage above; measure batching with one controlled burst.
  await p.evaluate('(()=>{trackpadEnds=0;const el=map.getCanvas(),r=el.getBoundingClientRect();for(let i=0;i<8;i++)el.dispatchEvent(new WheelEvent("wheel",{deltaY:10,clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true,cancelable:true}));})()');await p.settle();
  assert.equal(await p.evaluate('trackpadEnds'),1,'A wheel burst rebuilds labels once');await p.evaluate('void map.off("moveend",endListener)');
  const horizontal=await camera(p);for(let i=0;i<6;i++){await wheel(p,12,0);await sleep(16);}await p.settle();assert.notEqual((await camera(p)).center[0],horizontal.center[0]);assert(Math.abs((await camera(p)).apparentZoom-horizontal.apparentZoom)<1e-6);
  const zoom=await p.evaluate('map.getZoom()');await wheel(p,0,-80,2);await p.settle();assert((await p.evaluate('map.getZoom()'))>zoom,'Ctrl-wheel pinch remains native map zoom');assert.equal(await p.evaluate('visualViewport.scale'),1,'Pinch does not zoom the web page');
 }
 await selectMode(p,'mouse');const mouseZoom=await p.evaluate('map.getZoom()');await wheel(p,0,80);await p.settle();assert((await p.evaluate('map.getZoom()'))<mouseZoom,'Mouse mode retains wheel zoom');
 await p.send('Page.reload',{ignoreCache:true});await p.waitFor('window.AtlasInputController?.getMode()==="mouse"');await p.settle();assert.equal(await p.evaluate('AtlasInputController.getResolvedMode()'),'mouse','The choice persists on this iPad');
 await selectMode(p,'trackpad');
 const safariStart=await p.evaluate('map.getZoom()');
 await p.evaluate(`(()=>{const el=map.getCanvas(),r=el.getBoundingClientRect();for(const [type,scale]of [['gesturestart',1],['gesturechange',1.25]]){const e=new Event(type,{bubbles:true,cancelable:true});Object.assign(e,{scale,clientX:r.x+r.width/2,clientY:r.y+r.height/2});el.dispatchEvent(e);}})()`);
 await wheel(p,0,-80,2);await p.evaluate('map.getCanvas().dispatchEvent(new Event("gestureend",{bubbles:true,cancelable:true}))');await p.settle();
 assert(Math.abs((await p.evaluate('map.getZoom()'))-safariStart-Math.log2(1.25))<.01,'Safari scale events zoom once when wheel events accompany them');assert.equal(await p.evaluate('map.getBearing()'),0);
 const touchZoom=await p.evaluate('map.getZoom()');const [x,y]=await p.evaluate('(()=>{const r=map.getCanvas().getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()');
 await p.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-35,y},{x:x+35,y}]});for(let i=1;i<=8;i++){await p.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-35-i*5,y},{x:x+35+i*5,y}]});await sleep(20);}await p.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.settle();assert((await p.evaluate('map.getZoom()'))>touchZoom,'Touchscreen pinch still works');
 await p.tap('#settings-open');await p.evaluate('document.getElementById("settings-map-interaction").scrollIntoView({block:"center"})');await p.screenshot('ipad-trackpad-setting');await p.tap('#settings-reset');await p.tap('#settings-close');assert.equal(await p.evaluate('AtlasInputController.getMode()'),'auto');
}},{name:'Windows mouse default, explicit trackpad mode, scroll batching and click dragging',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#bolivia');assert.equal(await p.evaluate('AtlasInputController.getResolvedMode()'),'mouse');
 const before=await camera(p);await wheel(p,0,100);await p.settle();assert((await camera(p)).zoom<before.zoom);
 await selectMode(p,'trackpad');
 await p.evaluate('void map.jumpTo({center:[-65,-17],zoom:5})');await p.settle();
 const delta=await p.evaluate('(()=>{window.panStart=map.getCenter().toArray();window.panAnchor=map.getCenter();const p=map.project(panAnchor);return [p.x,p.y];})()');
 for(let i=0;i<12;i++){await wheel(p,8,0);await sleep(16);}await p.settle();
 const moved=await p.evaluate('(()=>{const p=map.project(panAnchor);return [p.x,p.y]})()');assert(Math.abs(delta[0]-moved[0]-96)<2,'Wheel panning preserves accumulated distance across map frames: '+JSON.stringify({delta,moved}));
 const clickBefore=await camera(p);await p.drag('#map',{dx:120,dy:40},{steps:16,duration:300});await p.settle();assert.notDeepEqual((await camera(p)).center,clickBefore.center,'Click-drag remains available');
 await p.tap('#settings-open');const zoom=await p.evaluate('map.getZoom()');await p.evaluate('document.querySelector("#atlas-settings .settings-content").dispatchEvent(new WheelEvent("wheel",{deltaY:100,bubbles:true,cancelable:true}))');assert.equal(await p.evaluate('map.getZoom()'),zoom,'Settings scrolling never moves the map');await p.tap('#settings-close');
}}];

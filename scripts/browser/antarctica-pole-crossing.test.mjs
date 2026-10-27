import assert from 'node:assert/strict';
import {sleep} from './harness.mjs';
async function dragAcrossPole(p,dx,bearing){
 await p.evaluate('void map.jumpTo('+JSON.stringify({center:[0,-89.4],zoom:2,bearing,padding:{top:0,bottom:0,left:0,right:0}})+')');await p.settle();
 const box=await p.evaluate('(()=>{const b=map.getCanvas().getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height}})()');
 const start=[box.x+box.w*.45,box.y+box.h*.43];
 const ground=await p.evaluate('map.unproject(['+(start[0]-box.x)+','+(start[1]-box.y)+']).toArray()');
 const pointer=async(type,x)=>p.mobile?p.send('Input.dispatchTouchEvent',{type:type==='down'?'touchStart':type==='move'?'touchMove':'touchEnd',touchPoints:type==='up'?[]:[{x,y:start[1]}]}):p.send('Input.dispatchMouseEvent',{type:type==='down'?'mousePressed':type==='move'?'mouseMoved':'mouseReleased',x,y:start[1],button:'left',buttons:type==='up'?0:1,clickCount:1});
 await pointer('down',start[0]);let closest=0;
 for(let step=1;step<=16;step++){
  const delta=dx*step/16;await pointer('move',start[0]+delta);await sleep(45);
  const state=await p.evaluate('(()=>{const a=map.project('+JSON.stringify(ground)+');return {x:a.x,y:a.y,lat:map.getCenter().lat,zoom:map.getZoom()}})()');
  closest=Math.max(closest,Math.abs(state.lat));
  if(!p.mobile||step>=4)assert(Math.abs(state.x-(start[0]-box.x+delta))<2,'Ground follows pointer: '+JSON.stringify({step,delta,state,start,box}));
  assert(Math.abs(state.y-(start[1]-box.y))<2,'A horizontal drag does not arc vertically around an axis');
  assert(Number.isFinite(state.zoom)&&Math.abs(state.zoom-2)<.01,'Globe size stays fixed through the crossing');
 }
 assert(closest>89.9,'The drag actually passes through the polar camera region');
 await pointer('up',start[0]+dx);await p.settle();
 const final=await p.evaluate('(()=>{const a=map.project('+JSON.stringify(ground)+');return [a.x,a.y]})()');
 assert(Math.abs(final[0]-(start[0]-box.x+dx))<2&&Math.abs(final[1]-(start[1]-box.y))<2,'Releasing does not snap or orbit the map');
}
export default [1280,390].map(width=>({name:'Small horizontal drags cross the pole directly in both directions '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#antarctica');
 await p.evaluate('for(const id of ["aq-label-layer","aq-station-layer"]){const e=document.getElementById(id);e.checked=false;e.dispatchEvent(new Event("change"));}');
 await dragAcrossPole(p,80,-90);await dragAcrossPole(p,-80,90);
 // Two-finger trackpad scrolling takes a different native camera path.
 await p.evaluate('AtlasInputController.setMode("trackpad");void map.jumpTo({center:[0,-89.4],zoom:2,bearing:-90,padding:{top:0,bottom:0,left:0,right:0}})');await p.settle();
 const point=await p.evaluate('(()=>{const b=map.getCanvas().getBoundingClientRect();return [b.x+b.width*.45,b.y+b.height*.43]})()');
 const grabbed=await p.evaluate('map.getCenter().toArray()');
 const projected=()=>p.evaluate('(()=>{const a=map.project('+JSON.stringify(grabbed)+');return [a.x,a.y]})()');
 const origin=await projected();
 // Chrome's mobile emulation scales injected wheel deltas by device density.
 // Compare against the CSS-pixel delta that the browser actually delivers.
 await p.evaluate('window.polarWheelDelta=0;window.polarWheelProbe=e=>polarWheelDelta+=e.deltaX;window.addEventListener("wheel",polarWheelProbe,{capture:true})');
 for(let step=1;step<=8;step++){
  await p.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:point[0],y:point[1],deltaX:-10,deltaY:0});await sleep(160);
  const a=await projected(),delta=await p.evaluate('polarWheelDelta');assert(Math.abs(a[0]-origin[0]+delta)<2&&Math.abs(a[1]-origin[1])<2,'Trackpad follows pointer: '+JSON.stringify({step,a,origin,delta}));
 }
 assert(Math.abs(await p.evaluate('polarWheelDelta'))>=30,'The trackpad probe sends a real horizontal scroll');
 await p.evaluate('window.removeEventListener("wheel",polarWheelProbe,{capture:true})');await p.settle();
 const view=await p.evaluate('AtlasView.hashFor(captureView())');assert(view,'A camera beyond the Mercator latitude limit can be shared');
 const before=await p.evaluate('({center:map.getCenter().toArray(),bearing:map.getBearing(),zoom:map.getZoom()})');
 await p.open(base,view);
 const after=await p.evaluate('({center:map.getCenter().toArray(),bearing:map.getBearing(),zoom:map.getZoom()})');
 assert(Math.abs(before.center[1]-after.center[1])<.001);assert(Math.abs(before.bearing-after.bearing)<.01);
 assert(Math.abs(before.zoom-after.zoom)<.001,'Saved views retain their zoom across the pole');
 await p.screenshot('antarctica-direct-pole-drag-'+width);
 assert.equal(await p.evaluate('map.getProjection().type'),'globe');
 await p.evaluate('changeAtlas("bahrain",false)');await p.settle();
 assert.equal(await p.evaluate('AtlasGlobeNavigation.freeGlobePan()'),false,'Other country maps keep their existing controls');
}}));

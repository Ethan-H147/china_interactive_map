import assert from 'node:assert/strict';
import {sleep} from './harness.mjs';
const points=[[-3,55],[2,48],[15,52],[30,57],[20,0],[25,-15],[100,35],[80,24],[134,-25],[-100,40],[-60,-15],[114,0]];
export default [1280,390].map(width=>({name:'Prepared world stays complete through delayed tiles, zoom reversals and gestures '+width,options:{width,height:960,mobile:width===390},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-globe-v1','true');"});
 await p.open(base,'#finland');await p.waitFor('AtlasGlobeOverviewController.snapshot().ready');
 await p.evaluate('void map.jumpTo({center:[25,62],zoom:15})');await p.settle();
 // Delay all detail work. Camera changes must reuse the already prepared world.
 await p.evaluate(`window.overviewLoads=0;window.detailDelays=0;for(const [id,manager]of Object.entries(map.style.tileManagers)){const s=manager.getSource();if(s.type!=='geojson')continue;const load=s.loadTile.bind(s);s.loadTile=async(...args)=>{if(id.startsWith('globe-overview-'))overviewLoads++;else{detailDelays++;await new Promise(r=>setTimeout(r,650));}return load(...args);};}
 window.overviewFrames=[];window.inspectOverview=()=>{
  if(map.getZoom()>5)return;
  const canvas=map.getCanvas(),gl=canvas.getContext('webgl2'),pixels=new Uint8Array(canvas.width*canvas.height*4),scale=canvas.width/canvas.clientWidth,c=map.getCenter(),r=Math.PI/180;
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let tested=0;const missing=[];
  for(const pt of ${JSON.stringify(points)}){
   const facing=Math.sin(pt[1]*r)*Math.sin(c.lat*r)+Math.cos(pt[1]*r)*Math.cos(c.lat*r)*Math.cos((pt[0]-c.lng)*r);
   if(facing<.6)continue;const q=map.project(pt);
   if(q.x<10||q.y<10||q.x>canvas.clientWidth-10||q.y>canvas.clientHeight-10)continue;
   tested++;const x=Math.round(q.x*scale),y=canvas.height-1-Math.round(q.y*scale),i=(y*canvas.width+x)*4;
   if(pixels[i]>233&&pixels[i+1]>237&&pixels[i+2]>237)missing.push(pt);
  }
  overviewFrames.push({zoom:map.getZoom(),tested,missing,ready:AtlasGlobeOverviewController.snapshot().ready,ratio:map.getPixelRatio()});
 };map.on('render',inspectOverview);void 0`);
 await p.send('Emulation.setCPUThrottlingRate',{rate:3});
 await p.evaluate(`new Promise(resolve=>{map.easeTo({center:[10,25],zoom:1.5,duration:300});setTimeout(()=>map.easeTo({zoom:11,duration:160}),100);setTimeout(()=>{map.once('moveend',()=>resolve(true));map.easeTo({center:[10,25],zoom:1.5,duration:350});},220);})`);await p.settle();
 for(const center of [[105,30],[-90,15],[155,-20],[179,5],[-180,0],[180,0],[540,0],[0,78]]){
  await p.evaluate('void map.easeTo({center:'+JSON.stringify(center)+',zoom:1.5,duration:150})');await p.settle();
 }
 await p.send('Emulation.setCPUThrottlingRate',{rate:1});
 await p.evaluate('void map.jumpTo({center:[10,25],zoom:4})');await p.settle();
 const [x,y]=await p.evaluate('(()=>{const r=map.getCanvas().getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()');
 const zoom=await p.evaluate('map.getZoom()');
 if(width===390){
  const touch=async(type,distance)=>p.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:0,x:x-distance/2,y},{id:1,x:x+distance/2,y}]});
  await touch('touchStart',160);
  for(let i=1;i<=12;i++){await touch('touchMove',160-i*10);await sleep(16);}
  await touch('touchEnd',0);
 }else await p.send('Input.dispatchMouseEvent',{type:'mouseWheel',x,y,deltaX:0,deltaY:600,modifiers:2});
 await p.settle();assert((await p.evaluate('map.getZoom()'))<zoom-.25,'Native wheel/pinch zoom stays responsive');
 const report=await p.evaluate('({loads:overviewLoads,delays:detailDelays,frames:overviewFrames})');
 assert(report.frames.length>4);assert(report.frames.some(f=>f.tested>2));
 assert(report.frames.every(f=>!f.missing.length),'No sampled land turns into empty tile water: '+JSON.stringify(report.frames.filter(f=>f.missing.length)));
 assert.equal(report.loads,0,'The world reuses prepared buffers throughout all camera changes');assert(report.delays>0,'Slow detail preparation was exercised');assert(report.frames.every(f=>f.ready));
 assert(report.frames.every(f=>f.ratio===(width===390?2:1)),'World movement retains native sharpness');
 await p.evaluate('void map.off("render",inspectOverview)');
 const before=await p.evaluate('map.getCenter().toArray()');await p.drag('#map',{dx:width===390?65:150,dy:15},{duration:220,steps:12});await p.settle();
 assert.notDeepEqual(await p.evaluate('map.getCenter().toArray()'),before,'Drag stays responsive');
 assert.equal(await p.evaluate('document.querySelector(".map-handoff-frame").style.display'),'none','No frozen screenshot blocks navigation');
 assert(await p.evaluate('mapScene.assertOrder()'));await p.screenshot('globe-overview-verified-'+width);
 await p.evaluate('void map.jumpTo({center:[25,62],zoom:10})');await p.settle();assert.equal(await p.evaluate('mapScene.overview'),false,'Detailed country layers return when zooming back in');
}}));

// Loaded only by the local /benchmark preview route; never included in production.
const benchmarkReady=new Promise(resolve=>{
 const check=()=>{if(typeof motionRenderer==='undefined'){setTimeout(check,100);return;}if(new URLSearchParams(location.search).has('full-detail')){motionRenderer.begin=async()=>false;motionRenderer.end=()=>{};}resolve();};check();
});
const movementSamples=[];
let movementStarted=0;
function watchMovement(){
 if(typeof map==='undefined'||typeof map.on!=='function'){setTimeout(watchMovement,100);return;}
 map.on('movestart',()=>{movementStarted=performance.now();});
 map.on('moveend',()=>{movementSamples.push([movementStarted,performance.now()]);movementStarted=0;});
}watchMovement();
function motionStats(gaps,tasks){
 const moving=gaps.filter(s=>movementSamples.some(([start,end])=>s.at>=start&&s.at<=end));
 const sorted=moving.map(s=>s.ms).sort((a,b)=>a-b);
 return {frames:moving.length,p95ms:Math.round(sorted[Math.floor(sorted.length*.95)]||0),worstFrameMs:Math.round(Math.max(0,...sorted)),framesOver50ms:sorted.filter(ms=>ms>50).length,longTasksMs:tasks.filter(s=>movementSamples.some(([start,end])=>s.at<end&&s.at+s.ms>start)).map(s=>Math.round(s.ms))};
}
const benchmarkButton=document.createElement('button');
benchmarkButton.textContent='Measure panning';
benchmarkButton.id='benchmark-start';
benchmarkButton.style.cssText='position:fixed;bottom:10px;left:10px;z-index:9999;background:white;border:1px solid #555;padding:8px';
const benchmarkResult=document.createElement('pre');
benchmarkResult.id='benchmark-result';
benchmarkResult.style.cssText='position:fixed;bottom:44px;left:10px;z-index:9999;background:white;color:black;padding:8px;max-width:90vw;white-space:pre-wrap;font-size:11px';
document.body.append(benchmarkButton,benchmarkResult);
const switchButton=document.createElement('button');
switchButton.id='benchmark-switch';switchButton.textContent='Measure atlas switching';
switchButton.style.cssText='position:fixed;bottom:10px;left:150px;z-index:9999;background:white;border:1px solid #555;padding:8px';
document.body.append(switchButton);
const regionButton=document.createElement('button');
regionButton.textContent='Measure region selection';regionButton.id='benchmark-regions';
regionButton.style.cssText='position:fixed;bottom:10px;left:330px;z-index:9999;background:white;border:1px solid #555;padding:8px';
document.body.append(regionButton);
regionButton.onclick=async()=>{
 if(!allReady||cameraBusy)return;
 regionButton.disabled=true;benchmarkResult.textContent='Measuring selections…';
 await koreaAtlas.warm();await mongoliaAtlas.warm();
 await changeAtlas('china');await reset();
 await benchmarkReady;movementSamples.length=0;
 const gaps=[],tasks=[],times=[],samples=[];let previous=0,tracking=true;
 const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration}))));observer.observe({type:'longtask'});
 function frame(t){if(!tracking)return;if(previous){gaps.push(t-previous);samples.push({at:t,ms:t-previous});}previous=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);
 for(const code of [540000,440000,710000,220000,810000,650000,310000,230000]){
  const start=performance.now();await selectRegion(provinceLayers.get(code),code);
  if(!map.loaded())await new Promise(resolve=>map.once('idle',resolve));
  times.push({code,ms:Math.round(performance.now()-start)});await new Promise(resolve=>setTimeout(resolve,250));
 }
 tracking=false;observer.disconnect();const sorted=gaps.slice().sort((a,b)=>a-b);
 benchmarkResult.textContent=JSON.stringify({motion:motionStats(samples,tasks),selections:times,frames:gaps.length,p95ms:Math.round(sorted[Math.floor(sorted.length*.95)]),worstFrameMs:Math.round(Math.max(...gaps)),framesOver50ms:gaps.filter(ms=>ms>50).length,longTasksMs:tasks.map(s=>Math.round(s.ms))},null,2);
 regionButton.disabled=false;
};
switchButton.onclick=async()=>{
 if(!allReady||cameraBusy||!koreaAtlas)return;
 switchButton.disabled=true;benchmarkResult.textContent='Measuring switches…';
 await koreaAtlas.warm();await mongoliaAtlas.warm();
 await benchmarkReady;movementSamples.length=0;
 const gaps=[],tasks=[],times=[],samples=[];let previous=0,tracking=true;
 const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration}))));
 observer.observe({type:'longtask'});
 function frame(t){if(!tracking)return;if(previous){gaps.push(t-previous);samples.push({at:t,ms:t-previous});}previous=t;requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
 for(const next of ['korea','china','korea','china','mongolia','korea','mongolia','china']){
  const start=performance.now();await changeAtlas(next);
  if(!map.loaded())await new Promise(resolve=>map.once('idle',resolve));
  times.push({mode:next,ms:Math.round(performance.now()-start)});
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 tracking=false;observer.disconnect();
 const sorted=gaps.slice().sort((a,b)=>a-b);
 benchmarkResult.textContent=JSON.stringify({motion:motionStats(samples,tasks),switches:times,frames:gaps.length,p95ms:Math.round(sorted[Math.floor(sorted.length*.95)]),worstFrameMs:Math.round(Math.max(...gaps)),framesOver50ms:gaps.filter(ms=>ms>50).length,longTasksMs:tasks.map(s=>Math.round(s.ms))},null,2);
 switchButton.disabled=false;
};
benchmarkButton.onclick=async()=>{
  if(!allReady)return;
  benchmarkButton.disabled=true;
  benchmarkResult.textContent='Measuring…';
  await selectRegion(provinceLayers.get(120000),120000);
  const gpu=typeof maplibregl!=='undefined';
  map.setZoom(map.getZoom()+2);
  if(gpu&&!map.loaded())await new Promise(resolve=>map.once('idle',resolve));
  await new Promise(resolve=>setTimeout(resolve,250));
  const intervals=[];let running=true,last=0;
  function frame(t){if(!running)return;if(last)intervals.push(t-last);last=t;requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  for(const offset of [[180,0],[-180,0],[0,140],[0,-140]]){
    map.panBy(offset,{animate:true,duration:gpu?1000:1,easeLinearity:1,easing:t=>t});
    await new Promise(resolve=>setTimeout(resolve,1100));
  }
  running=false;
  const sorted=[...intervals].sort((a,b)=>a-b),mean=intervals.reduce((a,b)=>a+b,0)/intervals.length;
  benchmarkResult.textContent=JSON.stringify({renderer:gpu?'WebGL':'SVG',frames:intervals.length,fps:Number((1000/mean).toFixed(1)),p95ms:Number(sorted[Math.floor(sorted.length*.95)].toFixed(1)),over50ms:intervals.filter(t=>t>50).length,viewport:[map.getContainer().clientWidth,map.getContainer().clientHeight]},null,2);
  benchmarkButton.disabled=false;
};

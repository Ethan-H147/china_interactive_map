import {createRenderBudget,resizeDuringMotion} from './render-budget.mjs';
import {summarizeCadence,createGestureHistory,createMotionTrace} from './frame-timing.mjs';
// Rendering choices belong to this device, independently of account preferences.
const key='boundary-atlas-rendering-v1';
export const defaults=Object.freeze({quality:'balanced',antialias:true,diagnostics:false});
export function validate(value){
 const result={...defaults};
 if(['full','balanced','performance'].includes(value?.quality))result.quality=value.quality;
 for(const field of ['antialias','diagnostics'])if(typeof value?.[field]==='boolean')result[field]=value[field];
 return result;
}
let preferences;try{preferences=validate(JSON.parse(globalThis.localStorage?.getItem(key)));}catch{preferences={...defaults};}
export const getPreferences=()=>({...preferences});
export function setPreferences(patch){
 preferences=validate({...preferences,...patch});
 try{globalThis.localStorage?.setItem(key,JSON.stringify(preferences));}catch{}
 globalThis.dispatchEvent?.(new Event('atlas-rendering-change'));
}
export function targetRatio(deviceRatio,quality,moving){
 const native=Number.isFinite(deviceRatio)&&deviceRatio>0?deviceRatio:1;
 return moving?Math.min(native,quality==='performance'?1:quality==='balanced'?1.5:native):native;
}
export const contextOptions=()=>({antialias:preferences.antialias});
export function summarize(intervals,duration,draws){
 const sorted=intervals.filter(v=>Number.isFinite(v)&&v>=0).sort((a,b)=>a-b);
 return {drawFps:duration>0?Math.round(draws*1000/duration):0,p95:sorted.length?Math.round(sorted[Math.ceil(sorted.length*.95)-1]*10)/10:0,samples:sorted.length};
}

export function attach(map,{refreshLabels=()=>{}}={}){
 const bootAntialias=preferences.antialias;
 let moving=false,reduced=false,inputActive=false,settingRatio=false,restoreTimer,frame=0,lastFrame,start=0,draws=0,intervals=[],last=null,lastPaint=0,labelsSuppressed=false,panel,output,report;
 const history=createGestureHistory(),sessionStarted=performance.now(),sampleLimit=600;
 const trace=createMotionTrace();let tracing=false;
 const nativeRender=map._render;
 const timedRender=typeof nativeRender==='function'?function(...args){
  if(!moving||!tracing)return nativeRender.apply(this,args);
  const time=performance.now();try{return nativeRender.apply(this,args);}finally{trace.cpu(performance.now()-time);}
 }:null;
 if(timedRender)map._render=timedRender;
 const cameraPosition=()=>{const center=map.getCenter();return [center.lng,center.lat,map.getZoom(),map.getBearing()];};
 const traceInput=event=>{if(moving&&tracing&&(event.type==='wheel'||event.buttons)){const samples=event.getCoalescedEvents?.(),times=samples?.length?samples.map(sample=>sample.timeStamp):[event.timeStamp];trace.input(event.type,performance.now(),times.length,times);}};
 const traceCamera=()=>{if(moving&&tracing)trace.camera(performance.now(),cameraPosition());};
 const traceCanvas=map.getCanvas(),traceTypes=['pointermove','wheel'];for(const type of traceTypes)traceCanvas.addEventListener(type,traceInput,{capture:true,passive:true});map.on('move',traceCamera);
 let gestureCanvas,drawIntervals=[],lastDraw,cullMaximum=0,intervalCount=0,intervalTotal=0,drawIntervalCount=0,maxFrameGapMs=0,maxRenderGapMs=0,ratioMin=Infinity,ratioMax=0,movementCountry,contextLosses=0;
 let longTasks=0,longTaskMs=0,maxLongTaskMs=0,observer;
 let longFrames=[],frameObserver;
 const recordLongFrames=entries=>{for(const entry of entries)if(entry.startTime>=start){
  longFrames.push({duration:entry.duration,blockingDuration:entry.blockingDuration,renderStart:entry.renderStart,styleAndLayoutStart:entry.styleAndLayoutStart,
   scripts:[...(entry.scripts||[])].sort((a,b)=>b.duration-a.duration).slice(0,8).map(script=>({duration:script.duration,invoker:script.invoker,invokerType:script.invokerType,sourceURL:script.sourceURL,sourceFunctionName:script.sourceFunctionName,sourceCharPosition:script.sourceCharPosition,forcedStyleAndLayoutDuration:script.forcedStyleAndLayoutDuration}))});
  if(longFrames.length>12)longFrames.shift();
 }};
 if(globalThis.PerformanceObserver?.supportedEntryTypes?.includes('long-animation-frame')){frameObserver=new PerformanceObserver(list=>{if(moving)recordLongFrames(list.getEntries());});frameObserver.observe({type:'long-animation-frame'});}
 const pushSample=(values,value,count)=>{values[count%sampleLimit]=value;};
 const recordLongTasks=entries=>{for(const task of entries)if(task.startTime>=start){longTasks++;longTaskMs+=task.duration;maxLongTaskMs=Math.max(maxLongTaskMs,task.duration);}};
 if(globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')){observer=new PerformanceObserver(list=>{if(moving)recordLongTasks(list.getEntries());});observer.observe({type:'longtask'});}
 const resources=()=>{const managers=Object.values(map.style?.tileManagers||{});return {sources:managers.length,layers:map.style?._order?.length??null,inViewTiles:managers.reduce((sum,m)=>sum+(m._inViewTiles?.getAllTiles?.().length||0),0),cachedTiles:managers.reduce((sum,m)=>sum+(m._outOfViewCache?.order?.length||0),0),jsHeapBytes:performance.memory?.usedJSHeapSize??null};};
 let observedRatio=globalThis.devicePixelRatio||1;
 const budget=createRenderBudget({quality:preferences.quality,deviceRatio:observedRatio}),canvas=map.getCanvas();
 let probeFrame=0,probeTimer,probeEpoch=0,displayFps=60,budgetContext,budgetLearnedAt=0;
 function prepareBudget(){
  const context=[globalThis.AtlasEntry?.current,map.getProjection()?.type,Math.floor(map.getZoom()/3),canvas.clientWidth,canvas.clientHeight,globalThis.devicePixelRatio].join('/');
  if(context!==budgetContext||performance.now()-budgetLearnedAt>60000){budgetContext=context;budgetLearnedAt=performance.now();budget.reset();}
 }
 function applyRatio(){
  const ratio=reduced?budget.ratio():targetRatio(globalThis.devicePixelRatio,preferences.quality,false);
  const boundedRatio=globalThis.AtlasEntry?.lowMemory?Math.min(ratio,2):ratio;
  if(Math.abs(map.getPixelRatio()-boundedRatio)>.001){settingRatio=true;try{if(!resizeDuringMotion(map,boundedRatio)){if(map.isMoving())return;map.setPixelRatio(boundedRatio);}}finally{settingRatio=false;}}
 }
 function stopSampling(){if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=undefined;}
 function sample(now){
  frame=0;if(!moving||document.hidden)return;
  if(reduced&&budget.sample(now)!==null)applyRatio();
  if(lastFrame!==undefined){const gap=now-lastFrame;pushSample(intervals,gap,intervalCount++);intervalTotal+=gap;maxFrameGapMs=Math.max(maxFrameGapMs,gap);}
  lastFrame=now;
  if(preferences.diagnostics&&now-lastPaint>500){paint(now);lastPaint=now;}
  frame=requestAnimationFrame(sample);
 }
 const sceneStats=()=>globalThis.AtlasMapScene?.getMapScene(map)?.cullingStats()||null;
 function gestureStats(now){return {longAnimationFrames:longFrames,inputTiming:tracing?trace.snapshot():null,...summarize(intervals,now-start,draws),callbackFps:intervalTotal>0?Math.round(intervalCount*100000/intervalTotal)/100:0,durationMs:Math.round(now-start),pixelRatioMin:Number.isFinite(ratioMin)?ratioMin:null,pixelRatioMax:ratioMax||null,canvasAtStart:gestureCanvas,renderGapP95:summarize(drawIntervals,0,0).p95,contextLayersCulledMax:cullMaximum,maxFrameGapMs:Math.round(maxFrameGapMs*10)/10,maxRenderGapMs:Math.round(maxRenderGapMs*10)/10,totalFrameSamples:intervalCount,sampleLimit,longTasks,longTaskMs:Math.round(longTaskMs),maxLongTaskMs:Math.round(maxLongTaskMs),country:movementCountry,projection:map.getProjection()?.type,zoom:map.getZoom(),atSeconds:Math.round((now-sessionStarted)/1000)};}
 const currentStats=now=>moving?gestureStats(now):last;
 function graphicsInfo(){
  const gl=map.painter?.context?.gl;if(!gl||gl.isContextLost())return null;
  const debug=gl.getExtension('WEBGL_debug_renderer_info');
  return {vendor:gl.getParameter(debug?.UNMASKED_VENDOR_WEBGL??gl.VENDOR),renderer:gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL??gl.RENDERER),version:gl.getParameter(gl.VERSION),contextAttributes:gl.getContextAttributes()};
 }
 function snapshot(){
  const canvas=map.getCanvas(),container=map.getContainer(),style=map.getStyle();
  return {country:globalThis.AtlasEntry?.current,projection:map.getProjection()?.type,quality:preferences.quality,
   antialiasRequested:bootAntialias,antialiasActual:map.painter?.context?.gl?.getContextAttributes()?.antialias??null,
   devicePixelRatio:globalThis.devicePixelRatio,pixelRatio:map.getPixelRatio(),canvas:[canvas.width,canvas.height],viewport:[container.clientWidth,container.clientHeight],graphics:graphicsInfo(),
   moving,labelsSuppressed,frameBudget:budget.snapshot(),globeRenderer:globalThis.AtlasGlobeRendererController?.snapshot()||null,contextCulling:sceneStats(),markers:container.querySelectorAll('.maplibregl-marker').length,
   sources:Object.keys(style?.sources||{}).length,visibleLayers:style?.layers?.filter(l=>l.layout?.visibility!=='none').length,
   session:{ageSeconds:Math.round((performance.now()-sessionStarted)/1000),visibility:document.visibilityState,contextLosses,longTaskObservation:!!observer,longAnimationFrameObservation:!!frameObserver},resources:resources(),gestureHistory:history.snapshot(),lastGesture:currentStats(performance.now()),userAgent:navigator.userAgent};
 }
 function paint(now=performance.now()){
  if(!output)return;
  const stats=currentStats(now),prefix=moving?'Moving':'Last pan';
  output.textContent=stats?.samples?`${prefix}: ${stats.drawFps} map draws/s · ${stats.renderGapP95} ms draw-gap p95`:'Pan the map to measure';
  panel.querySelector('[data-perf-detail]').textContent=`${map.getProjection()?.type||'flat'} · ${map.getPixelRatio().toFixed(2)}× · ${labelsSuppressed?'labels off':'labels on'}`;
  if(report&&!report.hidden)report.value=JSON.stringify(snapshot(),null,2);
 }
 function ensurePanel(){
  if(panel)return;
  panel=document.createElement('aside');panel.id='map-performance';panel.setAttribute('aria-label','Map performance');
  panel.innerHTML='<output></output><span data-perf-detail></span><div><button type="button" data-perf-labels aria-pressed="false">Test without labels</button><button type="button" data-perf-report aria-expanded="false">Report</button><button type="button" data-perf-close aria-label="Hide performance readout">×</button></div><textarea readonly hidden aria-label="Performance report" spellcheck="false"></textarea>';
  map.getContainer().parentElement.append(panel);output=panel.querySelector('output');report=panel.querySelector('textarea');
  panel.querySelector('[data-perf-close]').onclick=()=>setPreferences({diagnostics:false});
  panel.querySelector('[data-perf-labels]').onclick=event=>{
   labelsSuppressed=!labelsSuppressed;event.target.setAttribute('aria-pressed',String(labelsSuppressed));event.target.textContent=labelsSuppressed?'Restore labels':'Test without labels';
   refreshLabels();paint();
  };
  panel.querySelector('[data-perf-report]').onclick=event=>{report.hidden=!report.hidden;event.target.setAttribute('aria-expanded',String(!report.hidden));paint();if(!report.hidden){report.focus();report.select();}};
 }
 function sync(){
  budget.configure({quality:preferences.quality,deviceRatio:globalThis.devicePixelRatio||1,displayFps});
  if(reduced)applyRatio();
  if(!map.isMoving()&&!inputActive)applyRatio();
  if(preferences.diagnostics){ensurePanel();panel.hidden=false;paint();if(moving&&!frame)frame=requestAnimationFrame(sample);}
  else{if(panel)panel.hidden=true;if(!moving)stopSampling();if(labelsSuppressed){labelsSuppressed=false;const button=panel.querySelector('[data-perf-labels]');button.textContent='Test without labels';button.setAttribute('aria-pressed','false');refreshLabels();}}
  const reload=document.getElementById('rendering-reload');if(reload)reload.hidden=preferences.antialias===bootAntialias;
  const quality=document.getElementById('settings-rendering-quality');if(quality)quality.value=preferences.quality;
  for(const [id,field]of [['settings-rendering-antialias','antialias'],['settings-rendering-diagnostics','diagnostics']]){const el=document.getElementById(id);if(el)el.checked=preferences[field];}
 }
 function begin(){
  if(settingRatio||document.hidden)return;
  clearTimeout(restoreTimer);restoreTimer=undefined;
  if(moving)return;prepareBudget();cancelProbe();budget.start(performance.now());moving=true;last=null;start=performance.now();draws=0;intervals=[];lastFrame=undefined;
  intervalCount=intervalTotal=drawIntervalCount=maxFrameGapMs=maxRenderGapMs=longTasks=longTaskMs=maxLongTaskMs=0;ratioMin=Infinity;ratioMax=0;movementCountry=globalThis.AtlasEntry?.current;observer?.takeRecords();drawIntervals=[];lastDraw=undefined;cullMaximum=0;gestureCanvas=[map.getCanvas().width,map.getCanvas().height];trace.reset();longFrames=[];frameObserver?.takeRecords();tracing=preferences.diagnostics;
  if(tracing)traceCanvas.addEventListener('pointerrawupdate',traceInput,{capture:true,passive:true});
  if(!document.hidden&&!frame)frame=requestAnimationFrame(sample);
 }
 function end({interrupted=false}={}){
  if(settingRatio)return;
  if(!moving)return;
  if(observer)recordLongTasks(observer.takeRecords());if(frameObserver)recordLongFrames(frameObserver.takeRecords());last={...gestureStats(performance.now()),interrupted};
  if(!interrupted&&(last.maxFrameGapMs>=100||last.maxRenderGapMs>=100||last.durationMs>=500&&last.drawFps<20))last.resources=resources();
  history.record(last);
  traceCanvas.removeEventListener('pointerrawupdate',traceInput,true);
  moving=false;budget.stop();stopSampling();paint();if(!interrupted)restoreSoon();
 }
 function restoreSoon(){
  // Avoid repeated canvas reallocations when a second gesture starts immediately.
  clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>{restoreTimer=undefined;if(!map.isMoving()&&!inputActive){reduced=false;applyRatio();paint();scheduleProbe();}},180);
 }
 // Begin at the learned moving ratio before native input. Later adjustments use
 // the pinned internal resize so the current touch or trackpad gesture continues.
 function prepareInput(event){
  if(event.type==='keydown'&&!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','-','='].includes(event.key))return;
  if(event.type==='mousedown'&&event.button!==0)return;
  prepareBudget();clearTimeout(restoreTimer);cancelProbe();if(['mousedown','touchstart'].includes(event.type))inputActive=true;
  reduced=true;applyRatio();if(!inputActive)restoreSoon();
 }
 function releaseInput(event){if(event.type==='touchend'&&event.touches.length)return;inputActive=false;restoreSoon();}
 const inputTypes=['mousedown','touchstart','wheel','keydown'],releaseTypes=['mouseup','touchend','touchcancel','pointercancel'];
 for(const type of inputTypes)canvas.addEventListener(type,prepareInput,{capture:true,passive:true});
 for(const type of releaseTypes)globalThis.addEventListener(type,releaseInput,{capture:true,passive:true});
 const render=()=>{if(moving&&!document.hidden){const now=performance.now(),ratio=map.getPixelRatio();draws++;if(tracing)trace.render(now,cameraPosition());ratioMin=Math.min(ratioMin,ratio);ratioMax=Math.max(ratioMax,ratio);if(lastDraw!==undefined){const gap=now-lastDraw;pushSample(drawIntervals,gap,drawIntervalCount++);maxRenderGapMs=Math.max(maxRenderGapMs,gap);}lastDraw=now;if(preferences.diagnostics)cullMaximum=Math.max(cullMaximum,sceneStats()?.culledLayers||0);}};
 function resize(){const ratio=globalThis.devicePixelRatio||1;if(ratio!==observedRatio){observedRatio=ratio;budget.configure({deviceRatio:ratio});if(!map.isMoving())applyRatio();}}
 function visibility(){if(document.hidden){cancelProbe();end({interrupted:true});stopSampling();clearTimeout(restoreTimer);inputActive=false;reduced=false;applyRatio();}else if(map.isMoving()){begin();}else{inputActive=false;reduced=false;applyRatio();scheduleProbe();}}
 const contextLost=()=>{contextLosses++;end({interrupted:true});};
 map.on('webglcontextlost',contextLost);map.on('movestart',begin);map.on('moveend',end);map.on('render',render);
 const overviewSharpness=()=>{if(reduced&&globalThis.AtlasGlobeOverviewController?.snapshot().ready&&map.getZoom()<6)applyRatio();};map.on('zoom',overviewSharpness);
 globalThis.addEventListener('atlas-rendering-change',sync);globalThis.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);
 function mountSettings(){
  const content=document.querySelector('#atlas-settings .settings-content');if(!content||document.getElementById('settings-rendering-quality'))return;
  const section=document.createElement('fieldset');section.innerHTML=`<legend>Rendering on this device</legend>
   <label class="settings-field" for="settings-rendering-quality">Rendering quality<select id="settings-rendering-quality"><option value="balanced">Balanced (default)</option><option value="performance">Performance</option><option value="full">Full resolution</option></select><small>Balanced adapts for smooth panning. Performance allows a lower moving resolution for more speed. Full sharpness returns after you stop.</small></label>
   <label class="settings-row" for="settings-rendering-antialias"><span><strong>Edge smoothing</strong><small>Turn off to compare graphics performance</small></span><input id="settings-rendering-antialias" type="checkbox" role="switch"></label>
   <button id="rendering-reload" type="button" hidden>Apply edge smoothing &amp; reload</button>
   <a href="frame-rate.html" target="_blank" rel="noopener" class="settings-field">Check browser display timing ↗</a>
   <label class="settings-row" for="settings-rendering-diagnostics"><span><strong>Performance readout</strong><small>Measure panning and compare with labels off</small></span><input id="settings-rendering-diagnostics" type="checkbox" role="switch"></label>`;
  content.append(section);
  document.getElementById('settings-rendering-quality').onchange=event=>setPreferences({quality:event.target.value});
  document.getElementById('settings-rendering-antialias').onchange=event=>setPreferences({antialias:event.target.checked});
  document.getElementById('settings-rendering-diagnostics').onchange=event=>setPreferences({diagnostics:event.target.checked});
  document.getElementById('rendering-reload').onclick=()=>location.reload();
  document.getElementById('settings-reset').addEventListener('click',()=>setPreferences(defaults));sync();
 }
 function cancelProbe(){probeEpoch++;clearTimeout(probeTimer);probeTimer=undefined;if(probeFrame)cancelAnimationFrame(probeFrame);probeFrame=0;}
 function scheduleProbe(){
  cancelProbe();const epoch=probeEpoch;
  probeTimer=setTimeout(()=>{
   probeTimer=undefined;if(document.hidden||moving||inputActive||map.isMoving())return;
   let previous,intervals=[];
   const tick=now=>{
    probeFrame=0;if(epoch!==probeEpoch||document.hidden||moving||inputActive||map.isMoving())return;
    if(previous!==undefined)intervals.push(now-previous);previous=now;
    if(intervals.length<40){probeFrame=requestAnimationFrame(tick);return;}
    const cadence=summarizeCadence(intervals.slice(5));displayFps=cadence.medianMs>0?1000/cadence.medianMs:60;
    budget.configure({displayFps});
   };probeFrame=requestAnimationFrame(tick);
  },350);
 }
 const resetBudget=()=>{budget.reset();if(reduced)applyRatio();scheduleProbe();};
 map.on('idle',scheduleProbe);map.on('webglcontextrestored',resetBudget);map.on('projectiontransition',resetBudget);
 sync();scheduleProbe();
 return {mountSettings,snapshot,prepareInput,get labelsSuppressed(){return labelsSuppressed;},destroy(){frameObserver?.disconnect();if(timedRender&&map._render===timedRender)map._render=nativeRender;for(const type of traceTypes)traceCanvas.removeEventListener(type,traceInput,true);traceCanvas.removeEventListener('pointerrawupdate',traceInput,true);map.off('move',traceCamera);observer?.disconnect();map.off('webglcontextlost',contextLost);cancelProbe();budget.stop();map.off('idle',scheduleProbe);map.off('webglcontextrestored',resetBudget);map.off('projectiontransition',resetBudget);clearTimeout(restoreTimer);stopSampling();map.off('zoom',overviewSharpness);map.off('movestart',begin);map.off('moveend',end);map.off('render',render);for(const type of inputTypes)canvas.removeEventListener(type,prepareInput,true);for(const type of releaseTypes)globalThis.removeEventListener(type,releaseInput,true);globalThis.removeEventListener('atlas-rendering-change',sync);globalThis.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);panel?.remove();moving=false;reduced=false;applyRatio();}};
}

export function summarizeCadence(intervals){
 const values=intervals.filter(v=>Number.isFinite(v)&&v>0),sorted=values.slice().sort((a,b)=>a-b),n=sorted.length,total=values.reduce((a,b)=>a+b,0),round=v=>Math.round(v*100)/100;
 const percentile=p=>n?round(sorted[Math.min(n-1,Math.ceil(n*p)-1)]):null;
 return {callbackFps:total>0?round(n*1000/total):0,medianMs:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),longestMs:percentile(1),samples:n,durationMs:round(total)};
}
export function measureCadence({duration=4000,warmup=750,animate=()=>{},signal,requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame}={}){
 return new Promise((resolve,reject)=>{
  let frame,origin,last,sampling,finished=false;const intervals=[];
  const finish=(error)=>{if(finished)return;finished=true;if(frame)cancelFrame(frame);signal?.removeEventListener('abort',abort);error?reject(error):resolve(summarizeCadence(intervals));};
  const abort=()=>finish(new DOMException('Timing check interrupted','AbortError'));
  if(signal?.aborted){abort();return;}
  signal?.addEventListener('abort',abort,{once:true});
  const tick=now=>{
   if(finished)return;origin??=now;animate(now-origin);
   if(now-origin>=warmup){sampling??=now;if(last!==undefined)intervals.push(now-last);last=now;if(now-sampling>=duration){finish();return;}}
   frame=requestFrame(tick);
  };frame=requestFrame(tick);
 });
}

// Keep a small in-memory history so recovery does not erase an intermittent stall.
// No timers, persistent storage or network reporting are involved.
export function createGestureHistory({recentLimit=12,slowLimit=4}={}){
 const recent=[],slow=[];let total=0;
 return {record(value){
  if(value.interrupted||!value.samples)return;
  const entry=structuredClone({...value,sequence:++total});recent.push(entry);if(recent.length>recentLimit)recent.shift();
  if(value.maxFrameGapMs>=100||value.maxRenderGapMs>=100||value.durationMs>=500&&value.drawFps<20){slow.push(entry);if(slow.length>slowLimit)slow.shift();}
 },snapshot:()=>structuredClone({total,recent,slow})};
}

// Separate event delivery and camera changes from render submissions. A fast
// independent RAF clock cannot show whether new camera positions reach the map.
export function createMotionTrace({limit=600}={}){
 let inputs,cameraGaps,renderGaps,renderCpu,cameras,renders,changedRenders,lastCamera,lastRender,previousCamera,previousRendered;
 const same=(a,b)=>a&&b&&a.every((v,i)=>v===b[i]);
 const push=(values,value)=>{if(values.length===limit)values.shift();values.push(value);};
 function reset(){inputs={};cameraGaps=[];renderGaps=[];renderCpu=[];cameras=renders=changedRenders=0;lastCamera=lastRender=previousCamera=previousRendered=undefined;}
 reset();
 return {reset,input(type,time,coalesced=1,sampleTimes=[]){
  const entry=inputs[type]??={count:0,coalesced:0,gaps:[],sampleGaps:[],delays:[],last:undefined,lastSample:undefined};
  if(entry.last!==undefined)push(entry.gaps,time-entry.last);entry.last=time;entry.count++;entry.coalesced+=coalesced;
  for(const stamp of sampleTimes){
   if(!Number.isFinite(stamp)||stamp<0||stamp>time||time-stamp>60000)continue;
   if(entry.lastSample!==undefined&&stamp>entry.lastSample)push(entry.sampleGaps,stamp-entry.lastSample);
   if(entry.lastSample===undefined||stamp>entry.lastSample){entry.lastSample=stamp;push(entry.delays,time-stamp);}
  }
 },camera(time,position){
  if(same(position,previousCamera))return;previousCamera=position;
  if(lastCamera!==undefined)push(cameraGaps,time-lastCamera);lastCamera=time;cameras++;
 },render(time,position){
  if(lastRender!==undefined)push(renderGaps,time-lastRender);lastRender=time;renders++;
  if(!same(position,previousRendered)){changedRenders++;previousRendered=position;}
 },cpu(duration){push(renderCpu,duration);},snapshot:()=>{const cpu=summarizeCadence(renderCpu);return {inputs:Object.fromEntries(Object.entries(inputs).map(([type,value])=>{const delay=summarizeCadence(value.delays);return [type,{events:value.count,coalescedEvents:value.coalesced,gaps:summarizeCadence(value.gaps),sampleGaps:summarizeCadence(value.sampleGaps),deliveryDelayMs:{median:delay.medianMs,p95:delay.p95Ms,max:delay.longestMs}}];})),cameraChanges:cameras,cameraGaps:summarizeCadence(cameraGaps),renderSubmissions:renders,renderedCameraPositions:changedRenders,renderGaps:summarizeCadence(renderGaps),rendererCpuMs:{samples:cpu.samples,mean:cpu.samples?cpu.durationMs/cpu.samples:0,median:cpu.medianMs,p95:cpu.p95Ms,max:cpu.longestMs}};}};
}

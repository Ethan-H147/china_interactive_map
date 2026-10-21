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

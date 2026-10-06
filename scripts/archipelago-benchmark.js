// Local-only measurement controls. Read the report through the page UI.
const measure=document.createElement('button'),report=document.createElement('pre');
measure.id='archipelago-measure';measure.textContent='Measure island atlas';measure.style.cssText='position:fixed;bottom:12px;left:12px;z-index:9999;padding:10px;background:white;border:1px solid #555';
report.id='archipelago-report';report.style.cssText='position:fixed;bottom:55px;left:12px;z-index:9999;background:white;max-height:70vh;overflow:auto;padding:12px;font-size:11px;white-space:pre-wrap';document.body.append(measure,report);
measure.onclick=async()=>{
 if(!allReady||atlasStarting||countrySwitching)return;measure.disabled=true;report.textContent='Measuring…';
 const samples=[],tasks=[],switches=[],selections=[],resident=[];let start=0,previous=0,tracking=true;
 const movement=()=>{start=performance.now();},end=()=>{start=0;};map.on('movestart',movement);map.on('moveend',end);
 const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>Math.round(e.duration))));observer.observe({type:'longtask'});
 const frame=t=>{if(!tracking)return;if(previous&&start)samples.push(t-previous);previous=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);
 for(const [country,prefix,queries] of [['philippines','ph',['Cebu','Palawan','Luzon']],['indonesia','id',['Yogyakarta','Bali','New Guinea']]]){
  const t=performance.now();await changeAtlas(country);switches.push({country,ms:Math.round(performance.now()-t)});
  for(const query of queries){const input=document.getElementById(prefix+'-search');input.value=query;input.dispatchEvent(new Event('input'));const button=document.getElementById(prefix+'-search-results').querySelector('button');const t=performance.now();await button.onclick();selections.push({query,ms:Math.round(performance.now()-t)});await new Promise(r=>setTimeout(r,500));resident.push(Object.keys(map.getStyle().sources).filter(id=>/^(philippines|indonesia)-/.test(id)));}
 }
 const switching=performance.now();const a=changeAtlas('philippines'),b=changeAtlas('indonesia');await Promise.all([a,b]);await new Promise(r=>setTimeout(r,500));
 tracking=false;observer.disconnect();map.off('movestart',movement);map.off('moveend',end);samples.sort((a,b)=>a-b);
 report.textContent=JSON.stringify({switches,selections,motionFrames:samples.length,motionP95ms:Math.round(samples[Math.floor(samples.length*.95)]||0),motionWorstMs:Math.round(samples.at(-1)||0),framesOver50ms:samples.filter(x=>x>50).length,longTasksMs:tasks,residentSources:resident,rapidSwitch:{country:atlasMode,ms:Math.round(performance.now()-switching)}},null,2);measure.disabled=false;
};

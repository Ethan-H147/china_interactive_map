// Long-session leak probe: repeats the same cycle of country switches, map views,
// selections, panning and a quiz start/end, then records retained work after each
// round (after a forced GC). Bounded counts across rounds mean nothing accumulates.
// Usage: node scripts/browser/measure-long-session.mjs [rounds=4] [label] [--distinct]
// --distinct visits a different set of countries each round, with hover moves, to expose
// per-country state that a repeated cycle would only create once.
import fs from 'node:fs';import {spawn} from 'node:child_process';import {launch,startServer,sleep} from './harness.mjs';
const args=process.argv.slice(2).filter(a=>a!=='--distinct'),distinct=process.argv.includes('--distinct'),rounds=+args[0]||4,label=args[1]||'latest';
// Counts live listeners, timers, observers, workers and object URLs created by page code.
const probe=`(()=>{const live=window.__leakProbe={listeners:new Map(),intervals:new Set(),timeouts:0,frames:0,urls:new Set(),workers:new Set(),observers:0};
 const key=(t,type,fn,o)=>{const capture=typeof o==='boolean'?o:!!o?.capture;return type+'|'+capture;};
 const kind=t=>t===window?'window':t===document?'document':t instanceof Node?'node':t?.constructor?.name||'other';
 const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
 const owned=new WeakMap();
 EventTarget.prototype.addEventListener=function(type,fn,o){if(fn&&(this===document||!(this instanceof Node))){let m=owned.get(this);if(!m)owned.set(this,m=new Map());const k=key(this,type,fn,o);let s=m.get(k);if(!s)m.set(k,s=new Set());if(!s.has(fn)){s.add(fn);const n=kind(this);live.listeners.set(n,(live.listeners.get(n)||0)+1);if(typeof o==='object'&&o?.once){}}}return add.call(this,type,fn,o);};
 EventTarget.prototype.removeEventListener=function(type,fn,o){const s=owned.get(this)?.get(key(this,type,fn,o));if(s?.delete(fn)){const n=kind(this);live.listeners.set(n,live.listeners.get(n)-1);}return remove.call(this,type,fn,o);};
 const si=setInterval,ci=clearInterval;window.setInterval=function(...a){const id=si.apply(this,a);live.intervals.add(id);return id;};window.clearInterval=function(id){live.intervals.delete(id);return ci.call(this,id);};
 const st=setTimeout;window.setTimeout=function(...a){live.timeouts++;return st.apply(this,a);};
 const raf=requestAnimationFrame;window.requestAnimationFrame=function(fn){live.frames++;return raf.call(this,fn);};
 const cu=URL.createObjectURL,ru=URL.revokeObjectURL;URL.createObjectURL=function(o){const u=cu.call(URL,o);live.urls.add(u);return u;};URL.revokeObjectURL=function(u){live.urls.delete(u);return ru.call(URL,u);};
 const W=window.Worker;window.Worker=class extends W{constructor(...a){super(...a);live.workers.add(this);}terminate(){live.workers.delete(this);return super.terminate();}};
 for(const name of ['ResizeObserver','MutationObserver','IntersectionObserver']){const O=window[name];if(O)window[name]=class extends O{constructor(...a){super(...a);live.observers++;}};}
})()`;
const snapshot=`(()=>{const p=window.__leakProbe,style=map.getStyle(),evented=o=>Object.values(o?._listeners||{}).reduce((n,a)=>n+a.length,0)+Object.values(o?._oneTimeListeners||{}).reduce((n,a)=>n+a.length,0);
 let featureStates=0;for(const cache of Object.values(map.style?.tileManagers||map.style?.sourceCaches||{})){const s=cache._state?.state||{};for(const layer of Object.values(s))featureStates+=Object.keys(layer).length;}
 return {listeners:Object.fromEntries(p.listeners),intervals:p.intervals.size,objectUrls:p.urls.size,workers:p.workers.size,observers:p.observers,
  mapListeners:evented(map),styleListeners:evented(map.style),layers:style.layers.length,sources:Object.keys(style.sources).length,images:map.listImages().length,featureStates,
  markers:document.querySelectorAll('.maplibregl-marker').length,domElements:document.getElementsByTagName('*').length,census:(()=>{const c={};for(const e of document.body.getElementsByTagName('*')){const owner=e.parentElement?.closest('[id]')?.id||'body',k=owner+' > '+e.tagName.toLowerCase()+(typeof e.className==='string'&&e.className?'.'+e.className.split(' ')[0]:'');c[k]=(c[k]||0)+1;}return c;})()};})()`;
const visits=['united-states','canada','brazil','norway','france','china','japan'];
const distinctVisits=['germany','italy','spain','poland','sweden','greece','turkey','egypt','kenya','nigeria','india','thailand','vietnam','mexico','argentina','chile','peru','colombia','australia','new-zealand','kazakhstan','iran','saudi-arabia','ukraine','romania','portugal','ireland','finland','morocco','algeria'];
const roundVisits=round=>distinct?distinctVisits.slice((round-1)*6,round*6):visits;
const server=await startServer(),p=await launch({width:1280,height:900}),rows=[],samples=[];let monitor,buffer='';
if(process.platform==='win32'){monitor=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/browser/sample-browser-memory.ps1','-BrowserProcessId',String(p.pid)],{windowsHide:true,stdio:['ignore','pipe','ignore']});monitor.stdout.on('data',data=>{buffer+=data;let at;while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at);buffer=buffer.slice(at+1);try{samples.push(JSON.parse(line));}catch{}}});}
const quantile=(a,q)=>a.length?[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*q))]:null;
async function idle(){await p.evaluate('window.__leakProbe.frames=0;window.__leakProbe.timeouts=0');await sleep(2000);return p.evaluate('({framesPerSecond:__leakProbe.frames/2,timeoutsPerSecond:__leakProbe.timeouts/2})');}
async function panFrames(){await p.evaluate('(()=>{window.__panFrames=[];let last=performance.now(),stop=last+2200;(function tick(now){__panFrames.push(now-last);last=now;if(now<stop)requestAnimationFrame(tick)})(last)})()');
 for(let i=0;i<4;i++)await p.drag('#map',{dx:i%2?-160:160,dy:i%2?-60:60},{duration:350});const f=await p.evaluate('__panFrames.slice(1)');return {panFrameP95Ms:quantile(f,.95),panFrameMaxMs:Math.max(0,...f)};}
async function go(country){if(!await p.evaluate('changeAtlas('+JSON.stringify(country)+',true)'))throw Error('Switch failed '+country+' '+JSON.stringify(await p.evaluate('({quiz:quiz.active,switching:countrySwitching,current:AtlasEntry.current,atlasMode})')));await p.waitFor('!countrySwitching&&AtlasEntry.current==='+JSON.stringify(country),{timeout:90000});await p.settle();}
const settleSidebar=()=>p.waitFor('!cameraBusy&&map.loaded()&&!map.isMoving()&&![...document.querySelectorAll("aside.sidebar:not([hidden])")].some(e=>e.getAttribute("aria-busy")==="true")',{timeout:60000});
async function hover(){for(let i=0;i<30;i++){await p.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:200+(i*29)%880,y:180+(i*47)%560});await sleep(30);}}
async function cycle(round){
 for(const country of roundVisits(round)){await go(country);
  if(country==='china')await p.evaluate('selectRegion(regionByCode.get(510100),510000,false)');else{await p.evaluate('currentAtlas().random()');await settleSidebar();await p.evaluate('currentAtlas().setMode?.(2)');await p.settle();await p.evaluate('currentAtlas().random()');}
  await settleSidebar();await hover();await p.drag('#map',{dx:120,dy:50},{duration:300});await p.evaluate('void map.zoomTo(map.getZoom()+.8,{duration:300})');await p.settle();
  // Map views, where offered: every option, then back to the first.
  const views=await p.evaluate('(()=>{const s=document.getElementById("map-view");return s&&!s.hidden?[...s.options].map(o=>o.value):[]})()');
  for(const v of [...views.slice(1),views[0]].filter(v=>v!==undefined)){await p.evaluate('(()=>{const s=document.getElementById("map-view");s.value='+JSON.stringify(v)+';s.dispatchEvent(new Event("change",{bubbles:true}))})()');await p.waitFor('document.getElementById("map-view").getAttribute("aria-busy")!=="true"',{timeout:90000});await p.settle();}
  // A quiz start and end on the US and Canada first-level quizzes.
  const prefix={'united-states':'us',canada:'ca',france:'fr'}[country];
  if(prefix){await p.evaluate('document.getElementById("'+prefix+'-tab-quiz").click()');await sleep(300);await p.evaluate('document.querySelector("#'+prefix+'-quiz-panel [data-q=start]").click()');await p.settle();if(!await p.evaluate('!!currentAtlas().quiz?.active'))throw Error('Quiz did not start '+country);
   await p.evaluate('document.querySelector("#'+prefix+'-quiz-panel [data-q=reveal]")?.click()');await sleep(200);
   await p.evaluate('document.querySelector("#'+prefix+'-quiz-panel [data-q=end]").click()');await p.waitFor('!quiz.active',{timeout:10000,label:'quiz to end '+country});await p.settle();}
 }
}
await p.send('Performance.enable');await p.send('HeapProfiler.enable');await p.send('Page.addScriptToEvaluateOnNewDocument',{source:probe});
try{
 await p.open(server.url,'#united-states');
 for(let round=0;round<=rounds;round++){
  if(round)await cycle(round);else await go('united-states');
  if(round)await go('united-states');
  await p.evaluate('currentAtlas().home()');await p.settle();
  for(let i=0;i<2;i++){await p.send('HeapProfiler.collectGarbage');await sleep(400);}
  const metrics=Object.fromEntries((await p.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const row={round,jsHeapMiB:+(metrics.JSHeapUsedSize/1048576).toFixed(1),nodes:metrics.Nodes,jsEventListeners:metrics.JSEventListeners,documents:metrics.Documents,...await idle(),...await panFrames(),...await p.evaluate(snapshot),privateMiB:samples.length?Math.round(samples.at(-1).privateBytes/1048576):null,residency:(await p.evaluate('AtlasCountryMemory.snapshot()')).countries.map(c=>c.id)};
  rows.push(row);const {census,...summary}=row;console.log(JSON.stringify(summary));
 }
 const growth=Object.entries(rows.at(-1).census).map(([k,n])=>[k,n-(rows[1]?.census[k]||0)]).filter(([,d])=>d).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,20);console.log('DOM growth since round 1:',JSON.stringify(growth));
 if(p.problems.length||p.failures.length)console.warn('Page problems:',[...p.problems,...p.failures].slice(0,10).join('\n'));
}finally{monitor?.kill();await p.close();await server.close();fs.mkdirSync('artifacts/stability',{recursive:true});fs.writeFileSync('artifacts/stability/long-session-'+label+'.json',JSON.stringify({at:new Date().toISOString(),rounds,distinct,visits:distinct?distinctVisits.slice(0,rounds*6):visits,rows},null,2)+'\n');}

import fs from 'node:fs';
import {launch,startServer} from './harness.mjs';
const server=await startServer(),p=await launch({width:1280,height:900});
try{
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.caPerf={workers:[],events:[],frames:[]};const NativeWorker=Worker;window.Worker=class extends NativeWorker{constructor(url,options){super(url,options);if(String(url).includes('country-boundary-worker')){const row={start:performance.now()};caPerf.workers.push(row);const post=this.postMessage.bind(this);this.postMessage=(data,...rest)=>{row.request=data;row.start=performance.now();return post(data,...rest)};this.addEventListener('message',()=>row.end=performance.now())}}};`});
 await p.open(server.url,'#canada');
 await p.evaluate(`map.on('movestart',()=>caPerf.events.push({type:'move',time:performance.now()}));map.on('sourcedata',e=>{if(e.sourceId?.startsWith('canada-')&&map.isSourceLoaded(e.sourceId))caPerf.events.push({type:'source',id:e.sourceId,time:performance.now()})});let last=performance.now();function frame(now){caPerf.frames.push({time:now,gap:now-last});last=now;requestAnimationFrame(frame)}requestAnimationFrame(frame);`);
 const rows=[];
 for(const [query,id]of [['Nunavut','CA-NU'],['Northwest Territories','CA-NT'],['Nunavut','CA-NU']]){
  await p.evaluate(`(()=>{const s=document.getElementById('ca-search');s.value=${JSON.stringify(query)};s.dispatchEvent(new Event('input'));})()`);
  await p.evaluate(`(()=>{caPerf.events=[];caPerf.workers=[];caPerf.frames=[];caPerf.start=performance.now();const b=[...document.querySelectorAll('#ca-search-results button')].find(b=>b.querySelector('strong')?.textContent===${JSON.stringify(query)});if(!b)throw Error('Missing territory');b.click();})()`);
  await p.waitFor('currentAtlas().getSelection()==='+JSON.stringify(id)+'&&document.getElementById("canada-sidebar").getAttribute("aria-busy")!=="true"&&!map.isMoving()&&!cameraBusy',{timeout:60000});
  await p.settle();const row=await p.evaluate(`(()=>{const q=caPerf;return {query:${JSON.stringify(query)},total:performance.now()-q.start,move:q.events.find(e=>e.type==='move')?.time-q.start,maxFrameGap:Math.max(...q.frames.map(f=>f.gap)),framesOver50:q.frames.filter(f=>f.gap>50).length,workers:q.workers.map(w=>({request:w.request,ms:w.end-w.start})),events:q.events.filter((e,i,a)=>e.type!=='source'||a.findIndex(v=>v.type==='source'&&v.id===e.id)===i).map(e=>({...e,time:e.time-q.start}))}})()`);rows.push(row);console.log(JSON.stringify(row));
 }
 fs.mkdirSync('artifacts/canada-performance',{recursive:true});fs.writeFileSync('artifacts/canada-performance/'+(process.argv[2]||'baseline')+'.json',JSON.stringify(rows,null,2));
 if(p.problems.length||p.failures.length)throw Error([...p.problems,...p.failures].join('\n'));
}finally{await p.close();await server.close();}

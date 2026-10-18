import fs from 'node:fs';
import {launch,startServer} from './harness.mjs';
import {searchAndSelect} from './countries.test.mjs';
const server=await startServer(),page=await launch({width:1280,height:820});
try{
 await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.usPerf={workers:[],events:[]};const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(url,options){super(url,options);if(String(url).includes('country-boundary-worker')){const row={start:performance.now()};window.usPerf.workers.push(row);const post=this.postMessage.bind(this);this.postMessage=(data,...rest)=>{row.request=data;row.start=performance.now();return post(data,...rest)};this.addEventListener('message',()=>row.end=performance.now());}}};`});
 await page.open(server.url,'#united-states');
 await searchAndSelect(page,'Los Angeles CA','Los Angeles','City');
 await page.waitFor('document.getElementById("united-states-sidebar").getAttribute("aria-busy")!=="true"');await page.settle();
 await page.evaluate('map.on("movestart",()=>window.usPerf.events.push({type:"move",time:performance.now()}));map.on("sourcedata",e=>{if(e.sourceId?.startsWith("united-states-")&&map.isSourceLoaded(e.sourceId))window.usPerf.events.push({type:"source",id:e.sourceId,time:performance.now()})})');
 const rows=[];
 for(const [query,name]of [['Cincinnati Ohio','Cincinnati'],['Los Angeles CA','Los Angeles'],['Cincinnati Ohio','Cincinnati']]){
  await page.evaluate('(()=>{const s=document.getElementById("us-search");s.value='+JSON.stringify(query)+';s.dispatchEvent(new Event("input"))})()');
  await page.evaluate('(()=>{window.usPerf.events=[];window.usPerf.workers=[];window.usPerf.start=performance.now();const b=[...document.querySelectorAll("#us-search-results button")].find(b=>b.querySelector("strong")?.textContent==='+JSON.stringify(name)+'&&b.querySelector("small")?.textContent.startsWith("City"));if(!b)throw Error("City missing");b.click()})()');
  await page.waitFor('document.getElementById("us-name").textContent==='+JSON.stringify(name)+'&&document.getElementById("united-states-sidebar").getAttribute("aria-busy")!=="true"&&!map.isMoving()&&!cameraBusy',{timeout:45000});
  const row=await page.evaluate('(()=>{const p=window.usPerf;return {query:'+JSON.stringify(query)+',total:performance.now()-p.start,move:p.events.find(e=>e.type==="move")?.time-p.start,workers:p.workers.map(w=>({file:w.request,ms:w.end-w.start})),events:p.events.filter((e,i,a)=>e.type!=="source"||a.findIndex(v=>v.type==="source"&&v.id===e.id)===i).map(e=>({...e,time:e.time-p.start}))}})()');rows.push(row);console.log(JSON.stringify(row));await page.settle();
 }
 fs.mkdirSync('artifacts/us-performance',{recursive:true});fs.writeFileSync('artifacts/us-performance/'+(process.argv[2]||'baseline')+'.json',JSON.stringify(rows,null,2));
 if(page.problems.length||page.failures.length)throw Error([...page.problems,...page.failures].join('\n'));
}finally{await page.close();await server.close();}

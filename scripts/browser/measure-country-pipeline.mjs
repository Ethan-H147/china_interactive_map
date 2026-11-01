import fs from 'node:fs';
import {startServer,launch,sleep} from './harness.mjs';
import {fixtureImagery} from './atlas-audit-helpers.mjs';
const label=process.argv[2]||'current',width=Number(process.argv[3])||1280,countries=(process.argv[4]||'brazil,argentina,canada,japan,china').split(','),server=await startServer(),p=await launch({width,height:900,mobile:width===390}),rows=[];
try{
 await fixtureImagery(p);await p.open(server.url,'#japan');
 await p.evaluate('AtlasSettings.setSettings({motion:"full"})');
 await p.evaluate(`window.pipelineMeasure={active:null};
 let previous;function tick(now){const r=pipelineMeasure.active;if(r){if(previous!==undefined)r.frames.push({ms:now-previous,moving:map.isMoving(),phase:window.AtlasRenderPipeline?.snapshot().phase||"legacy"});previous=now;}else previous=undefined;requestAnimationFrame(tick);}requestAnimationFrame(tick);
 const draw=map.painter.renderLayer;map.painter.renderLayer=function(...args){const r=pipelineMeasure.active;if(r&&map.isMoving()&&args[2]?.type==="line")r.lineSubmissionsDuringMotion++;return draw.apply(this,args);};
 map.on("movestart",()=>{const r=pipelineMeasure.active;if(r&&!r.firstMove)r.firstMove=performance.now()-r.start;});
 map.on("moveend",()=>{const r=pipelineMeasure.active;if(r)r.lastMoveEnd=performance.now()-r.start;});
 const observer=new PerformanceObserver(list=>{const r=pipelineMeasure.active;if(r)r.longTasks.push(...list.getEntries().map(e=>({start:e.startTime-r.start,duration:e.duration})));});observer.observe({type:"longtask",buffered:false});
 `);
 for(const country of countries){
  await p.evaluate('pipelineMeasure.active={country:'+JSON.stringify(country)+',start:performance.now(),frames:[],longTasks:[],lineSubmissionsDuringMotion:0}');
  const ok=await p.evaluate('changeAtlas('+JSON.stringify(country)+',true)');await p.settle();
  await p.waitFor('!window.AtlasRenderPipeline||AtlasRenderPipeline.snapshot().phase==="ready"');
  const row=await p.evaluate('(()=>{const r=pipelineMeasure.active;pipelineMeasure.active=null;return {...r,elapsed:performance.now()-r.start,pipeline:window.AtlasRenderPipeline?.snapshot()}})()');
  const summarize=frames=>{const values=frames.map(f=>f.ms).sort((a,b)=>a-b);return{samples:values.length,p95:values[Math.max(0,Math.ceil(values.length*.95)-1)]||0,max:values.at(-1)||0,over33:values.filter(x=>x>33.4).length,over50:values.filter(x=>x>50).length};};
  row.ok=ok;row.cadence={all:summarize(row.frames),motion:summarize(row.frames.filter(f=>f.moving)),settling:summarize(row.frames.filter(f=>!f.moving))};delete row.frames;rows.push(row);console.log(JSON.stringify(row));
 }
 fs.mkdirSync('artifacts/country-pipeline',{recursive:true});fs.writeFileSync('artifacts/country-pipeline/'+label+'-'+width+'.json',JSON.stringify({environment:'Local desktop Chrome headless; RAF cadence and main-thread tasks, not a guarantee for other hardware.',rows},null,2));
 if(p.problems.length||p.failures.length)throw Error([...p.problems,...p.failures].join('\n'));
}finally{await p.close();await server.close();}

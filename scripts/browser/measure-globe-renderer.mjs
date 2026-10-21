import fs from 'node:fs';
import {launch,startServer} from './harness.mjs';
const server=await startServer(),p=await launch({width:1366,height:1024,mobile:true}),rows=[];
try{
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-rendering-v1',JSON.stringify({quality:'performance',diagnostics:true}));localStorage.setItem('boundary-atlas-globe-v1','true');"});
 await p.open(server.url,'#china');if(!await p.evaluate('AtlasGlobeRendererController.snapshot().supported'))throw Error('Globe optimization is not attached');await p.evaluate(`(()=>{window.globeBench={active:false,frames:[]};let frame;
 const gl=map.painter.context.gl;for(const [name,at]of [['drawElements',1],['drawArrays',2],['drawElementsInstanced',1],['drawArraysInstanced',2]]){if(!gl[name])continue;const native=gl[name].bind(gl);gl[name]=(...args)=>{if(frame){frame.calls++;frame.indices+=args[at]*(name.endsWith('Instanced')?args.at(-1):1);}return native(...args);};}
 for(const [target,name,key]of [[map.style,'_updateSources','sourceMs'],[map.painter,'render','painterMs']]){const original=target[name];target[name]=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{if(frame)frame[key]+=performance.now()-start;}};}
 const native=map._render;map._render=function(...args){const selected=globeBench.active&&this.isMoving(),start=performance.now();if(selected)frame={calls:0,indices:0,sourceMs:0,painterMs:0};try{return native.apply(this,args);}finally{if(selected){globeBench.frames.push({...frame,cpuMs:performance.now()-start});frame=null;}}};})()`);
 for(const [country,center,zoom]of [['china',[105,36],3.3],['bolivia',[-64.7,-17],3.3],['sweden',[16.5,63],3.3]]){
  await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();
  for(const mode of ['native','stencil','complete','native','stencil','complete']){const enabled=mode!=='native';
   await p.evaluate('AtlasGlobeRendererController.setEnabled('+enabled+');AtlasGlobeRenderer.setSourceCoverageEnabled(map._camera.transform,'+(mode==='complete')+');void map.jumpTo({center:'+JSON.stringify(center)+',zoom:'+zoom+'})');await p.settle();
   const row=await p.evaluate(`new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Pan did not finish')),15000);map.setPixelRatio(1);globeBench.frames=[];globeBench.active=true;const before=AtlasGlobeRendererController.snapshot();map.once('moveend',()=>{clearTimeout(timeout);try{globeBench.active=false;const frames=globeBench.frames,ordered=frames.map(f=>f.cpuMs).sort((a,b)=>a-b),sum=k=>frames.reduce((s,f)=>s+f[k],0)/frames.length;resolve({frames:frames.length,callsPerFrame:sum('calls'),indicesPerFrame:sum('indices'),cpuMeanMs:sum('cpuMs'),sourceMeanMs:sum('sourceMs'),painterMeanMs:sum('painterMs'),cpuP95Ms:ordered[Math.ceil(ordered.length*.95)-1],canvas:[map.getCanvas().width,map.getCanvas().height],maskBatchesReused:AtlasGlobeRendererController.snapshot().reusedBatches-before.reusedBatches,sourceCoveragesReused:AtlasGlobeRendererController.snapshot().sourceCoverage.reusedCoverages-before.sourceCoverage.reusedCoverages});}catch(error){reject(error);}});map.panBy([170,20],{duration:2400,easing:t=>t});})`);
   rows.push({country,mode,enabled,...row});console.log(JSON.stringify(rows.at(-1)));await p.settle();
  }
 }
 fs.mkdirSync('artifacts/tablet-performance',{recursive:true});fs.writeFileSync('artifacts/tablet-performance/globe-renderer.json',JSON.stringify({environment:'Windows Chrome, CSS1366x1024, moving pixel ratio1. Counts and CPU submission only; not iPad presented FPS.',rows},null,2)+'\n');
 if(p.problems.length||p.failures.length)throw Error([...p.problems,...p.failures].join('\n'));
}finally{await p.close();await server.close();}

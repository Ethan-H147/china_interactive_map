// Windows/Chrome comparison only. Use the readout on the real iPad for Safari results.
import fs from 'node:fs';
import {launch,startServer} from './harness.mjs';
const server=await startServer(),results=[];
try{
 for(const [quality,antialias,labels]of [['full',true,true],['balanced',true,true],['performance',true,true],['balanced',false,true],['balanced',true,false]]){
  const p=await launch({width:1366,height:1024,mobile:true});
  try{
   await p.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('boundary-atlas-rendering-v1',JSON.stringify(${JSON.stringify({quality,antialias,diagnostics:true})}));localStorage.setItem('boundary-atlas-globe-v1','true');`});
   await p.open(server.url,'#bolivia');if(!labels)await p.tap('[data-perf-labels]');
   const pans=[];for(let i=0;i<3;i++){await p.drag('#map',{dx:i%2?-160:160,dy:30},{steps:45,duration:1000});await p.settle();pans.push((await p.evaluate('AtlasPerformanceController.snapshot()')).lastGesture);}
   const row={quality,antialias,labels,pans};results.push(row);console.log(JSON.stringify(row));
   if(p.problems.length||p.failures.length)throw Error([...p.problems,...p.failures].join('\n'));
  }finally{await p.close();}
 }
 fs.mkdirSync('artifacts/tablet-performance',{recursive:true});fs.writeFileSync('artifacts/tablet-performance/chrome-comparison.json',JSON.stringify({environment:'Headless Chrome on Windows; not iPad Safari',results},null,2)+'\n');
}finally{await server.close();}

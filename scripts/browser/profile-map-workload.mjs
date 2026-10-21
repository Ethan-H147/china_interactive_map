// Repeatable desktop workload comparison. Does not predict iPad Safari frame rates.
import fs from 'node:fs';
import {launch,startServer} from './harness.mjs';
const server=await startServer(),p=await launch({width:1024,height:909,mobile:true}),rows=[];
try{
 await p.send('Performance.enable');
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-rendering-v1',JSON.stringify({quality:'performance',diagnostics:true}));localStorage.setItem('boundary-atlas-globe-v1','true');"});
 await p.open(server.url,'#china');await p.settle();
 await p.evaluate('void map.jumpTo({center:[105,36],zoom:3.3});');await p.settle();
 const style=JSON.parse(await p.evaluate('JSON.stringify({layers:map.getStyle().layers.map(l=>mapScene.baseLayer(l)),sources:Object.fromEntries(Object.entries(map.getStyle().sources).map(([k,v])=>[k,{type:v.type,tolerance:v.tolerance}]))})'));
 fs.mkdirSync('artifacts/tablet-performance',{recursive:true});
 fs.writeFileSync('artifacts/tablet-performance/china-style.json',JSON.stringify(style,null,2));
 for(const test of ['unculled','complete','unculled','complete']){
  await p.evaluate(`(()=>{for(const l of ${JSON.stringify(style.layers)})if(map.getLayer(l.id))map.setLayoutProperty(l.id,'visibility',l.layout?.visibility||'visible');
   if(AtlasPerformanceController.labelsSuppressed!==${JSON.stringify(test==='no-labels'||test==='bare')})document.querySelector('[data-perf-labels]').click();
   const test=${JSON.stringify(test)};mapScene.setCulling(test!=='unculled');
   for(const l of map.getStyle().layers){const role=l.metadata?.atlas?.role;
    if(test==='bare'&&l.type!=='background'||test==='no-lines'&&l.type==='line'||test==='no-fragments'&&l.id.includes('fragment')||test==='no-context'&&(role==='context'||role==='land'||l.metadata?.atlasInternationalBorder))map.setLayoutProperty(l.id,'visibility','none');
   }
   map.jumpTo({center:[105,36],zoom:3.3});
  })()`);await p.settle();
  const before=(await p.send('Performance.getMetrics')).metrics;
  await p.drag('#map',{dx:180,dy:25},{steps:90,duration:1800});await p.settle();
  const after=(await p.send('Performance.getMetrics')).metrics;
  const delta=name=>Math.round(1000*(after.find(x=>x.name===name).value-before.find(x=>x.name===name).value));
  const row={test,taskMs:delta('TaskDuration'),scriptMs:delta('ScriptDuration'),layoutMs:delta('LayoutDuration'),stats:await p.evaluate('AtlasPerformanceController.snapshot()')};rows.push(row);console.log(JSON.stringify(row));
 }
 fs.writeFileSync('artifacts/tablet-performance/china-workload.json',JSON.stringify(rows,null,2)+'\n');
 if(p.problems.length||p.failures.length)throw Error([...p.problems,...p.failures].join('\n'));
}finally{await p.close();await server.close();}

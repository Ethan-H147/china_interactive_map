import assert from 'node:assert/strict';
import {swissGermanProbes} from '../swiss-german-probes.mjs';
export default [1280,390].map(width=>({name:'Schaffhausen country fills meet without pale border slivers '+width,options:{width,height:1000,mobile:width===390},async run(p,base){
 const probes=swissGermanProbes();
 for(const country of ['switzerland','germany','finland']){
  await p.open(base,'#'+country);
  for(const center of [[8.57,47.65],[8.68,47.7],[8.48,47.73]])for(const zoom of [11.3,13]){
   await p.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:'+zoom+',padding:{top:0,bottom:0,left:0,right:0}})');await p.settle();
   // Do not force-load Germany: this must work through normal map navigation.
   const result=await p.evaluate('(()=>{let tested=0,missing=[];const layers='+JSON.stringify(country==='switzerland'?['switzerland-first-fill','germany-portal-fill']:country==='germany'?['germany-first-fill','switzerland-portal-fill']:['germany-portal-fill','switzerland-portal-fill'])+';for(const probe of '+JSON.stringify(probes)+')for(const point of probe.sides){const q=map.project(point);if(q.x<15||q.y<75||q.x>map.getContainer().clientWidth-15||q.y>map.getContainer().clientHeight*.45)continue;tested++;if(!map.queryRenderedFeatures(q,{layers}).length)missing.push(point);}return {tested,missing}})()');
   assert(result.tested>0,'Survey stations are visible');assert.deepEqual(result.missing,[],'Both country fills cover the border neighborhood '+JSON.stringify({country,center,zoom}));
   if(center[0]===8.57&&zoom===11.3)await p.screenshot('schaffhausen-aligned-'+country+'-'+width);
  }
 }
}}));

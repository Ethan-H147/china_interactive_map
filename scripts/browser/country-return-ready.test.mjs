import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';

const mayotte=load('dist/data/europe/france/catalogue.bin').records.find(r=>r.en==='Mayotte');
export default [1280,390].map(width=>({name:'Moldova and Comoros return promptly after neighbouring countries '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#moldova');
 await p.evaluate(`window.returnReadyWaits=[];const nativeCountryWait=waitForCountrySources;
 waitForCountrySources=function(ids,signal){const row={country:AtlasEntry.current,start:performance.now()};returnReadyWaits.push(row);return nativeCountryWait(ids,signal).finally(()=>row.ms=performance.now()-row.start);};void 0`);
 async function go(country,{focus=null,returning=false}={}){
  const result=await p.evaluate(`(async()=>{const start=performance.now(),ok=await changeAtlas(${JSON.stringify(country)},true,false,${JSON.stringify(focus)});return {ok,ms:performance.now()-start};})()`);
  assert(result.ok,'Switch to '+country+' succeeds');
  if(returning)assert(result.ms<7000,'A ready returning country must not hit the 15-second fallback: '+country+' '+result.ms+' ms');
  await p.settle();
  assert.equal(await p.evaluate('AtlasEntry.current'),country);
  assert.equal(await p.evaluate('countrySwitching'),false);
  assert.equal(await p.evaluate('cameraBusy'),false);
  assert(await p.evaluate(`map.getLayoutProperty('${country}-first-fill','visibility')!=='none'`),'Administrative fills return');
  assert((await p.evaluate(`map.queryRenderedFeatures({layers:['${country}-first-fill']}).length`))>0,'Returning country has rendered subdivision geometry');
  assert(await p.evaluate('mapScene.assertOrder()'));
  return result.ms;
 }
 const times=[];
 for(let round=0;round<2;round++){await go('ukraine');times.push(['moldova',await go('moldova',{returning:true})]);}
 await go('comoros');
 for(let round=0;round<2;round++){
  await go('france',{focus:{region:mayotte.id,bounds:mayotte.bounds.flat()}});
  assert.equal(await p.evaluate('currentAtlas().getSelection()'),mayotte.id,'Mayotte opens as the selected French region');
  times.push(['comoros',await go('comoros',{returning:true})]);
 }
 const waits=await p.evaluate('returnReadyWaits');
 assert(waits.filter(r=>r.country==='moldova'||r.country==='comoros').every(r=>r.ms<5000),'Readiness must resolve before its fallback timer');
 console.log('Return-country durations '+width+': '+JSON.stringify(times.map(([country,ms])=>({country,ms:Math.round(ms)}))));
 await p.screenshot('country-return-ready-'+width);
}}));

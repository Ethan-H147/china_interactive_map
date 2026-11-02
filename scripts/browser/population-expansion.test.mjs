import assert from 'node:assert/strict';
const cases=[['malta','MT-13','3,523','2021'],['montenegro','ME-M-2187901','30,824','2023'],['mauritius','MU-BL','87,701','2022'],['ghana','GH0101','150,198','2021'],['israel','IL-JM','1,252,900','2022'],['brazil','BR-1200013','14,021','2022'],['malaysia','MY-01-01','513,400','2026'],['indonesia','ID1107','198,736','2020']];
const visible="[...document.querySelectorAll('.archipelago-population')].filter(n=>!n.hidden&&n.getClientRects().length)";
export default [false,true].map(mobile=>({name:'Expanded population cards '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{},async run(p,base){
 for(const [country,id,value,year]of cases){
  await p.open(base,'#'+country);await p.waitFor('atlasMode==='+JSON.stringify(country)+'&&currentAtlas()?.ready&&!countrySwitching&&!cameraBusy');
  await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');
  await p.waitFor(visible+".some(n=>n.innerText.includes("+JSON.stringify(value)+"))");
  assert.equal(await p.evaluate(visible+'.length'),1,country+' single population card');
  assert(await p.evaluate(visible+'[0].innerText.includes('+JSON.stringify(year)+')'),country+' reference year');
  assert(await p.evaluate(visible+"[0].querySelector('a').href.startsWith('https://')"),country+' clickable source');
  if(country==='israel'){
   const selector=await p.evaluate(visible+"[0].closest('[id]').id");await p.tap('#'+selector+' .population-info summary');
   assert(await p.evaluate(visible+"[0].innerText.includes('East Jerusalem')"));await p.key('Escape');
   assert(!await p.evaluate("[...document.querySelectorAll('.region-statistics')].filter(n=>!n.hidden&&n.getClientRects().length).some(n=>n.innerText.includes('Population density'))"));
  }
  if(['brazil','malaysia','indonesia'].includes(country))assert(!await p.evaluate("[...document.querySelectorAll('.region-statistics')].some(n=>!n.hidden&&n.getClientRects().length&&/GDP|Gross domestic/.test(n.innerText))"),country+' no inherited state GDP');
  if(['brazil','malaysia','indonesia'].includes(country)){
   const parent={brazil:'BR-12',malaysia:'MY-01',indonesia:'ID11'}[country];await p.evaluate('currentAtlas().restore('+JSON.stringify(parent)+')');
   await p.waitFor("[...document.querySelectorAll('.region-statistics')].some(n=>!n.hidden&&n.getClientRects().length&&n.innerText.includes('GDP'))");
  }
  if(country==='malaysia'){
   await p.evaluate("currentAtlas().restore('MY-12-16')");await p.waitFor("[...document.querySelectorAll('.archipelago-population')].some(n=>!n.hidden&&n.getClientRects().length&&n.innerText.includes('Population (source district)'))");
   assert(await p.evaluate("[...document.querySelectorAll('.population-info-body')].some(n=>n.textContent.includes('Membakut is reported separately'))"));
  }
  await p.screenshot('population-expansion-'+country+'-'+(mobile?'phone':'desktop'));
 }
}}));

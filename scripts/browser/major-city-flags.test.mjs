import assert from 'node:assert/strict';
import {majorCityFlags} from '../../dist/major-city-flags.mjs';
export default [
 {name:'Brazil municipal flags retain city identity and clear across selections',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#brazil');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await p.waitFor('currentAtlas()?.ready');
  const flags=Object.entries(majorCityFlags.brazil.detailFlags).filter(([id])=>id!=='BR-5300108').sort(([a],[b])=>a.localeCompare(b));
  for(const[id,f]of flags){await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await p.waitFor(`(()=>{const i=document.getElementById('south-municipal-flag');return i.getAttribute('src')===${JSON.stringify(f.file)}&&i.complete&&i.naturalWidth>0&&!i.closest('a').hidden})()`,{label:f.name+' municipal flag'});assert.equal(await p.evaluate("document.getElementById('south-municipal-flag').alt"),'Flag of '+f.name);}
  const f=majorCityFlags.brazil.detailFlags['BR-3550308'];await p.evaluate("currentAtlas().restore('BR-3550308')");await p.waitFor("!document.getElementById('south-municipal-flag-source').hidden");await p.tap('#south-municipal-flag-source');await p.waitFor('document.getElementById("flag-viewer").open&&document.getElementById("flag-viewer-image").getAttribute("src")==='+JSON.stringify(f.full));await p.screenshot('brazil-sao-paulo-municipal-flag');await p.key('Escape');
  await p.evaluate("currentAtlas().restore('BR-5300108')");await p.waitFor("document.getElementById('south-municipal-flag-source').hidden&&!document.getElementById('south-flag-source').hidden");
  await p.evaluate("currentAtlas().restore('BR-35')");assert(await p.evaluate("document.getElementById('south-municipal-flag-source').hidden&&!document.getElementById('south-municipal-flag').hasAttribute('src')"));
  await p.evaluate("currentAtlas().restore(null)");assert(await p.evaluate("document.getElementById('south-municipal-flag-source').hidden"));
 }},
 {name:'Canadian additions coexist with existing city flags',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#canada');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await p.waitFor('currentAtlas()?.ready');
  for(const[id,f]of Object.entries(majorCityFlags.canada.detailFlags)){await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await p.waitFor(`(()=>{const i=document.getElementById('ca-detail-flag');return i&&i.getAttribute('src')===${JSON.stringify(f.file)}&&i.complete&&i.naturalWidth>0&&!i.closest('a').hidden})()`,{label:f.name+' flag'});await p.tap('#ca-detail-flag-source');await p.waitFor('document.getElementById("flag-viewer").open&&document.getElementById("flag-viewer-image").getAttribute("src")==='+JSON.stringify(f.full));await p.screenshot('canada-'+f.name.toLowerCase()+'-flag');await p.key('Escape');}
  await p.evaluate("currentAtlas().restore('CA-CSD-3520005')");await p.waitFor("document.getElementById('ca-detail-flag').getAttribute('src').includes('CA-CSD-3520005')&&!document.getElementById('ca-detail-flag-source').hidden");
 }},
 {name:'Brazil city flags fit the phone viewer',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.open(base,'#brazil');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await p.waitFor('currentAtlas()?.ready');await p.evaluate("currentAtlas().restore('BR-3300456')");await p.waitFor("!document.getElementById('south-municipal-flag-source').hidden");await p.tap('#south-municipal-flag-source');await p.waitFor("document.getElementById('flag-viewer').open");const box=await p.evaluate("(()=>{const r=document.getElementById('flag-viewer-image').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})()");assert(box.width>250&&box.height>100&&box.left>=0&&box.right<=390&&box.top>=0&&box.bottom<=844);await p.screenshot('brazil-belford-roxo-flag-phone');
 }}
];

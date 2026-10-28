import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const cases=[{country:'iran',prefix:'ir',count:31,query:'تهران',name:'Tehran',kind:'Province',pop:'13,267,637'},{country:'iraq',prefix:'iq',count:19,query:'بغداد',name:'Baghdad',kind:'Governorate'}, {country:'saudi-arabia',prefix:'sa',count:13,query:'الرياض',name:'Riyadh',kind:'Administrative region',pop:'8,591,748'}];
export default [1280,390].map(width=>({name:'Iran, Iraq and Saudi Arabia regional maps and statistics without country pages '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 for(const d of cases){
  await p.open(base,'#'+d.country);
  assert.equal(await p.evaluate('document.querySelectorAll("#'+d.prefix+'-province option").length-1'),d.count);
  assert.equal(await p.evaluate('document.getElementById("'+d.prefix+'-tab-country")'),null);
  assert.equal(await p.evaluate('document.getElementById("'+d.prefix+'-layers-panel").hidden'),false);
  await searchAndSelect(p,d.query,d.name,d.kind);
  await p.waitFor('document.querySelector("#'+d.prefix+'-explore-panel .population-total")');
  if(d.pop)assert((await p.evaluate('document.querySelector("#'+d.prefix+'-explore-panel .population-total").textContent')).includes(d.pop));
  await p.waitFor('map.queryRenderedFeatures({layers:["'+d.country+'-first-selected"]}).length>0');
  assert.equal(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);
  await p.screenshot(d.country+'-regions-'+width);
  const saved=await p.evaluate('AtlasView.hashFor(captureView())'),id=await p.evaluate('currentAtlas().getSelection()');
  await p.open(base,saved);assert.equal(await p.evaluate('currentAtlas().getSelection()'),id);
  await p.evaluate('currentAtlas().home()');await p.settle();
  assert.equal(await p.evaluate('document.getElementById("'+d.prefix+'-layers-panel").hidden'),false);
  await p.tap('#'+d.prefix+'-tab-quiz');assert((await p.evaluate('document.querySelector("#'+d.prefix+'-quiz-panel [data-q=count]").textContent')).startsWith(d.count+' '));
 }
 await p.open(base,'#iraq');await searchAndSelect(p,'Halabja','Halabja','Governorate');
 assert(!await p.evaluate('!!document.querySelector("#iq-explore-panel .population-total")'));
 await p.screenshot('halabja-region-'+width);
 assert.equal(await p.evaluate('mapScene.assertOrder()'),true);
}}));

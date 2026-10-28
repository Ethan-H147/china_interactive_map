import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const cases=[{country:'iran',prefix:'ir',query:'IR028015',name:'Tehran',kind:'County',id:'IR028015',mode:2},{country:'iraq',prefix:'iq',query:'IQG08Q01',name:'Al-Adhamiya',kind:'District',id:'IQG08Q01',mode:3},{country:'iraq',prefix:'iq',query:'IQG08Q03N03',name:'Al-Mansour',kind:'Subdistrict',id:'IQG08Q03N03',mode:3},{country:'saudi-arabia',prefix:'sa',query:'الخبر',name:'Al Khubar',kind:'Governorate',id:'SA-GB-3984122B30508649206602',mode:2}];
export default [1280,390].map(width=>({name:'West Asia deeper subdivision selection, scoped loading, area cards and restored views '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 let active;
 for(const d of cases){
  if(active!==d.country){await p.open(base,'#'+d.country);active=d.country;assert(!await p.evaluate('!!map.getSource("'+d.country+'-second")'),'Second level starts scoped');}
  await searchAndSelect(p,d.query,d.name,d.kind);assert.equal(await p.evaluate('currentAtlas().getSelection()'),d.id);assert.equal(await p.evaluate('currentAtlas().getMode()'),d.mode);
  const level=d.kind==='Subdistrict'?3:2;await p.waitFor('map.queryRenderedFeatures({layers:["'+d.country+'-'+(level===3?'third':'second')+'-selected"]}).length>0');
  await p.waitFor('document.querySelector("#'+d.prefix+'-explore-panel .region-statistics")?.textContent.includes("km²")');assert(!await p.evaluate('!!document.querySelector("#'+d.prefix+'-explore-panel .archipelago-population:not([hidden]) .population-total")'),'No inferred child population');
  const size=await p.evaluate('fetch(map.getStyle().sources["'+d.country+'-second"].data).then(r=>r.json()).then(d=>new Set(d.features.map(f=>f.properties.id)).size)');assert(size<50,'Only selected-parent local polygons are loaded');
  if(d.country==='saudi-arabia')assert(await p.evaluate('map.getZoom()>8'),'A local governorate receives a local camera frame');
  const saved=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,saved);assert.equal(await p.evaluate('currentAtlas().getSelection()'),d.id);assert.equal(await p.evaluate('currentAtlas().getMode()'),d.mode);
  assert.equal(await p.evaluate('document.getElementById("'+d.prefix+'-tab-country")'),null);assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
  await p.screenshot(d.country+'-depth-'+level+'-'+width);
 }
 await p.open(base,'#iraq');await searchAndSelect(p,'IQG06Q05-IN-IQ-OSM-3826029','Halabcha (part)','District reference portion');
 assert((await p.evaluate('document.querySelector("#iq-explore-panel .region-statistics").textContent')).includes('2019'));await p.screenshot('halabja-reference-depth-'+width);
 await p.evaluate('currentAtlas().home()');await p.settle();assert.equal(await p.evaluate('currentAtlas().getMode()'),1);assert(!await p.evaluate('!!map.getSource("iraq-third")'));
 assert.equal(await p.evaluate('mapScene.assertOrder()'),true);
}}));

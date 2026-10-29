import assert from 'node:assert/strict';
import {fixtureImagery} from './atlas-audit-helpers.mjs';
import {khorReference} from '../khor-al-adaid.mjs';
const coast=khorReference().qatarCoast[900];
export default [1280,390].map(width=>({name:'Qatar–Saudi inlet has continuous land and no coastal border '+width,options:{width,height:900,mobile:width===390},async run(page,base){
 await fixtureImagery(page);
 for(const country of ['qatar','saudi-arabia']){
  await page.open(base,'#'+country);await page.evaluate('(()=>{const c=document.getElementById("satellite-layer");if(c.checked)c.click();})()');await page.evaluate('void map.jumpTo({center:[51.34,24.63],zoom:10.5})');await page.settle();
  const hits=point=>page.evaluate('(()=>{const p=map.project('+JSON.stringify(point)+'),layers=map.getStyle().layers.filter(l=>l.type==="fill"&&map.getLayoutProperty(l.id,"visibility")!=="none").map(l=>l.id);return map.queryRenderedFeatures(p,{layers}).map(f=>({id:f.id,country:f.properties.country}));})()');
  for(const water of [[51.31,24.55],[51.32,24.61]])assert.equal((await hits(water)).length,0,country+' inlet water has no land fill');
  for(const land of [[51.35,24.65],[51.37,24.59],[51.4,24.62]])assert((await hits(land)).length>0,country+' coast has no angular gap');
  assert.equal(await page.evaluate('(()=>{const p=map.project('+JSON.stringify(coast)+'),layers=map.getStyle().layers.filter(l=>l.type==="line"&&/international|country-border-previews|globe-overview-borders|atlas-frontiers/.test(l.id)).map(l=>l.id);return map.queryRenderedFeatures([[p.x-2,p.y-2],[p.x+2,p.y+2]],{layers}).length})()'),0,'The inlet shore has no country-border stroke');
  await page.screenshot('khor-corrected-'+country+'-'+width);
  await page.evaluate('document.getElementById("satellite-layer").click()');await page.waitFor('satelliteDisplay.state.hasTile');assert(await page.evaluate('mapScene.assertOrder()'));
  for(const water of [[51.31,24.55],[51.32,24.61]])assert.equal((await hits(water)).length,0,'Satellite mode keeps water open');
  await page.screenshot('khor-corrected-satellite-'+country+'-'+width);
 }
}}));

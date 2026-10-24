import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const places=[
 ['germany','Garmisch-Partenkirchen','Garmisch-Partenkirchen','Municipality',3],
 ['belgium','Ixelles','Ixelles','Municipality',3],
 ['netherlands','Utrecht','Utrecht','Municipality',2],
 ['switzerland','Zurich','Zurich','Municipality',3],
 ['united-states','San Diego CA','San Diego','City',3],
 ['canada','Toronto ON','Toronto','City',3],
 ['mexico','Guadalajara','Guadalajara','Municipality',2]
];
export default [
 ...[['germany','Munich','DE_09162000'],['belgium','Brussels','BE_21004'],['netherlands','The Hague','NL_GM0518']].map(([country,query,id])=>({name:country+' finds English municipality names',options:{width:1280,height:820},async run(page,base){await page.open(base,'#'+country);await searchAndSelect(page,query,query,'Municipality');assert.equal(await page.evaluate('currentAtlas().getSelection()'),id);}})),
 {name:'new country headers fit on a phone',options:{width:390,height:844,mobile:true},async run(page,base){
  for(const [country]of places){await page.open(base,'#'+country);assert(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),country+' does not overflow horizontally');}
  await page.screenshot('new-countries-phone');
 }},
 ...places.map(([country,query,pick,kind,level])=>({name:country+' opens publicly and selects its deepest supported division',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#'+country);
  assert.equal(await page.evaluate('AtlasEntry.current'),country);
  assert.equal(await page.evaluate('AtlasDev.enabled'),false);
  assert.equal(await page.evaluate('mapScene.assertOrder()'),true);
  assert(await page.evaluate("map.queryRenderedFeatures({layers:['"+country+"-first-fill']}).length>0"),country+' visible first-level geometry');
  if(['united-states','canada','mexico'].includes(country)){const prefix={"united-states":"us",canada:"ca",mexico:"mx"}[country];assert(await page.evaluate('!document.getElementById('+JSON.stringify(prefix+'-province')+').hidden'),'State/province selector remains available');assert.equal(await page.evaluate('document.getElementById("mode-lock").parentElement.hidden'),!await page.evaluate('!!AtlasCountries.countries['+JSON.stringify(country)+'].map.secondLabel'),'Level switcher follows the declared hierarchy');}
  await searchAndSelect(page,query,pick,kind);await page.waitFor('document.getElementById('+JSON.stringify(country+'-sidebar')+').getAttribute("aria-busy")!=="true"',{timeout:60000});await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getMode()'),level);
  assert(await page.evaluate("map.queryRenderedFeatures({layers:map.getStyle().layers.filter(l=>l.type==='line'&&l.id.startsWith('"+country+"-')&&map.getLayoutProperty(l.id,'visibility')!=='none').map(l=>l.id)}).length>0"),country+' selected subdivision edges render');
  assert(await page.evaluate("[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none').innerText.includes('Population')"),'Population card shows');
  assert(await page.evaluate("[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none').querySelector('.division-flags img').naturalWidth>0"),'National flag loads');
  await page.screenshot('new-'+country);
  const id=await page.evaluate('currentAtlas().getSelection()');
  await page.send('Page.reload');await page.settle();
  await page.waitFor('currentAtlas()?.getSelection()==='+JSON.stringify(id),{label:'selected division restored',timeout:30000});
  assert.equal(await page.evaluate('currentAtlas().getMode()'),level);
 }})),
 {name:'Switzerland can select a municipality directly below a canton',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#switzerland');await searchAndSelect(page,'Geneva','Geneva','Municipality');
  assert.equal(await page.evaluate('currentAtlas().getMode()'),2);
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'CH-M-6621');
 }}
];

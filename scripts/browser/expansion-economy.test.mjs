import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const cases=[
 ['germany','de','Bavaria','State','EUR','2024'],
 ['belgium','be','Flanders','Region','EUR','2024'],
 ['netherlands','nl','North Holland','Province','EUR','2024'],
 ['switzerland','ch','Zurich','Canton','CHF','2022'],
 ['united-states','us','California','State','USD','2025'],
 ['canada','ca','Ontario','Province','CAD','2024'],
 ['mexico','mx','Mexico City','Federal entity','MXN','2023']
];
export default [
 ...cases.map(([country,prefix,query,kind,currency,year])=>({name:country+' shows GDP cards and shades both economic measures',options:{width:1280,height:900},async run(page,base){
  await page.open(base,'#'+country);await searchAndSelect(page,query,query,kind);
  const panel='#'+country+'-sidebar .statistics-economy';
  await page.waitFor('document.querySelector('+JSON.stringify(panel)+')?.textContent.includes("GDP per capita")',{label:'GDP and per capita cards'});
  const text=await page.evaluate('document.querySelector('+JSON.stringify(panel)+').textContent');
  assert(text.includes(currency)&&text.includes(year)&&!text.includes('Not available'));
  assert.equal(await page.evaluate('document.querySelector('+JSON.stringify(panel)+').querySelectorAll("dd").length'),2);
  await page.evaluate('document.querySelector('+JSON.stringify(panel)+').scrollIntoView({block:"center"})');
  await page.screenshot('economy-'+country);
  await page.tap('#'+prefix+'-tab-layers');
  assert.deepEqual(await page.evaluate('[...document.querySelectorAll("#'+prefix+'-region-color option")].filter(o=>o.value.startsWith("gdp")).map(o=>o.value)'),['gdp','gdpPerCapita']);
  for(const key of ['gdp','gdpPerCapita']){
   await page.evaluate('(()=>{const select=document.getElementById('+JSON.stringify(prefix+'-region-color')+');select.value='+JSON.stringify(key)+';select.dispatchEvent(new Event("change",{bubbles:true}));})()');
   await page.settle();
   assert.equal(await page.evaluate('AtlasRegionColorController.getMetric()'),key);
   assert.equal(await page.evaluate('mapScene.assertOrder()'),true);
  }
  await page.send('Page.reload');await page.settle();
  await page.waitFor('AtlasRegionColorController.getMetric()==="gdpPerCapita"',{label:'saved GDP coloring'});
 }})),
 {name:'municipal cards avoid borrowing a parent’s GDP',options:{width:1280,height:900},async run(page,base){
  await page.open(base,'#germany');await searchAndSelect(page,'Munich','Munich','Municipality');
  await page.waitFor('!!document.querySelector("#germany-sidebar .region-statistics[data-region]")');
  assert.equal(await page.evaluate('!!document.querySelector("#germany-sidebar .statistics-economy")'),false);
 }}
 ,{name:'methodology coverage includes every new GDP map',options:{width:1280,height:900},async run(page,base){
  await page.send('Page.navigate',{url:base+'/data/statistics-methodology.html'});
  await page.waitFor('!!globalThis.AtlasCountries&&document.querySelectorAll("#coverage tr").length===AtlasCountries.ids.length',{label:'automatic country coverage table'});
  const rows=await page.evaluate('Object.fromEntries([...document.querySelectorAll("#coverage tr")].map(r=>{const c=[...r.cells].map(c=>c.textContent);return [c[0],c.slice(1)]}))');
  for(const [name,count,gdpCount=count]of [['Germany',16],['Belgium',3],['Netherlands',12],['Switzerland',26],['United States',65,51],['Canada',13],['Mexico',32]]){
   assert.equal(+rows[name][0],count);assert.equal(+rows[name][3],gdpCount);assert.equal(+rows[name][4],gdpCount);
  }
  assert((await page.evaluate('document.body.textContent')).includes('same-year July 1 population'));
 }}

];

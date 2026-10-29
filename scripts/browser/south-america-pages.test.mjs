import assert from 'node:assert/strict';

const sidebar='[...document.querySelectorAll("aside.sidebar")].find(e=>!e.hidden&&getComputedStyle(e).display!=="none")';
async function heading(page){return page.evaluate(`(()=>{const s=${sidebar},h=s.querySelector('.country-selection-heading'),top=h.querySelector('.selection-top'),title=h.querySelector('h2'),kind=h.querySelector('.eyebrow'),flags=h.querySelector('.division-flags'),local=h.querySelector('.country-local'),r=h.getBoundingClientRect(),t=title.getBoundingClientRect(),k=kind.getBoundingClientRect(),f=flags.getBoundingClientRect(),scroll=s.querySelector('.sidebar-scroll');return {name:title.textContent,kind:kind.textContent,titleTop:t.top-r.top,kindTop:k.top-r.top,titleMargin:getComputedStyle(title).marginTop,navGap:getComputedStyle(top).marginBottom,scrollPadding:getComputedStyle(scroll).paddingTop,titleRight:t.right,flagsLeft:f.left,flagsTop:f.top-r.top,flagsPosition:getComputedStyle(flags).position,titleSize:getComputedStyle(title).fontSize,localHidden:local.hidden,localLang:local.lang,flagCount:[...flags.querySelectorAll('img')].filter(i=>i.getClientRects().length).length,flags:[...flags.querySelectorAll('img')].filter(i=>i.getClientRects().length).map(i=>({radius:getComputedStyle(i).borderRadius,maxHeight:getComputedStyle(i).maxHeight})),overflow:document.documentElement.scrollWidth>innerWidth};})()`);}

export default [1280,390].map(width=>({name:'South America shares compact headings and flag styling '+width,options:{width,height:900,mobile:width===390},async run(page,base){
 await page.open(base,'#united-states');await page.evaluate('currentAtlas().restore("US-OH")');await page.settle();
 const reference=await heading(page);assert.equal(reference.name,'Ohio');assert.equal(reference.flagCount,2);
 for(const [country,id,name,kind,count,lang]of [['brazil','BR-17','Tocantins','STATE',2,'pt'],['uruguay','UY-FD','Florida','DEPARTMENT',1,'es'],['argentina','AR-06','Buenos Aires','PROVINCE',2,'es']]){
  await page.open(base,'#'+country);assert.equal(await page.evaluate('document.getElementById("south-layers-panel").hidden'),false,'Entry keeps Map settings');
  await page.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await page.settle();
  await page.waitFor('(()=>{const f=document.getElementById("south-province-flag");return '+count+'===1||f.complete&&f.naturalWidth>0&&!f.closest("a").hidden})()');
  const actual=await heading(page);assert.equal(actual.name,name);assert.equal(actual.kind,kind);assert.equal(actual.flagCount,count);assert.equal(actual.localHidden,true);assert.equal(actual.localLang,lang);assert.equal(actual.overflow,false);
  for(const property of ['titleTop','kindTop','titleMargin','navGap','scrollPadding','flagsTop','flagsPosition','titleSize'])assert.equal(actual[property],reference[property],country+' shares '+property);
  assert(actual.titleRight<=actual.flagsLeft-15,country+' title leaves space for flags');
  for(const flag of actual.flags)assert.deepEqual(flag,reference.flags[0],country+' uses shared flag frame');
  await page.waitFor('document.querySelector("#south-explore-panel .region-statistics")?.dataset.region==='+JSON.stringify(country+':'+id));
  await page.screenshot('shared-heading-'+country+'-'+width);
  await page.evaluate('document.documentElement.style.setProperty("--place-heading-size","48px")');assert.equal((await heading(page)).titleSize,'48px');
  assert(await page.evaluate('(()=>{const h=document.querySelector("#south-explore-panel h2");return h.scrollWidth<=h.clientWidth})()'),'Large headings wrap');
  await page.evaluate('document.documentElement.style.removeProperty("--place-heading-size")');
  await page.evaluate('currentAtlas().home()');assert.equal(await page.evaluate('document.getElementById("south-layers-panel").hidden'),false,'Reset returns to Map settings');assert.equal(await page.evaluate('document.getElementById("south-tab-explore").hidden'),true,'No country overview tab');
 }
}}));

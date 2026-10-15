import assert from 'node:assert/strict';

const menuOpen=`!document.getElementById('country-menu').hidden`;
const focused='document.activeElement.dataset.atlas';

// The header's country name opens a menu of every country the visitor can open, each written as
// its own header writes it; choosing one opens that country.
export default [[1280,820,false],[390,844,true]].map(([width,height,mobile])=>({name:'the country name opens a menu of countries'+(mobile?' on a phone':''),options:{width,height,mobile},async run(page,base){
 await page.open(base,'#japan');
 await page.tap('#country-switch');
 await page.waitFor(menuOpen,{label:'the country menu'});
 const options=JSON.parse(await page.evaluate(`JSON.stringify([...document.querySelectorAll('.country-option')].map(o=>[o.dataset.atlas,o.textContent,o.getAttribute('aria-current')]))`));
 assert.deepEqual(options.map(o=>o[0]),await page.evaluate('AtlasCountries.ids.filter(id=>AtlasDev.allows(id))'),'Every country the visitor can open is listed');
 for(const [id,text] of options){const c=await page.evaluate('AtlasCountries.countries['+JSON.stringify(id)+']');assert(text.includes(c.en)&&text.includes(c.local||''),id+' keeps its English and local names');}
 assert.deepEqual(options.filter(o=>o[2]==='true').map(o=>o[0]),['japan'],'The open country is marked');
 assert.equal(await page.evaluate(focused),'japan','The open country takes focus');
 if(!mobile){
  await page.key('ArrowDown');
  assert.equal(await page.evaluate(focused),options[options.findIndex(o=>o[0]==='japan')+1][0],'Arrow keys move through the countries');
  await page.key('Escape');
  assert(await page.evaluate(`document.getElementById('country-menu').hidden&&document.activeElement.id==='country-switch'`),'Escape closes the menu and returns focus');
  await page.tap('#country-switch');await page.waitFor(menuOpen);
 }
 await page.tap('.country-option[data-atlas=korea]');await page.settle();
 assert.equal(await page.evaluate('AtlasEntry.current'),'korea','Choosing Korea opens Korea');
 assert(await page.evaluate(`document.getElementById('country-menu').hidden&&document.getElementById('atlas-title-english').textContent==='Korea'`),'The menu closes and the header names Korea');
}}));

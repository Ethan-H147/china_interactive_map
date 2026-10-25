import assert from 'node:assert/strict';

const menuOpen=`!document.getElementById('country-menu').hidden`;
const focused='document.activeElement.dataset.atlas';

// The header's country name opens a menu of every country the visitor can open, each written as
// its own header writes it; choosing one opens that country.
export default [[1280,820,false],[1024,768,true],[820,1180,true],[390,844,true],[320,740,true]].map(([width,height,mobile])=>({name:'the country name opens a menu of countries'+(' at '+width+'×'+height),options:{width,height,mobile},async run(page,base){
 await page.open(base,'#japan');
 await page.tap('#country-switch');
 await page.waitFor(menuOpen,{label:'the country menu'});
 const options=JSON.parse(await page.evaluate(`JSON.stringify([...document.querySelectorAll('.country-option')].map(o=>[o.dataset.atlas,o.textContent,o.getAttribute('aria-current')]))`));
 assert.deepEqual(options.map(o=>o[0]).sort(),(await page.evaluate('AtlasCountries.ids.filter(id=>!AtlasCountries.countries[id].parent&&AtlasDev.allows(id))')).sort(),'Every top-level country the visitor can open is listed');
 for(const [id,text] of options){const c=await page.evaluate('AtlasCountries.countries['+JSON.stringify(id)+']');assert(text.includes(c.en)&&text.includes(c.local||''),id+' keeps its English and local names');}

 const groups=await page.evaluate("[...document.querySelectorAll('.country-group')].map(g=>({name:g.querySelector('.country-group-heading').textContent,role:g.getAttribute('role'),label:g.getAttribute('aria-labelledby'),heading:g.firstElementChild.id,countries:[...g.querySelectorAll('.country-option')].map(o=>({id:o.dataset.atlas,en:AtlasCountries.countries[o.dataset.atlas].en,continent:AtlasCountries.countries[o.dataset.atlas].continent}))}))");
 assert.deepEqual(groups.map(g=>g.name),['Africa','Asia','Europe','North America','Oceania','South America']);
 for(const group of groups){
  assert.equal(group.role,'group');assert.equal(group.label,group.heading);
  assert(group.countries.every(c=>c.continent===group.name),'Countries belong to the labelled continent');
  const names=group.countries.map(c=>c.en);assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'en')),'Country names are alphabetical');
 }
 const layout=await page.evaluate("[...document.querySelectorAll('.country-option')].map(o=>{const t=o.querySelector('.title-english'),r=o.getBoundingClientRect();return {id:o.dataset.atlas,size:parseFloat(getComputedStyle(t).fontSize),height:r.height,overflow:o.scrollWidth>o.clientWidth+1||[...o.querySelectorAll('.country-option-title, .country-option-title>span')].some(e=>e.scrollWidth>e.clientWidth+1)};})");
 for(const item of layout){assert(item.size>=(width<=760?14:16)&&item.size<=18,item.id+' has a readable menu font');assert(item.height>=44,item.id+' has a touch target');assert(!item.overflow,item.id+' text fits without clipping');}
 if(width<=760)assert(await page.evaluate("[...document.querySelectorAll('.country-group-options')].every(g=>getComputedStyle(g).gridTemplateColumns.split(' ').length===3)"),'Phone menus show three countries per row');
 assert(await page.evaluate('(()=>{const r=document.getElementById("country-menu").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;})()'),'Menu stays within the viewport');
 await page.screenshot('country-menu-'+width+'x'+height);
 const stripes=await page.evaluate("[...document.querySelectorAll('.country-option')].map(e=>({country:e.dataset.atlas,image:getComputedStyle(e).backgroundImage}))");
 for(const stripe of stripes)assert(stripe.image.includes('linear-gradient('),stripe.country+' has a valid stripe image');
 assert.deepEqual(options.filter(o=>o[2]==='true').map(o=>o[0]),['japan'],'The open country is marked');
 assert.equal(await page.evaluate(focused),'japan','The open country takes focus');
 {
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

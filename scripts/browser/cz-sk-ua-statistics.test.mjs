import assert from 'node:assert/strict';
const cases=[['czechia','cz','CZ-R-19','CZ-M-582786',2025,2024],['slovakia','sk','SK-R-1','SK-M-500011',2024,2024],['ukraine','ua','UA-80',null,2022,2021]];
export default [...cases.map(c=>({c,width:1280})),{c:cases[1],width:390}].map(({c:[country,prefix,top,local,popYear,gdpYear],width})=>({name:country+' population, GDP cards and economic shading '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#'+country);
 await p.evaluate('currentAtlas().restore('+JSON.stringify(top)+').then(()=>true)');await p.settle();
 await p.waitFor('document.getElementById("'+prefix+'-statistics").parentElement.textContent.includes("GDP")');
 const card=await p.evaluate('document.getElementById("'+prefix+'-statistics").parentElement.textContent');assert(card.includes(String(popYear)));assert(card.includes(String(gdpYear)));assert(card.includes('Population'));assert(card.includes('GDP per capita'));
 await p.screenshot('statistics-'+country+'-'+width);
 if(local){await p.evaluate('currentAtlas().restore('+JSON.stringify(local)+').then(()=>true)');await p.settle();await p.waitFor('document.getElementById("'+prefix+'-statistics").parentElement.textContent.includes("Population")');const child=await p.evaluate('document.getElementById("'+prefix+'-statistics").parentElement.textContent');assert(child.includes(String(popYear)));assert(!child.includes('GDP per capita'),'No invented municipal GDP');}
 await p.evaluate('currentAtlas().home().then(()=>true)');await p.settle();
 for(const metric of ['population','populationDensity','gdp','gdpPerCapita']){
  assert(await p.evaluate('[...document.querySelector("[data-region-color]").options].some(o=>o.value==="'+metric+'")'),'Available '+metric);
  await p.evaluate('(()=>{const s=document.querySelector("[data-region-color]");s.value="'+metric+'";s.dispatchEvent(new Event("change",{bubbles:true}));})()');await p.settle();
  assert.equal(await p.evaluate('document.querySelector("[data-region-color]").value'),metric);
 }
 assert(await p.evaluate('JSON.stringify(map.getPaintProperty("'+country+'-first-fill","fill-color")).includes("'+top+'")'),'Economic shading reaches map geometry');
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));await p.screenshot('statistics-shading-'+country+'-'+width);
}}));

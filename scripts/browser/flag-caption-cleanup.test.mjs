import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const cases=[['mexico','MX-COA'],['spain','ES-A-09'],['belgium','BE32'],['netherlands','NL_GM1942'],['australia','AU-CXR'],['soviet-union-1988','SU-RU'],['botswana',null,'Gaborone'],['namibia',null,'Windhoek'],['south-africa',null,'Pretoria']];
export default [{name:'flag provenance never becomes a place-card subtitle across affected countries',options:{width:1280,height:900,developer:true},async run(p,base){
 await p.open(base,'#mexico');
 for(const [country,id,query]of cases){
  assert(await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)'));await p.settle();
  if(id)await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+').then(()=>true)');else await searchAndSelect(p,query,query);
  await p.settle();
  await p.evaluate('(()=>{const sidebar=[...document.querySelectorAll("aside.sidebar")].find(e=>!e.hidden),option=sidebar.querySelector("[id$=optional-flags]");if(option){option.checked=true;option.dispatchEvent(new Event("change"));}})()');
  assert.equal(await p.evaluate('document.querySelectorAll(".flag-caption,[id$=flag-caption]").length'),0,country+' has no flag metadata subtitle node');
  const visible=await p.evaluate('[...document.querySelectorAll("aside.sidebar:not([hidden]) .division-flags img")].filter(i=>i.getClientRects().length).map(i=>i.getAttribute("src"))');assert(visible.length>=1,country+' keeps its flags');
  if(country==='mexico'){assert(visible.some(src=>src.includes('MX-COA')));assert.equal(await p.evaluate('document.querySelector("#mexico-sidebar .country-selection-heading").innerText.includes("Statutory coat-of-arms flag")'),false);await p.screenshot('coahuila-no-flag-caption');}
  if(country==='spain')await p.screenshot('spain-no-flag-caption');
 }
}}];

import assert from 'node:assert/strict';
import fs from 'node:fs';
const records=JSON.parse(fs.readFileSync('dist/data/antarctica/facilities.json')).records;
async function select(p,id){await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+',"antarctic-globe-v2")');await p.settle();await p.waitFor('[...document.querySelectorAll("#aq-flags img")].every(i=>i.complete&&i.naturalWidth>0)');}
const flags=p=>p.evaluate('[...document.querySelectorAll("#aq-flags img")].map(i=>({name:i.alt,level:i.dataset.flagLevel,file:i.getAttribute("src")}))');
export default [1280,390].map(width=>({name:'Station flag hierarchy, joint operators, local enlargement and compact heading '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#antarctica');await select(p,'AQ-COMNAP-1');
 assert.deepEqual((await flags(p)).map(f=>[f.level,f.name]),[['national','Flag of United States'],['station','Flag of McMurdo']]);
 const top=await p.evaluate('({title:document.getElementById("aq-name").getBoundingClientRect().top,back:document.getElementById("aq-reset").getBoundingClientRect().top})');
 await p.evaluate('window.stationFlagLink=document.querySelector("#aq-flags a");stationFlagLink.remove()');
 const single=await p.evaluate('({title:document.getElementById("aq-name").getBoundingClientRect().top,back:document.getElementById("aq-reset").getBoundingClientRect().top})');assert.deepEqual(single,top,'A station flag never pushes the title or All Antarctica down');
 await p.evaluate('document.getElementById("aq-flags").append(stationFlagLink)');
 await p.screenshot('antarctica-mcmurdo-flags-'+width);
 await p.tap('#aq-flags [data-flag-level="station"]');await p.waitFor('document.querySelector("#flag-viewer").open&&document.querySelector("#flag-viewer-image").getAttribute("src")==="vendor/antarctic-flags/AQ-COMNAP-1.svg"');
 assert((await p.evaluate('document.querySelector("#flag-viewer-credit").textContent')).includes('Public domain'));await p.tap('.flag-viewer-close');
 await select(p,records.find(r=>r.en==='Concordia').id);assert.deepEqual((await flags(p)).map(f=>f.name),['Flag of Italy','Flag of France'],'Joint operators retain both national flags');
 await select(p,records.find(r=>r.en==='Great Wall').id);assert.deepEqual((await flags(p)).map(f=>f.name),['Flag of China'],'A repeated COMNAP operator produces one national flag');
 await select(p,records.find(r=>r.operators.includes('Republic of Belarus')).id);assert.equal((await flags(p))[0].name,'Flag of Belarus');
 await select(p,'AQ-COMNAP-82');assert.deepEqual((await flags(p)).map(f=>f.level),['national','station']);
 const size=await p.evaluate('(()=>{const b=document.querySelector("#aq-flags [data-flag-level=station]").getBoundingClientRect();return [b.width,b.height]})()');assert(Math.abs(size[0]/size[1]-2/3)<.02,'The vertical station flag keeps its original shape');
 await p.screenshot('antarctica-gabriel-flags-'+width);
 await select(p,'AQ-COMNAP-3');assert.deepEqual((await flags(p)).map(f=>f.name),['Flag of United States','Flag of Palmer']);
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
}}));

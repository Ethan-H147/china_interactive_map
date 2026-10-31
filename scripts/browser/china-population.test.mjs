import assert from 'node:assert/strict';
import fs from 'node:fs';
import {searchAndSelect} from './countries.test.mjs';
const data=JSON.parse(fs.readFileSync('dist/data/region-population.json')).regions;
const snapshot=`(()=>{const c=document.getElementById('population-metrics');return {measure:c.dataset.measure,rows:[...c.querySelectorAll('button')].filter(b=>!b.hidden).map(b=>({key:b.dataset.populationMeasure,primary:b.classList.contains('is-primary'),text:b.querySelector('.population-metric-value').textContent,y:b.getBoundingClientRect().y})),animations:c.getAnimations({subtree:true}).length}})()`;
async function verify(p,id,key){const v=await p.evaluate(snapshot),r=data[id];assert.equal(v.measure,key);assert.equal(v.rows[0].key,key);assert(v.rows[0].primary);assert.equal(v.rows[0].text,r[key]==null?'Not reported':r[key].toLocaleString('en-US'));const other=v.rows.slice(1);assert(other[0].y<other[1].y);assert((r[other[0].key]??-Infinity)>=(r[other[1].key]??-Infinity));}
const scenarios=[false,true].map(mobile=>({name:'China population measure moves between prefectures, sorts secondary figures and persists '+(mobile?'phone':'desktop'),options:{width:mobile?390:1280,height:900,mobile},async run(p,base){
 await p.open(base,'#china');await searchAndSelect(p,'Suzhou','Suzhou','Prefecture');await p.evaluate("document.getElementById('population').scrollIntoView({block:'center'})");
 await verify(p,'320500','total');await p.tap('[data-population-measure="towns"]');await verify(p,'320500','towns');await p.waitFor("document.getElementById('population-metrics').getAnimations({subtree:true}).length===0");
 await searchAndSelect(p,'Nanjing','Nanjing','Prefecture');await verify(p,'320100','towns');
 await p.evaluate(`document.querySelector('[data-population-measure="urbanCore"]').click()`);assert((await p.evaluate(snapshot)).animations>0,'The figures move and scale');
 // Reverse while text is still travelling; the next motion starts at the current visual position.
 const continuous=await p.evaluate(`(()=>{const v=document.getElementById('population-core'),a=v.getBoundingClientRect();document.querySelector('[data-population-measure="total"]').click();const b=v.getBoundingClientRect();return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)})()`);assert(continuous<4,'Interrupted motion stays continuous');
 await p.waitFor("document.getElementById('population-metrics').getAnimations({subtree:true}).length===0");await verify(p,'320100','total');
 await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await p.evaluate(`document.querySelector('[data-population-measure="urbanCore"]').click()`);await verify(p,'320100','urbanCore');assert.equal((await p.evaluate(snapshot)).animations,0);
 await searchAndSelect(p,'Dezhou','Dezhou','Prefecture');await verify(p,'371400','urbanCore');assert.equal((await p.evaluate(snapshot)).rows[1].key,'total','Secondary sorting uses the corrected total');assert.equal(await p.evaluate("document.getElementById('population-quality').hidden"),true);
 await searchAndSelect(p,'Jiangsu','Jiangsu','Province');assert.equal((await p.evaluate(snapshot)).rows.length,1,'Province keeps its own dated total');
 await searchAndSelect(p,'Suzhou','Suzhou','Prefecture');await verify(p,'320500','urbanCore');await p.evaluate("document.getElementById('population').scrollIntoView({block:'center'})");assert(await p.evaluate("document.documentElement.scrollWidth<=innerWidth"));await p.screenshot('china-population-urban-core-'+(mobile?'phone':'desktop'));
 await p.send('Page.reload');await p.settle();await searchAndSelect(p,'Nanjing','Nanjing','Prefecture');await verify(p,'320100','urbanCore');
}}));


scenarios.push({name:'Missing urban-core population stays explicit and measure buttons work with keyboard',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#china');await searchAndSelect(p,'Sansha','Sansha');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await p.evaluate('document.querySelector("[data-population-measure=urbanCore]").click()');await verify(p,'460300','urbanCore');
 await p.evaluate('document.querySelector("[data-population-measure=towns]").focus()');await p.key('Enter');await verify(p,'460300','towns');assert.equal(await p.evaluate('document.activeElement.dataset.populationMeasure'),'towns');
}});
scenarios.push({name:'Shuozhou corrected urban-core figure and census attribution appear in the website',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#china');await searchAndSelect(p,'Shuozhou','Shuozhou');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await p.evaluate('document.querySelector("[data-population-measure=urbanCore]").click()');await verify(p,'140600','urbanCore');assert.equal(await p.evaluate('document.getElementById("population-core").textContent'),'417,807');assert.equal(await p.evaluate('document.getElementById("population-total").textContent'),'1,593,444');assert.equal(await p.evaluate('document.getElementById("population-towns").textContent'),'985,435');assert.equal(await p.evaluate('document.getElementById("population-source").textContent'),'2020 census: Table 1');assert((await p.evaluate('document.getElementById("population-source").href')).includes('stats.gov.cn'));await p.evaluate('document.getElementById("population").scrollIntoView({block:"center"})');await p.screenshot('shuozhou-corrected-population');
}});
scenarios.push({name:'Reviewed Wikipedia edits appear for Meizhou Zhanjiang and Baotou',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#china');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");
 for(const [name,id]of [['Meizhou','441400'],['Zhanjiang','440800'],['Baotou','150200']]){await searchAndSelect(p,name,name,'Prefecture');await p.evaluate('document.querySelector("[data-population-measure=urbanCore]").click()');await verify(p,id,'urbanCore');assert.equal(await p.evaluate('document.getElementById("population-towns").textContent'),data[id].towns.toLocaleString('en-US'));assert((await p.evaluate('document.getElementById("population-source").href')).endsWith('oldid=95346898'));}
}});
scenarios.push({name:'Corrected totals clear population warnings for Dezhou Dingxi Karamay and Wuzhong',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#china');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");
 for(const [name,id,total] of [['Dezhou','371400','5,611,194'],['Dingxi','621100','2,524,097'],['Karamay','650200','490,348'],['Wuzhong','640300','1,382,713']]){await searchAndSelect(p,name,name,'Prefecture');await p.evaluate('document.querySelector("[data-population-measure=total]").click()');await verify(p,id,'total');assert.equal(await p.evaluate('document.getElementById("population-total").textContent'),total);assert.equal(await p.evaluate('document.getElementById("population-quality").hidden'),true);assert((await p.evaluate('document.getElementById("population-source").href')).endsWith('oldid=95347066'));}
}});
export default scenarios;

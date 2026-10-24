import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const visibleSidebar='[...document.querySelectorAll("aside.sidebar")].find(e=>!e.hidden&&getComputedStyle(e).display!=="none")';
export default [1280,390].map(width=>({name:'All Mexican municipalities, boroughs, lazy state loading and saved selection '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#mexico');assert(!p.requests.some(u=>u.includes('/mexico/second/')),'No country-wide municipal download');
 await searchAndSelect(p,'Guadalajara','Guadalajara','Municipality');await p.settle();
 assert.equal(await p.evaluate('currentAtlas().getSelection()'),'MX-MUN-14039');assert.equal(await p.evaluate('currentAtlas().getMode()'),2);
 const loaded=await p.evaluate('fetch(map.getStyle().sources["mexico-second"].data).then(r=>r.json()).then(d=>({count:new Set(d.features.map(f=>f.properties.id)).size,jalisco:d.features.every(f=>f.properties.id.startsWith("MX-MUN-14"))}))');assert.deepEqual(loaded,{count:125,jalisco:true},'Only the selected state municipal chunk is installed');
 assert(await p.evaluate(visibleSidebar+'.innerText.includes("Population")'));assert(await p.evaluate('map.queryRenderedFeatures({layers:["mexico-second-selected"]}).length>0'),'Municipal selected outline renders');
 await p.screenshot('mexico-guadalajara-municipality-'+width);
 await p.send('Page.reload');await p.settle();await p.waitFor('currentAtlas().getSelection()==="MX-MUN-14039"');assert.equal(await p.evaluate('currentAtlas().getMode()'),2);
 await searchAndSelect(p,'Cuauhtemoc Mexico City','Cuauhtémoc','Borough');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'MX-MUN-09015');assert.equal(await p.evaluate('document.getElementById("mx-province").value'),'MX-CMX');
 assert(await p.evaluate('map.queryRenderedFeatures({layers:["mexico-second-lines"]}).length>0'),'Mexico City borough edges render');await p.screenshot('mexico-city-boroughs-'+width);
 await searchAndSelect(p,'Santa Maria del Tule','Santa María del Tule','Municipality');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'MX-MUN-20409');assert(await p.evaluate('map.queryRenderedFeatures({layers:["mexico-second-selected"]}).length>0'),'A small Oaxaca municipality remains selectable');await p.screenshot('mexico-oaxaca-municipality-'+width);
 await searchAndSelect(p,'Villa de Pozos','Villa de Pozos','Municipality');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'MX-MUN-24059');assert(!await p.evaluate('!document.getElementById("mx-statistics").hidden&&document.getElementById("mx-statistics").innerText.includes("Population")'),'New municipality has no invented zero population');
 await searchAndSelect(p,'Cancun','Benito Juárez','Municipality');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'MX-MUN-23005','Municipal-seat alias finds Cancún');
 assert(await p.evaluate('mapScene.assertOrder()'));assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'No horizontal overflow');
 await p.evaluate('location.hash="#canada"');await p.settle();assert.equal(await p.evaluate('!!map.getSource("mexico-second")'),false,'Leaving removes the municipality source');
}}));

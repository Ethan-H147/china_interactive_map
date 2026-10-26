import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
export default [1280,390].map(width=>({name:'One London dot opens Greater London and City of London together '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#united-kingdom');
 const data=await p.evaluate("fetch('data/europe/united-kingdom/settlements.json').then(r=>r.json())");
 assert.equal(data.records.filter(r=>r.provinceId==='GB-R-TLI').length,1);
 await p.evaluate('map.jumpTo({center:[-.09213,51.51484],zoom:10});void 0');await p.settle();
 const dot=await p.evaluate('(()=>{const q=map.project([-.09213,51.51484]),r=map.getCanvas().getBoundingClientRect();return[r.x+q.x,r.y+q.y]})()');
 await p.tap(dot);await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'GB-S-LONDON','Clicking the single city dot opens the combined overview');
 assert.equal(await p.evaluate('document.getElementById("breadcrumb-region").textContent.trim()'),'London','The overview does not repeat London in its breadcrumb');
 assert.equal(await p.evaluate('currentAtlas().getMode()'),2);
 const overview=await p.evaluate('(()=>{const e=document.getElementById("gb-place-overview");return{hidden:e.hidden,titles:[...e.querySelectorAll("h3")].map(n=>n.textContent),text:e.textContent,metrics:[...e.querySelectorAll("[data-metric]")].map(n=>n.textContent),sources:[...e.querySelectorAll("a")].map(n=>n.href)}})()');
 assert(!overview.hidden);assert.deepEqual(overview.titles,['Greater London','City of London']);
 for(const phrase of ['32 London boroughs','Square Mile','9,089,736','15,111','1,571.96 km²','2.89 km²','2024'])assert(overview.text.includes(phrase),phrase+' is clearly distinguished');
 assert(overview.sources.some(u=>u.includes('cityoflondon.gov.uk')));assert(overview.sources.some(u=>u.includes('ons.gov.uk')));
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'No horizontal overflow');
 await p.screenshot('london-overview-'+width);
 if(width===390){await p.evaluate('document.querySelector("#gb-place-overview .place-overview-card:last-child").scrollIntoView({block:"center"});void 0');assert(await p.evaluate('document.querySelector("#gb-place-overview .place-overview-card:last-child").getBoundingClientRect().top<innerHeight'),'Both sections are readable in the phone sheet');await p.screenshot('london-overview-city-phone');}
 const saved=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,saved);assert.equal(await p.evaluate('currentAtlas().getSelection()'),'GB-S-LONDON');assert(!await p.evaluate('document.getElementById("gb-place-overview").hidden'));
 if(width===1280){await p.tap('#united-kingdom-sidebar .details-expand');await p.screenshot('london-overview-expanded');}
 await p.evaluate('currentAtlas().restore("GB-S-E63004906")');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'GB-C-E09000001','The former City dot link opens the City administrative page');assert(await p.evaluate('document.getElementById("gb-place-overview").hidden'));
 await searchAndSelect(p,'Croydon','Croydon');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'GB-C-E09000008');
 await searchAndSelect(p,'London overview','London','City');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'GB-S-LONDON');
 await p.tap('#home');await p.settle();assert(await p.evaluate('document.getElementById("gb-place-overview").hidden'),'Reset clears the combined page');
 await p.evaluate("changeAtlas('ireland',false)");await p.settle();await p.evaluate("changeAtlas('united-kingdom',false)");await p.settle();await searchAndSelect(p,'London overview','London','City');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'GB-S-LONDON');
}}));
